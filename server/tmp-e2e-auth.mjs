/**
 * Temporary end-to-end check: boots a real MongoDB, starts the real Express
 * server against it, and exercises registration/login/me over HTTP.
 * Deleted after running — not part of the application.
 */
import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

const PORT = 5099;
const BASE = `http://127.0.0.1:${PORT}/api`;
const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
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
}

const mongo = await MongoMemoryServer.create();
const uri = mongo.getUri();
console.log(`[e2e] real MongoDB started: ${uri.replace(/\/\/[^@]*@/, '//***@')}`);

const child = spawn(process.execPath, ['server.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    MONGODB_URI: uri,
    JWT_SECRET: 'e2e-verification-secret-value-0123456789',
    PORT: String(PORT),
    NODE_ENV: 'production',
    SEED_ON_START: 'false',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (d) => (serverLog += d.toString()));
child.stderr.on('data', (d) => (serverLog += d.toString()));

try {
  let connected = false;
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${BASE}/health`);
      const body = await res.json();
      if (body.database === 'connected') {
        connected = true;
        console.log(`[e2e] health: ${res.status} ${JSON.stringify(body)}`);
        break;
      }
    } catch {
      /* server still starting */
    }
    await sleep(500);
  }
  record('server reports database connected', connected);
  if (!connected) throw new Error('server never connected to MongoDB');

  const email = 'e2e.student@example.com';
  const password = 'TestPass123';

  const reg = await call('/auth/register', {
    method: 'POST',
    body: { name: 'E2E Student', email, password },
  });
  record('register returns 201 + token', reg.status === 201 && Boolean(reg.data?.token), `status ${reg.status}`);
  record(
    'register stores the account with hashed password',
    reg.data?.user?.email === email && reg.data?.user?.password === undefined,
    `user=${JSON.stringify(reg.data?.user)}`
  );

  const me = await call('/auth/me', { token: reg.data?.token });
  record('authenticated /me returns the new account', me.status === 200 && me.data?.user?.email === email, `status ${me.status}`);

  const login = await call('/auth/login', { method: 'POST', body: { email, password } });
  record('login with the same password returns 200 + token', login.status === 200 && Boolean(login.data?.token), `status ${login.status}`);

  const dupe = await call('/auth/register', { method: 'POST', body: { name: 'E2E Student', email, password } });
  record('duplicate email is rejected with 409', dupe.status === 409, `status ${dupe.status}`);

  const badPass = await call('/auth/login', { method: 'POST', body: { email, password: 'WrongPass123' } });
  record('wrong password is rejected with 401', badPass.status === 401, `status ${badPass.status}`);

  const shortPass = await call('/auth/register', {
    method: 'POST',
    body: { name: 'E2E Student', email: 'other@example.com', password: 'short' },
  });
  record('password shorter than 8 chars is rejected with 422', shortPass.status === 422, `status ${shortPass.status}`);

  const papers = await call('/papers', { token: login.data?.token });
  record('papers endpoint works once a database exists', papers.status === 200, `status ${papers.status}`);

  const noToken = await call('/auth/me');
  record('unauthenticated /me is rejected with 401', noToken.status === 401, `status ${noToken.status}`);
} catch (error) {
  record('e2e run completed', false, error.message);
} finally {
  child.kill('SIGTERM');
  await sleep(500);
  child.kill('SIGKILL');
  await mongo.stop();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n[e2e] ${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('\n[e2e] server log tail:\n' + serverLog.split('\n').slice(-25).join('\n'));
  process.exit(1);
}
process.exit(0);
