/**
 * Seed script — reproduces the existing portal content in MongoDB.
 *
 * The records below are the real rows from the previous Supabase database
 * (supabase/migrations/20261107074149_*.sql and
 * 20261108043227_create_pyq_papers_with_real_data.sql) plus the four
 * branch-wide Drive folders supplied for AIML, Civil, Computer and Electrical.
 * Drive links are preserved exactly as they were — nothing is invented.
 *
 * Safe to run repeatedly: every write is an upsert on a natural key.
 *
 * Usage:
 *   cd server && npm run seed
 *   MONGODB_URI="mongodb+srv://..." ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=... npm run seed
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB, isDbConnected } from '../config/db.js';
import { env } from '../config/env.js';
import Branch from '../models/Branch.js';
import Scheme from '../models/Scheme.js';
import AcademicYear from '../models/AcademicYear.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import Paper from '../models/Paper.js';
import DriveFolder from '../models/DriveFolder.js';
import User from '../models/User.js';

export const SEMESTERS = [
  { number: 1, label: 'Semester 1' },
  { number: 2, label: 'Semester 2' },
  { number: 3, label: 'Semester 3' },
  { number: 4, label: 'Semester 4' },
  { number: 5, label: 'Semester 5' },
  { number: 6, label: 'Semester 6' },
  { number: 7, label: 'Semester 7' },
  { number: 8, label: 'Semester 8' },
];

export const BRANCHES = [
  { code: 'CMPN', name: 'Computer Engineering' },
  { code: 'INFT', name: 'Information Technology' },
  { code: 'AIML', name: 'Artificial Intelligence & Machine Learning' },
  { code: 'MECH', name: 'Mechanical Engineering' },
  { code: 'ETC', name: 'Electronics & Telecommunication' },
  { code: 'ELEC', name: 'Electrical Engineering' },
  { code: 'CIVL', name: 'Civil Engineering' },
];

export const SCHEMES = [{ name: '2019 Pattern' }, { name: 'A-2019' }, { name: '2023 Pattern' }];

export const ACADEMIC_YEARS = ['2019-2020', '2020-2021', '2021-2022', '2022-2023', '2023-2024'].map(
  (year) => ({ year })
);

/** Computer Engineering subjects, 2019 Pattern. */
export const SUBJECTS = [
  ['Engineering Mathematics I', 'MTH101', 1],
  ['Engineering Physics', 'PHY101', 1],
  ['Basic Electrical Engineering', 'ELE101', 1],
  ['Engineering Mathematics II', 'MTH102', 2],
  ['Engineering Chemistry', 'CHM102', 2],
  ['Programming and Problem Solving', 'CSP102', 2],
  ['Data Structures', 'DS201', 3],
  ['Discrete Mathematics', 'DM201', 3],
  ['Object Oriented Programming', 'OOP201', 3],
  ['Computer Organization and Architecture', 'COA202', 4],
  ['Database Management Systems', 'DBMS202', 4],
  ['Theory of Computation', 'TOC202', 4],
  ['Operating Systems', 'OS301', 5],
  ['Computer Networks', 'CN301', 5],
  ['Software Engineering', 'SE301', 5],
  ['Microprocessor', 'MP302', 6],
  ['Web Technology', 'WT302', 6],
  ['Design and Analysis of Algorithms', 'DAA302', 6],
  ['Artificial Intelligence', 'AI401', 7],
  ['Machine Learning', 'ML401', 7],
  ['Cloud Computing', 'CC401', 7],
  ['Big Data Analytics', 'BDA402', 8],
  ['Cyber Security', 'CS402', 8],
  ['Project Work', 'PRJ402', 8],
].map(([name, code, semester]) => ({ name, code, semester }));

import {
  DEFAULT_BRANCH_FOLDERS,
  DEFAULT_YEAR_FOLDERS,
  DEFAULT_YEAR_DOCUMENTS,
} from '../config/defaultDriveFolders.js';

const G = 'https://drive.google.com/drive/folders';

