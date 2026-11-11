/**
 * Import PYQ records from an exported JSON or CSV file.
 *
 * Use this when the Supabase project cannot be reached directly:
 *   1. Export the tables (pyq_papers, branches, drive folders) from the
 *      Supabase dashboard as JSON or CSV.
 *   2. Run:  cd server && npm run import -- ./data/supabase-export.json
 *
 * Accepted row fields (snake_case or camelCase):
 *   year_level / yearLevel, pattern, branch, subject_name / subjectName,
 *   drive_link / driveLink, category, semester, exam_year / examYear
 *
 * Drive links are copied verbatim — no link is generated or rewritten.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB, isDbConnected } from '../config/db.js';
import Paper from '../models/Paper.js';
import DriveFolder from '../models/DriveFolder.js';
import { normalizeCategory, normalizeYearLevel } from '../utils/constants.js';

const pick = (row, ...keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return undefined;
};

/** Minimal RFC-4180 CSV parser (handles quoted fields and embedded newlines). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  const keys = header.map((key) => key.trim().replace(/^\uFEFF/, ''));
  return body
    .filter((values) => values.some((value) => String(value).trim() !== ''))
    .map((values) =>
      Object.fromEntries(keys.map((key, index) => [key, (values[index] ?? '').trim()]))
    );
}

function normalizeRow(row) {
  const yearLevel = normalizeYearLevel(pick(row, 'year_level', 'yearLevel', 'year'));
  const pattern = String(pick(row, 'pattern', 'scheme', 'scheme_name') ?? '').trim();
  const driveLink = String(pick(row, 'drive_link', 'driveLink', 'drive_url', 'link') ?? '').trim();

  if (!yearLevel || !pattern || !driveLink) return null;

  const semester = Number(pick(row, 'semester', 'semester_number'));
  const examYear = Number(pick(row, 'exam_year', 'examYear'));

  return {
    year_level: yearLevel,
    pattern,
    branch: pick(row, 'branch', 'branch_name', 'branch_code') ?? null,
    subject_name: pick(row, 'subject_name', 'subjectName', 'subject', 'title') ?? null,
    drive_link: driveLink,
    category: normalizeCategory(pick(row, 'category')) || 'PYQ',
    semester: Number.isFinite(semester) && semester >= 1 && semester <= 8 ? semester : null,
    exam_year: Number.isFinite(examYear) && examYear >= 2000 && examYear <= 2100 ? examYear : null,
  };
}

export async function importRecords(records, { log = console.log, createFolders = true } = {}) {
  if (!isDbConnected()) throw new Error('Not connected to MongoDB. Set MONGODB_URI first.');

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const [index, record] of records.entries()) {
    const normalized = normalizeRow(record);
    if (!normalized) {
      skipped += 1;
      errors.push(`Row ${index + 1}: missing year level, pattern or drive link`);
      continue;
    }

    try {
      const result = await Paper.updateOne(
        {
          year_level: normalized.year_level,
          pattern: normalized.pattern,
          branch: normalized.branch,
          subject_name: normalized.subject_name,
          drive_link: normalized.drive_link,
        },
        { $set: normalized },
        { upsert: true, runValidators: true }
      );
      result.upsertedCount ? (imported += 1) : (updated += 1);

      if (createFolders && normalized.branch) {
        await DriveFolder.updateOne(
          {
            year_level: normalized.year_level,
            branch: normalized.branch,
            pattern: normalized.pattern,
          },
          {
            $setOnInsert: {
              year_level: normalized.year_level,
              branch: normalized.branch,
              pattern: normalized.pattern,
              drive_link: normalized.drive_link,
            },
          },
          { upsert: true }
        );
      }
    } catch (error) {
      skipped += 1;
      errors.push(`Row ${index + 1}: ${error.message}`);
    }
  }

  log(`Imported ${imported} new records, updated ${updated}, skipped ${skipped}`);
  if (errors.length > 0) {
    log(`First problems:\n  ${errors.slice(0, 10).join('\n  ')}`);
  }

  return { imported, updated, skipped, errors, total: await Paper.countDocuments() };
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npm run import -- ./data/supabase-export.json');
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  const isCsv = absolutePath.toLowerCase().endsWith('.csv');
  const parsed = isCsv ? parseCsv(raw) : JSON.parse(raw);
  const records = Array.isArray(parsed) ? parsed : parsed.papers || parsed.pyq_papers || [];

  if (records.length === 0) {
    console.error('No records found in the file.');
    process.exit(1);
  }

  const { connected, error } = await connectDB();
  if (!connected) {
    console.error(`Import aborted: ${error?.message || 'MONGODB_URI is not configured'}`);
    process.exit(1);
  }

  try {
    await importRecords(records);
  } catch (importError) {
    console.error('Import failed:', importError.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

export default importRecords;
