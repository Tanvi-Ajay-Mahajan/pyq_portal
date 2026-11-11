/**
 * One-time export helper for the previous Supabase database.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-side only — never
 * expose these to the browser). Writes a JSON file that `npm run import` can
 * consume. Authentication data (auth.users, passwords) is never exported.
 *
 *   cd server
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run export:supabase
 *   npm run import -- ./data/supabase-export.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const TABLES = ['pyq_papers', 'branches', 'schemes', 'academic_years', 'semesters', 'subjects', 'question_papers'];

async function fetchTable(table) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}?select=*`;
  const response = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${table}: HTTP ${response.status} ${body.slice(0, 200)}`);
  }
  return response.json();
}

async function main() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the one-time export.\n' +
        'Without them, export the tables from the Supabase dashboard (JSON or CSV) and run:\n' +
        '  npm run import -- ./data/supabase-export.json'
    );
    process.exit(1);
  }

  const exportData = {};
  for (const table of TABLES) {
    try {
      const rows = await fetchTable(table);
      exportData[table] = rows;
      console.log(`✓ ${table}: ${rows.length} rows`);
    } catch (error) {
      console.warn(`- ${table}: ${error.message}`);
      exportData[table] = [];
    }
  }

  const outputDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'data');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'supabase-export.json');
  await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));

  const papers = exportData.pyq_papers?.length || 0;
  console.log(`\nWrote ${outputPath} (${papers} PYQ records).`);
  console.log('Next: npm run import -- ./scripts/data/supabase-export.json');
}

main().catch((error) => {
  console.error('Export failed:', error.message);
  process.exit(1);
});