/** Every existing PYQ record, with its original Drive link. */
export const PAPERS = [
  // ---------- FE 2015 ----------
  ['FE', '2015', null, 'Basic Electronics Engineering', `${G}/12XySY50JOzJzS5nS_S6OPXjN0msBnzYF`],
  ['FE', '2015', null, 'Engineering Graphics & Design', `${G}/1C9HJ1VQfTtlGtUhPlFzT2Z8K6on4Afx_`],
  ['FE', '2015', null, 'Engineering Mechanics', `${G}/1TVIEGLjFGuvkDkWmLz8N-ibHXEJdC0ZW`],
  ['FE', '2015', null, 'Basic Mechanical Engineering', `${G}/17RpbLba1lmpUCpFhtQHtJ1DcaQKR_kPv`],
  ['FE', '2015', null, 'Basic Electrical Engineering', `${G}/1i0cpVG60qeQMzLY8S-732Dnq9wVZ48Jj`],
  ['FE', '2015', null, 'Engineering Physics', `${G}/1C-AD9oms1KnnDz4BGRXpsM9IDzv96zDR`],
  ['FE', '2015', null, 'Engineering Chemistry', `${G}/1c9QsHkVszRTCFD3-1dHNDm7Ja9RhK_dr`],
  ['FE', '2015', null, 'Engineering Mathematics II', `${G}/1poVtOFiM0lOpfsEyeqc7iK_rhG-gA0gr`],
  ['FE', '2015', null, 'Engineering Mathematics I', `${G}/1IAXuGctGEruYx_ISwdgg3WF2RDTihv0L`],

  // ---------- FE 2019 ----------
  ['FE', '2019', null, 'Programming and Problem Solving', `${G}/1ePCcJ8ySJOmGnlAO3w48u8xYRvUum3bH`],
  ['FE', '2019', null, 'Basic Electronics Engineering', `${G}/18wSo0ray2iBkk58g18zQ4B7jzH8zH6bC`],
  ['FE', '2019', null, 'Engineering Graphics & Design', `${G}/1Is1AIcMlQ-8GxMf6LVU1KFETKYPUAl-G`],
  ['FE', '2019', null, 'Engineering Mechanics', `${G}/1O3fh6ozTFQWQx6uxCkP5oU_oXH5h4f_d`],
  ['FE', '2019', null, 'Systems in Mechanical Engineering', `${G}/1D-voK3nBXYQ6h0kne72TyxCZh_4EciqW`],
  ['FE', '2019', null, 'Basic Electrical Engineering', `${G}/1__wzCaISvedG8fMvCtGcOqAnvs5CP4P_`],
  ['FE', '2019', null, 'Engineering Physics', `${G}/1Nbs_h9HXLtLbsf2y37MkiMvWG0MpQTqS`],
  ['FE', '2019', null, 'Engineering Chemistry', `${G}/1ClEjDZLgTLDBezdaW0waRXNP2PX-f7zh`],
  ['FE', '2019', null, 'Engineering Mathematics I', `${G}/10gRCXAh4sTmLTybwgjUX8JkI_uCX81Bb`],
  ['FE', '2019', null, 'Engineering Mathematics II', `${G}/1IAXuGctGEruYx_ISwdgg3WF2RDTihv0L`],

  // ---------- FE 2024 ----------
  [
    'FE',
    '2024',
    null,
    'All FE Papers (2024 Pattern)',
    'http://collegecirculars.unipune.ac.in/sites/examdocs/November%20%202024/F.E%20(%202024%20PATTERN%20).pdf',
  ],

  // ---------- SE 2015 ----------
  ['SE', '2015', 'CE', null, `${G}/1U5GSyE98gAlgmalU3msfYRia2O1vJXXB`],
  ['SE', '2015', 'CIVIL', null, `${G}/1zvOpx6mI7IzrcwzyJIEdFcIy4jL0k1je`],
  ['SE', '2015', 'E & TC', null, `${G}/1BYMyVAoXLtwHELJChpg2E0DyCISxQ4Vg`],
  ['SE', '2015', 'Electrical', null, `${G}/1LZL1C3cd7HW_-LFJjhovUUTS_TAiXd_f`],
  ['SE', '2015', 'IT', null, `${G}/1vIIs8YTAB2Z3NarT-FrhEDnT7WwUpzra`],

  // ---------- SE 2019 ----------
  ['SE', '2019', 'CE', null, `${G}/1fYPVTHH7isAj2B8dyPIACfY1PlsS54Qk`],
  ['SE', '2019', 'CIVIL', null, `${G}/1ddYeII76yTioDloBq1oqnY2ybRFFeMKS`],
  ['SE', '2019', 'AIDS', null, `${G}/1-w2SEeZ25Lotu8Fp-XfjAib1NDQsJjeC`],
  ['SE', '2019', 'E & TC', null, `${G}/1znUA6j7xWA1TkVsaq44mQ0DC3A9fZqcT`],
  ['SE', '2019', 'Electrical', null, `${G}/1HiS1SVPgwbdEqiMkH4HfwOkUlz37S1z0`],
  ['SE', '2019', 'IT', null, `${G}/13Zo_dCjALauLbFcUjOuL3MeaMIChf_GZ`],

  // ---------- TE 2015 ----------
  ['TE', '2015', 'CE', null, `${G}/1VdW86SktSClXf4OXX5RAe18v9Nq4ftlB`],
  ['TE', '2015', 'CIVIL', null, `${G}/1xZIyOJzOfbGM2gMQRDzKLcnuxozsFmwK`],
  ['TE', '2015', 'E & TC', null, `${G}/1T0OiHPD3AaWms8H7exDy6rR7VxeSbkPL`],
  ['TE', '2015', 'Electrical', null, `${G}/1MJHEnvVUhBodloNVXNfa-tO8WaEfqKer`],
  ['TE', '2015', 'IT', null, `${G}/1n7PQw6RdyBm7ST4qCGBKPuJ7rCWZnx_4`],

  // ---------- TE 2019 ----------
  ['TE', '2019', 'CE', null, `${G}/1JcbfSbv3yUjU0WAOR5enIhSRdpbfgJcB`],
  ['TE', '2019', 'CIVIL', null, `${G}/1w5BKzM_kRgyyLqbmeItnvJ7u7RlkQyca`],
  ['TE', '2019', 'AIDS', null, `${G}/1M6k2J9S_MNJDSzRuyLiUjNTHAYC6t3QZ`],
  ['TE', '2019', 'E & TC', null, `${G}/16ilHxjAW9mwz_bL9KP-HqIK_dKDR-0JM`],
  ['TE', '2019', 'Electrical', null, `${G}/1slvcUrgObYVdrps6hH4o9qhuxNmHZYjK`],
  ['TE', '2019', 'IT', null, `${G}/1s3pPLI-tSpYELtKBUn8yLO0iBflOuo8A`],

  // ---------- BE 2015 ----------
  ['BE', '2015', 'CE', null, `${G}/1VkYw8chtgs4nABUN3MVyl1gewB8uzvFN`],
  ['BE', '2015', 'CIVIL', null, `${G}/1EiohKTm706mj6EHP59-K5q9HThhEpCXz`],
  ['BE', '2015', 'E & TC', null, `${G}/1vbvZEV4y_astBYEr1UwB57m2uc4HHHs5`],
  ['BE', '2015', 'Electrical', null, `${G}/1dPPnunzKN-uxC-BqlAT5mSpORTApwHJQ`],
  ['BE', '2015', 'IT', null, `${G}/1CB8_sIIz6wXd7cv3ou0BJ716fxgOxKbM`],

  // ---------- BE 2019 ----------
  ['BE', '2019', 'CE', null, `${G}/1T6r518CZdIA4j96UD0bj5SdPHzw5rS1i`],
  ['BE', '2019', 'CIVIL', null, `${G}/1ctse7DjDBwZiW5rvD8rHu4TmBrqMdVHx`],
  ['BE', '2019', 'AIDS', null, `${G}/1WUkRXhLHHdzjPVReyUEhlfvNLrXv0aau`],
  ['BE', '2019', 'E & TC', null, `${G}/1idRmvl7dAkrYIOoy2C_yUmbduhYizcxo`],
  ['BE', '2019', 'Electrical', null, `${G}/1tpKv5GGH6qCBBKgMLzhTXQW9AGXKU4SA`],
  ['BE', '2019', 'IT', null, `${G}/18Fj1Sl4JqY2qhg99WP1edUdYqfqhnCtn`],
].map(([year_level, pattern, branch, subject_name, drive_link]) => ({
  year_level,
  pattern,
  branch,
  subject_name,
  drive_link,
  category: 'PYQ',
}));

