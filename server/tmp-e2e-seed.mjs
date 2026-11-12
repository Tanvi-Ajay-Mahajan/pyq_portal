/**
 * Temporary verification: seeds a real MongoDB with the portal's real records,
 * then exercises the migration, admin CRUD and feedback APIs over HTTP.
 * Deleted after running — not part of the application.
 */
import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

const PORT = 5098;
const BASE = `http://127.0.0.1:${PORT}/api`;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const mongo = await MongoMemoryServer.create();
const uri = mongo.getUri();
process.env.MONGODB_URI = uri;
process.env.JWT_SECRET = 'e2e-jwt-secret-0123456789abcdef';
process.env.ADMIN_EMAIL = 'admin@pyq.test';
process.env.ADMIN_PASSWORD = 'AdminPass123';
process.env.ADMIN_NAME = 'Portal Admin';

const { connectDB, disconnectDB } = await import('./config/db.js');
const { default: seedDatabase } = await import('./scripts/seed.js');

const conn = await connectDB();
check('seed: connects to a real MongoDB', conn.connected === true);

const report = await seedDatabase({ log: () => {} });
check('seed: loads the real PYQ records', report.totals.papers >= 40, `papers=${report.totals.papers}`);
check(
  'seed: loads branch Drive folders',
  report.totals.drive_folders >= 9,
  `drive_folders=${report.totals.drive_folders}`
);
check(
  'seed: loads reference data',
  report.totals.branches >= 7 && report.totals.subjects >= 20,
  `branches=${report.totals.branches} subjects=${report.totals.subjects} semesters=${report.totals.semesters}`
);
check('seed: creates the admin account', report.admin_created === true);

const second = await seedDatabase({ log: () => {} });
check(
  'seed: is safe to run twice (no duplicates)',
  second.totals.papers === report.totals.papers &&
    second.totals.drive_folders === report.totals.drive_folders,
  `papers still ${second.totals.papers}, folders still ${second.totals.drive_folders}`
);

await disconnectDB();

const child = spawn(process.execPath, ['server.js'], {
  env: { ...process.env, PORT: String(PORT), MONGODB_URI: uri },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
child.stdout.on('data', (d) => {
  log += d;
});
child.stderr.on('data', (d) => {
  log += d;
});

const waitForServer = async () => {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.status) return res;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('server did not start');
};

const api = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, data };
};

try {
  await waitForServer();

  const health = await api('/health');
  check(
    'api: reports the database connected',
    health.status === 200 && health.data?.database === 'connected',
    JSON.stringify(health.data)
  );

  const papers = await api('/papers?limit=200');
  const paperRows = papers.data?.papers || papers.data || [];
  check(
    'api: serves every migrated paper',
    papers.status === 200 && paperRows.length === report.totals.papers,
    `status=${papers.status} rows=${paperRows.length} of ${report.totals.papers} seeded`
  );

  const folders = await api('/drive-folders?year_level=ALL');
  check(
    'api: branch folders now come from MongoDB (not built-in)',
    folders.status === 200 && folders.data.length >= 9 && folders.data.every((f) => !f.source),
    `folders=${folders.data?.length}`
  );

  const resolved = await api('/drive-folders/resolve?year_level=SE&branch=Computer&pattern=2019');
  check(
    'api: branch click resolves a Drive link from the database',
    resolved.status === 200 && String(resolved.data?.drive_link || '').includes('drive.google.com'),
    `match=${resolved.data?.match} link=${String(resolved.data?.drive_link).slice(0, 46)}`
  );

  const reg = await api('/auth/register', {
    method: 'POST',
    body: { name: 'E2E Student', email: 'student@pyq.test', password: 'StudentPass123' },
  });
  check('api: registration works on a seeded database', reg.status === 201 && !!reg.data?.token);

  const studentToken = reg.data?.token;
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'student@pyq.test', password: 'StudentPass123' },
  });
  check('api: student can sign in', login.status === 200 && !!login.data?.token);

  const forbidden = await api('/papers', {
    method: 'POST',
    token: studentToken,
    body: {
      year_level: 'SE',
      pattern: '2024',
      drive_link: 'https://drive.google.com/drive/folders/E2E_FORBIDDEN',
    },
  });
  check('api: students cannot create papers (403)', forbidden.status === 403, `status=${forbidden.status}`);

  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@pyq.test', password: 'AdminPass123' },
  });
  check(
    'api: seeded admin can sign in with the ADMIN role',
    adminLogin.status === 200 && String(adminLogin.data?.user?.role).toUpperCase() === 'ADMIN',
    `role=${adminLogin.data?.user?.role}`
  );

  const adminToken = adminLogin.data?.token;

  const created = await api('/papers', {
    method: 'POST',
    token: adminToken,
    body: {
      year_level: 'SE',
      pattern: '2024',
      branch: 'Computer',
      subject_name: 'E2E Verification Subject',
      category: 'PYQ',
      drive_link: 'https://drive.google.com/drive/folders/E2E_VERIFY_ID',
    },
  });
  const newId = created.data?.id || created.data?._id;
  check('api: admin can add a paper (201)', created.status === 201 && !!newId, `id=${newId}`);

  const updated = await api(`/papers/${newId}`, {
    method: 'PUT',
    token: adminToken,
    body: { subject_name: 'E2E Updated Subject' },
  });
  check(
    'api: admin can update a paper',
    updated.status === 200 && String(JSON.stringify(updated.data)).includes('E2E Updated Subject')
  );

  const feedback = await api('/feedback', {
    method: 'POST',
    token: studentToken,
    body: { paper_id: newId, rating: 5, comment: 'Great paper' },
  });
  check('api: authenticated student can submit feedback (201)', feedback.status === 201, `status=${feedback.status}`);

  const feedbackList = await api(`/papers/${newId}/feedback`);
  const blob = JSON.stringify(feedbackList.data || {});
  const avg = feedbackList.data?.average_rating ?? feedbackList.data?.average ?? feedbackList.data?.stats?.average_rating;
  check(
    'api: feedback average rating is calculated',
    feedbackList.status === 200 && (Number(avg) === 5 || blob.includes('"rating":5')),
    `average=${avg ?? 'n/a'}`
  );

  const removed = await api(`/papers/${newId}`, { method: 'DELETE', token: adminToken });
  check('api: admin can delete a paper', removed.status === 200, `status=${removed.status}`);

  const gone = await api(`/papers/${newId}`);
  check('api: deleted paper is gone (404)', gone.status === 404, `status=${gone.status}`);
} catch (error) {
  check(`harness error: ${error.message}`, false);
} finally {
  child.kill('SIGTERM');
  await mongo.stop();
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n[e2e] ${passed}/${results.length} checks passed`);
if (passed !== results.length) {
  console.log('\n[e2e] server log tail:\n' + log.split('\n').slice(-12).join('\n'));
  process.exitCode = 1;
}
