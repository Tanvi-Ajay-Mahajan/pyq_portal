/**
 * Temporary verification: exercises `node scripts/import.js <file>` (the command
 * documented for migrating a Supabase export) against a real MongoDB,
 * using both a JSON export and a CSV export. Deleted after running.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { MongoMemoryServer } from 'mongodb-memory-server';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const mongo = await MongoMemoryServer.create();
const uri = mongo.getUri();

const runImport = (file) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, ['scripts/import.js', file], {
      env: { ...process.env, MONGODB_URI: uri },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      out += d;
    });
    child.on('close', (code) => resolve({ code, out: out.trim() }));
  });

const jsonPath = 'tmp-export.json';
const csvPath = 'tmp-export.csv';

// A Supabase-style export: wrapped in a table key, mixed snake_case/camelCase,
// plus one row that must be rejected for having no Drive link.
await fs.writeFile(
  jsonPath,
  JSON.stringify({
    papers: [
      {
        year_level: 'SE',
        pattern: '2019',
        branch: 'Computer',
        subject_name: 'Data Structures',
        drive_link: 'https://drive.google.com/drive/folders/JSON_KEEP_ID',
        category: 'PYQ',
        semester: 3,
        exam_year: 2023,
      },
      {
        yearLevel: 'TE',
        pattern: '2024',
        branch: 'IT',
        subjectName: 'Operating Systems',
        driveLink: 'https://drive.google.com/drive/folders/CAMEL_KEEP_ID',
        category: 'Notes',
      },
      { year_level: 'BE', pattern: '2015', branch: 'Civil', subject_name: 'No link row' },
    ],
  }),
  'utf8'
);

// CSV with a quoted comma and an embedded newline, plus an incomplete row.
await fs.writeFile(
  csvPath,
  [
    'year_level,pattern,branch,subject_name,drive_link,category',
    'FE,2024,ALL,"Engineering, First Year",https://drive.google.com/drive/folders/CSV_COMMA_ID,Syllabus',
    'SE,2019,ENTC,"Line one\nLine two",https://drive.google.com/drive/folders/CSV_NEWLINE_ID,PYQ',
    'SE,2019,Civil,,,PYQ',
  ].join('\n'),
  'utf8'
);

const jsonRun = await runImport(jsonPath);
check('import: JSON export runs from the CLI', jsonRun.code === 0, jsonRun.out.split('\n')[0]);
check(
  'import: JSON rows are inserted and the bad row is skipped',
  /Imported 2 new records, updated 0, skipped 1/.test(jsonRun.out),
  jsonRun.out.split('\n')[0]
);

const jsonAgain = await runImport(jsonPath);
check(
  'import: re-running the same JSON does not duplicate records',
  /Imported 0 new records, updated 2, skipped 1/.test(jsonAgain.out),
  jsonAgain.out.split('\n')[0]
);

const csvRun = await runImport(csvPath);
check(
  'import: CSV export runs from the CLI',
  csvRun.code === 0 && /Imported 2 new records, updated 0, skipped 1/.test(csvRun.out),
  csvRun.out.split('\n')[0]
);

process.env.MONGODB_URI = uri;
const { connectDB, disconnectDB } = await import('./config/db.js');
const { default: Paper } = await import('./models/Paper.js');
const { default: DriveFolder } = await import('./models/DriveFolder.js');
await connectDB();

const total = await Paper.countDocuments();
check('import: stores exactly the four valid records', total === 4, `papers=${total}`);

const snake = await Paper.findOne({ drive_link: 'https://drive.google.com/drive/folders/JSON_KEEP_ID' }).lean();
check(
  'import: preserves year, pattern, branch, subject and Drive link verbatim',
  snake?.year_level === 'SE' &&
    snake?.pattern === '2019' &&
    snake?.branch === 'Computer' &&
    snake?.subject_name === 'Data Structures' &&
    snake?.drive_link === 'https://drive.google.com/drive/folders/JSON_KEEP_ID',
  `${snake?.year_level}/${snake?.pattern}/${snake?.branch}/${snake?.subject_name}`
);
check(
  'import: keeps numeric semester and exam year',
  snake?.semester === 3 && snake?.exam_year === 2023,
  `semester=${snake?.semester} exam_year=${snake?.exam_year}`
);

const camel = await Paper.findOne({ drive_link: 'https://drive.google.com/drive/folders/CAMEL_KEEP_ID' }).lean();
check(
  'import: accepts camelCase columns from a camelCase export',
  camel?.year_level === 'TE' && camel?.subject_name === 'Operating Systems' && camel?.category === 'NOTES',
  `${camel?.year_level}/${camel?.subject_name}/${camel?.category}`
);

const commaRow = await Paper.findOne({ drive_link: 'https://drive.google.com/drive/folders/CSV_COMMA_ID' }).lean();
check(
  'import: CSV quoted comma survives intact',
  commaRow?.subject_name === 'Engineering, First Year',
  JSON.stringify(commaRow?.subject_name)
);

const newlineRow = await Paper.findOne({
  drive_link: 'https://drive.google.com/drive/folders/CSV_NEWLINE_ID',
}).lean();
check(
  'import: CSV embedded newline survives intact',
  newlineRow?.subject_name === 'Line one\nLine two',
  JSON.stringify(newlineRow?.subject_name)
);

const noLink = await Paper.countDocuments({ branch: 'Civil', subject_name: 'No link row' });
check('import: row without a Drive link is not invented into the database', noLink === 0);

const folders = await DriveFolder.countDocuments();
const branchFolder = await DriveFolder.findOne({ year_level: 'SE', branch: 'Computer' }).lean();
check(
  'import: creates matching Drive folders for branch rows',
  folders >= 2 && branchFolder?.drive_link === 'https://drive.google.com/drive/folders/JSON_KEEP_ID',
  `folders=${folders}`
);

await disconnectDB();
await fs.rm(jsonPath, { force: true });
await fs.rm(csvPath, { force: true });
await mongo.stop();

const passed = results.filter((r) => r.ok).length;
console.log(`\n[import] ${passed}/${results.length} checks passed`);
if (passed !== results.length) process.exitCode = 1;
