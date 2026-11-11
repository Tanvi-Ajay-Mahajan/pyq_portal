import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * End-to-end API tests: a real MongoDB instance (in-memory server) plus the
 * actual Express app from server.js. Covers registration, JWT login, protected
 * admin CRUD, branch Drive-link resolution from the database and the feedback
 * average calculation.
 */

let mongo;
let httpServer;
let baseUrl;
let User;
let disconnectDB;
let seedDatabase;

const ADMIN = {
  name: 'Portal Admin',
  email: 'admin@pyq.test',
  password: 'AdminPass123',
};

const STUDENT = {
  name: 'Test Student',
  email: 'student@pyq.test',
  password: 'StudentPass123',
};

const api = async (path, { method = 'GET', token, body } = {}) => {
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
};

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('pyq_portal_test');
  process.env.JWT_SECRET = 'test-only-secret-value-0123456789';
  process.env.NODE_ENV = 'test';

  const db = await import('../config/db.js');
  disconnectDB = db.disconnectDB;
  const { connected } = await db.connectDB();
  assert.equal(connected, true, 'expected a MongoDB connection');

  ({ default: User } = await import('../models/User.js'));
  ({ seedDatabase } = await import('../scripts/seed.js'));
  const { createApp } = await import('../server.js');

  await User.create({ ...ADMIN, role: 'ADMIN' });

  const app = createApp();
  httpServer = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => httpServer.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

after(async () => {
  if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  if (disconnectDB) await disconnectDB();
  if (mongo) await mongo.stop();
});

test('health endpoint reports the database connection', async () => {
  const { status, json } = await api('/health');
  assert.equal(status, 200);
  assert.equal(json.database, 'connected');
});