/**
 * Branch-wide Google Drive folders (apply to every year) — supplied for AIML,
 * Civil, Computer and Electrical. Stored in MongoDB so branch clicks resolve
 * through the API instead of hardcoded frontend constants.
 */
export const BRANCH_WIDE_FOLDERS = DEFAULT_BRANCH_FOLDERS.map((folder) => ({
  year_level: 'ALL',
  branch: folder.branch,
  pattern: '2024',
  drive_link: folder.drive_link,
  label: folder.label,
  kind: 'folder',
  is_default: true,
}));

/**
 * Year-level links shared by every branch: the FE Drive folder and the FE 2024
 * exam circular PDF. `branch: 'ALL'` keeps them out of the branch cards and
 * `kind` separates the folder from the standalone document.
 */
export const YEAR_LEVEL_FOLDERS = [
  ...DEFAULT_YEAR_FOLDERS.map((folder) => ({
    year_level: folder.year_level,
    branch: folder.branch,
    pattern: folder.pattern,
    drive_link: folder.drive_link,
    label: folder.label,
    kind: folder.kind ?? 'folder',
    is_default: true,
  })),
  ...DEFAULT_YEAR_DOCUMENTS.map((folder) => ({
    year_level: folder.year_level,
    branch: folder.branch,
    pattern: folder.pattern,
    drive_link: folder.drive_link,
    label: folder.label,
    kind: folder.kind ?? 'document',
    is_default: true,
  })),
];