test('seeded PYQ records and branch Drive folders exist', async () => {
  const seeded = await seedDatabase();
  assert.ok(seeded.total > 0, 'seed should insert records');

  const papers = await api('/papers');
  assert.equal(papers.status, 200);
  assert.ok(papers.json.length > 0);
  const sample = papers.json.find((paper) => paper.drive_link);
  assert.match(sample.drive_link, /^https?:\/\//);
  assert.ok(sample.year_level && sample.pattern);
});

test('register hashes the password and returns a JWT', async () => {
  const created = await api('/auth/register', { method: 'POST', body: STUDENT });
  assert.equal(created.status, 201);
  assert.ok(created.json.token);
  assert.equal(created.json.user.email, STUDENT.email);
  assert.equal(created.json.user.role, 'STUDENT');

  const stored = await User.findOne({ email: STUDENT.email }).select('+password');
  assert.notEqual(stored.password, STUDENT.password);
  assert.match(stored.password, /^\$2[aby]\$/, 'password must be a bcrypt hash');

  const duplicate = await api('/auth/register', { method: 'POST', body: STUDENT });
  assert.equal(duplicate.status, 409);

  const weak = await api('/auth/register', {
    method: 'POST',
    body: { name: 'Weak', email: 'weak@pyq.test', password: 'short' },
  });
  assert.equal(weak.status, 422);
});

test('login rejects bad passwords and /auth/me returns the profile', async () => {
  const bad = await api('/auth/login', {
    method: 'POST',
    body: { email: STUDENT.email, password: 'wrong-password' },
  });
  assert.equal(bad.status, 401);

  const ok = await api('/auth/login', {
    method: 'POST',
    body: { email: STUDENT.email, password: STUDENT.password },
  });
  assert.equal(ok.status, 200);

  const me = await api('/auth/me', { token: ok.json.token });
  assert.equal(me.status, 200);
  assert.equal(me.json.user.email, STUDENT.email);

  const anonymous = await api('/auth/me');
  assert.equal(anonymous.status, 401);
});

test('admin paper CRUD is JWT + role protected', async () => {
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: ADMIN.email, password: ADMIN.password },
  });
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.json.token;

  const studentLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: STUDENT.email, password: STUDENT.password },
  });
  const studentToken = studentLogin.json.token;

  const newPaper = {
    year_level: 'SE',
    pattern: '2024',
    branch: 'COMPUTER',
    subject_name: 'Data Structures',
    category: 'PYQ',
    drive_link: 'https://drive.google.com/file/d/test-paper/view',
  };

  const anonymousCreate = await api('/papers', { method: 'POST', body: newPaper });
  assert.equal(anonymousCreate.status, 401);

  const studentCreate = await api('/papers', { method: 'POST', token: studentToken, body: newPaper });
  assert.equal(studentCreate.status, 403);

  const created = await api('/papers', { method: 'POST', token: adminToken, body: newPaper });
  assert.equal(created.status, 201);
  const paperId = created.json.id;
  assert.ok(paperId);

  const updated = await api(`/papers/${paperId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { subject_name: 'Data Structures & Algorithms' },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.subject_name, 'Data Structures & Algorithms');

  const invalid = await api('/papers', {
    method: 'POST',
    token: adminToken,
    body: { ...newPaper, drive_link: 'not-a-url' },
  });
  assert.equal(invalid.status, 422);

  const removed = await api(`/papers/${paperId}`, { method: 'DELETE', token: adminToken });
  assert.ok([200, 204].includes(removed.status));

  const gone = await api(`/papers/${paperId}`);
  assert.equal(gone.status, 404);
});

test('branch click resolves the Drive folder from MongoDB (newest pattern first)', async () => {
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: ADMIN.email, password: ADMIN.password },
  });
  const adminToken = adminLogin.json.token;

  const older = await api('/drive-folders', {
    method: 'POST',
    token: adminToken,
    body: {
      year_level: 'SE',
      branch: 'COMPUTER',
      pattern: '2019',
      drive_link: 'https://drive.google.com/drive/folders/computer-2019',
    },
  });
  assert.equal(older.status, 201);

  const newer = await api('/drive-folders', {
    method: 'POST',
    token: adminToken,
    body: {
      year_level: 'SE',
      branch: 'COMPUTER',
      pattern: '2024',
      drive_link: 'https://drive.google.com/drive/folders/computer-2024',
    },
  });
  assert.equal(newer.status, 201);

  const latest = await api('/drive-folders/resolve?year_level=SE&branch=COMPUTER');
  assert.equal(latest.status, 200);
  assert.equal(latest.json.drive_link, 'https://drive.google.com/drive/folders/computer-2024');

  const pinned = await api('/drive-folders/resolve?year_level=SE&branch=COMPUTER&pattern=2019');
  assert.equal(pinned.status, 200);
  assert.equal(pinned.json.drive_link, 'https://drive.google.com/drive/folders/computer-2019');

  const unknown = await api('/drive-folders/resolve?year_level=BE&branch=NOT-A-BRANCH');
  assert.equal(unknown.status, 404);

  const missingParam = await api('/drive-folders/resolve');
  assert.equal(missingParam.status, 400);
});

test('feedback requires auth and updates the average rating', async () => {
  const papers = await api('/papers?limit=1');
  const paperId = papers.json[0].id;

  const anonymous = await api('/feedback', {
    method: 'POST',
    body: { paper_id: paperId, rating: 5 },
  });
  assert.equal(anonymous.status, 401);

  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: STUDENT.email, password: STUDENT.password },
  });
  const token = login.json.token;

  const first = await api('/feedback', {
    method: 'POST',
    token,
    body: { paper_id: paperId, rating: 4, comment: 'Useful paper set.' },
  });
  assert.equal(first.status, 201);
  assert.equal(first.json.average, 4);

  const updated = await api(`/feedback/${first.json.feedback.id}`, {
    method: 'PUT',
    token,
    body: { rating: 2 },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.average, 2);

  const summary = await api(`/papers/${paperId}/feedback`);
  assert.equal(summary.status, 200);
  assert.equal(summary.json.count, 1);
  assert.equal(summary.json.average, 2);

  const mine = await api('/feedback/mine', { token });
  assert.equal(mine.status, 200);
  assert.equal(mine.json.length, 1);
  assert.ok(mine.json[0].paper, 'my feedback should include the paper summary');

  const invalidRating = await api('/feedback', {
    method: 'POST',
    token,
    body: { paper_id: paperId, rating: 9 },
  });
  assert.equal(invalidRating.status, 422);

  const recent = await api('/feedback/recent?limit=5');
  assert.equal(recent.status, 200);
  assert.ok(Array.isArray(recent.json));
});

test('admin-only user listing rejects students', async () => {
  const studentLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: STUDENT.email, password: STUDENT.password },
  });
  const forbidden = await api('/users', { token: studentLogin.json.token });
  assert.equal(forbidden.status, 403);

  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: ADMIN.email, password: ADMIN.password },
  });
  const allowed = await api('/users', { token: adminLogin.json.token });
  assert.equal(allowed.status, 200);
  const payload = allowed.json.users ?? allowed.json;
  assert.ok(payload.length >= 2);
  assert.ok(payload.every((user) => user.password === undefined), 'passwords must never be serialized');
});