/** Year + pattern specific branch folders (derived from the existing SE/TE/BE records). */
export const YEAR_PATTERN_FOLDERS = PAPERS.filter((paper) => paper.branch && paper.pattern).map(
  (paper) => ({
    year_level: paper.year_level,
    branch: paper.branch,
    pattern: paper.pattern,
    drive_link: paper.drive_link,
    label: `${paper.branch} — ${paper.year_level} ${paper.pattern}`,
  })
);

async function upsertAdmin(log) {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    log('• Skipping admin account (set ADMIN_EMAIL and ADMIN_PASSWORD to create one)');
    return { created: false };
  }
  const existing = await User.findOne({ email: env.ADMIN_EMAIL });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      existing.role = 'ADMIN';
      await existing.save();
      log(`• Promoted existing account ${env.ADMIN_EMAIL} to ADMIN`);
    } else {
      log(`• Admin account already present: ${env.ADMIN_EMAIL}`);
    }
    return { created: false };
  }

  await User.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    role: 'ADMIN',
  });
  log(`• Created admin account ${env.ADMIN_EMAIL}`);
  return { created: true };
}

export async function seedDatabase({ log = console.log } = {}) {
  if (!isDbConnected()) {
    throw new Error('Not connected to MongoDB. Set MONGODB_URI before seeding.');
  }

  const report = { inserted: 0, updated: 0, collections: {} };

  // Reference data -----------------------------------------------------------
  for (const semester of SEMESTERS) {
    const result = await Semester.updateOne(
      { number: semester.number },
      { $set: semester },
      { upsert: true }
    );
    result.upsertedCount ? report.inserted++ : report.updated++;
  }
  for (const branch of BRANCHES) {
    const result = await Branch.updateOne(
      { code: branch.code },
      { $set: branch },
      { upsert: true }
    );
    result.upsertedCount ? report.inserted++ : report.updated++;
  }
  for (const scheme of SCHEMES) {
    const result = await Scheme.updateOne({ name: scheme.name }, { $set: scheme }, { upsert: true });
    result.upsertedCount ? report.inserted++ : report.updated++;
  }
  for (const year of ACADEMIC_YEARS) {
    const result = await AcademicYear.updateOne({ year: year.year }, { $set: year }, { upsert: true });
    result.upsertedCount ? report.inserted++ : report.updated++;
  }

  // Subjects (Computer Engineering, 2019 Pattern) ----------------------------
  const [cmpnBranch, pattern2019] = await Promise.all([
    Branch.findOne({ code: 'CMPN' }),
    Scheme.findOne({ name: '2019 Pattern' }),
  ]);
  const semesters = await Semester.find();
  const semesterByNumber = new Map(semesters.map((semester) => [semester.number, semester]));

  if (cmpnBranch && pattern2019) {
    for (const subject of SUBJECTS) {
      const semester = semesterByNumber.get(subject.semester);
      if (!semester) continue;
      const result = await Subject.updateOne(
        { code: subject.code, branch: cmpnBranch._id, scheme: pattern2019._id },
        {
          $set: {
            name: subject.name,
            code: subject.code,
            branch: cmpnBranch._id,
            semester: semester._id,
            scheme: pattern2019._id,
          },
        },
        { upsert: true }
      );
      result.upsertedCount ? report.inserted++ : report.updated++;
    }
  }

  // Papers -------------------------------------------------------------------
  let papersInserted = 0;
  for (const paper of PAPERS) {
    const result = await Paper.updateOne(
      {
        year_level: paper.year_level,
        pattern: paper.pattern,
        branch: paper.branch,
        subject_name: paper.subject_name,
        drive_link: paper.drive_link,
      },
      { $set: { category: paper.category } },
      { upsert: true }
    );
    if (result.upsertedCount) {
      report.inserted++;
      papersInserted++;
    } else {
      report.updated++;
    }
  }
  report.collections.papers = papersInserted;

  // Drive folders ------------------------------------------------------------
  let foldersInserted = 0;
  // A Drive folder and a PDF can share the same year/branch/pattern, so the
  // unique key includes `kind`. Drop the older three-field index if present.
  await DriveFolder.collection.dropIndex('year_level_1_branch_1_pattern_1').catch(() => {});

  for (const folder of [...BRANCH_WIDE_FOLDERS, ...YEAR_PATTERN_FOLDERS, ...YEAR_LEVEL_FOLDERS]) {
    const result = await DriveFolder.updateOne(
      {
        year_level: folder.year_level,
        branch: folder.branch,
        pattern: folder.pattern,
        kind: folder.kind ?? 'folder',
      },
      { $set: folder },
      { upsert: true }
    );
    if (result.upsertedCount) {
      report.inserted++;
      foldersInserted++;
    } else {
      report.updated++;
    }
  }
  report.collections.drive_folders = foldersInserted;

  const admin = await upsertAdmin(log);

  report.totals = {
    papers: await Paper.countDocuments(),
    drive_folders: await DriveFolder.countDocuments(),
    subjects: await Subject.countDocuments(),
    branches: await Branch.countDocuments(),
    semesters: await Semester.countDocuments(),
    schemes: await Scheme.countDocuments(),
    academic_years: await AcademicYear.countDocuments(),
    users: await User.countDocuments(),
  };
  report.admin_created = admin.created;

  log(
    `• Papers: ${report.totals.papers} (${papersInserted} new) · Drive folders: ${report.totals.drive_folders} (${foldersInserted} new)`
  );
  log(
    `• Reference data: ${report.totals.branches} branches, ${report.totals.schemes} schemes, ${report.totals.semesters} semesters, ${report.totals.subjects} subjects`
  );

  return report;
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const { connected, error } = await connectDB();
  if (!connected) {
    console.error(`Seed aborted: ${error?.message || 'MONGODB_URI is not configured'}`);
    process.exit(1);
  }
  try {
    await seedDatabase();
    console.log('Seed completed successfully.');
  } catch (seedError) {
    console.error('Seed failed:', seedError.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

export default seedDatabase;
