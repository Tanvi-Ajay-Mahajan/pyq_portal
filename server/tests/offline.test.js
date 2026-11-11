/**
 * Verifies the branch Drive browser works with NO database configured, which is
 * the deployed state until MONGODB_URI is set. Every branch folder must be
 * served read-only from server/config/defaultDriveFolders.js, while writes and
 * paper queries keep returning a clear 503 instead of hanging or faking data.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
import { isDbConnected } from '../config/db.js';
import { DEFAULT_BRANCH_FOLDERS } from '../config/defaultDriveFolders.js';

const startServer = async () => {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}` };
};

test('offline branch folders', async (t) => {
  assert.equal(isDbConnected(), false, 'this suite must run without a database');
  const { server, base } = await startServer();
  t.after(() => server.close());

  await t.test('GET /api/drive-folders returns branch folders plus FE year links', async () => {
    const res = await fetch(`${base}/api/drive-folders`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body), 'expected an array of folders');

    const branchFolders = body.filter(
      (folder) => folder.branch !== 'ALL' && folder.kind !== 'document'
    );
    assert.equal(branchFolders.length, DEFAULT_BRANCH_FOLDERS.length);
    assert.deepEqual(branchFolders.map((folder) => folder.branch).sort(), [
      'AIML',
      'Civil',
      'Computer',
      'E & CE',
      'ENTC',
      'Electrical',
      'IT',
      'Mechanical',
      'Robotics & Automation',
    ]);

    for (const folder of branchFolders) {
      assert.match(folder.drive_link, /^https:\/\/drive\.google\.com\/drive\/folders\/[\w-]+$/);
      assert.ok(folder.id, 'each folder needs an id for the client');
      assert.equal(folder.year_level, 'ALL');
      assert.equal(folder.kind, 'folder');
    }

    // Every supplied branch keeps its own exact Drive folder.
    const expectedLinks = {
      AIML: '16qpRY6eoaNqt79VpPCJV82Mtq3cO-ago',
      Civil: '1U8N82pIk_Aihd9zO0ibplfKknZisTOeA',
      Computer: '1wEtVRbe72SfOr479dSFlhkjMOR1h2FfH',
      Electrical: '1SIgkt4Dhovn0cakRY6vCFYHVkGGqsbjn',
      ENTC: '11anFaTKjfcrS3NpMJCE7-DcX6UUaMlY_',
      'E & CE': '1RNvEYcduwXcbK3np2tL0k0lFK1bYIkYE',
      IT: '1_r4aaWaDHKVrg2RBJ_udiCSh59JRhCG-',
      Mechanical: '1d_y0hi2frgdVLzNJodqnLv1rsVB4R1LT',
      'Robotics & Automation': '1bWylIfNbB_OqIB-EA02Lcyj-ZpmE-RG71',
    };

    for (const [branch, folderId] of Object.entries(expectedLinks)) {
      const folder = branchFolders.find((item) => item.branch === branch);
      assert.ok(folder, `expected a Drive folder for ${branch}`);
      assert.ok(
        folder.drive_link.endsWith(`/folders/${folderId}`),
        `${branch} points at ${folder.drive_link}`
      );
    }

    // FE is a year-level link, not a branch.
    const feFolder = body.find((folder) => folder.year_level === 'FE' && folder.kind !== 'document');
    assert.ok(feFolder, 'expected an FE year-level Drive folder');
    assert.equal(feFolder.branch, 'ALL');
    assert.equal(
      feFolder.drive_link,
      'https://drive.google.com/drive/folders/1Zt53Ou_TGcnPp-hkKpn6QwUpshogj0Bo'
    );

    const feDocument = body.find((folder) => folder.kind === 'document');
    assert.ok(feDocument, 'expected the FE 2024 exam circular');
    assert.equal(feDocument.year_level, 'FE');
    assert.equal(
      feDocument.drive_link,
      'http://collegecirculars.unipune.ac.in/sites/examdocs/November%20%202024/F.E%20(%202024%20PATTERN%20).pdf'
    );
  });

  await t.test('GET /api/drive-folders/resolve resolves per branch and year', async () => {
    const cases = [
      ['AIML', '16qpRY6eoaNqt79VpPCJV82Mtq3cO-ago'],
      ['Civil', '1U8N82pIk_Aihd9zO0ibplfKknZisTOeA'],
      ['Computer', '1wEtVRbe72SfOr479dSFlhkjMOR1h2FfH'],
      ['Electrical', '1SIgkt4Dhovn0cakRY6vCFYHVkGGqsbjn'],
      ['ENTC', '11anFaTKjfcrS3NpMJCE7-DcX6UUaMlY_'],
      ['E & CE', '1RNvEYcduwXcbK3np2tL0k0lFK1bYIkYE'],
      ['IT', '1_r4aaWaDHKVrg2RBJ_udiCSh59JRhCG-'],
      ['Mechanical', '1d_y0hi2frgdVLzNJodqnLv1rsVB4R1LT'],
      ['Robotics & Automation', '1bWylIfNbB_OqIB-EA02Lcyj-ZpmE-RG71'],
      // Papers label this branch 'E & TC'; it must resolve to the ENTC folder.
      ['E & TC', '11anFaTKjfcrS3NpMJCE7-DcX6UUaMlY_'],
    ];

    for (const [branch, folderId] of cases) {
      const res = await fetch(
        `${base}/api/drive-folders/resolve?branch=${encodeURIComponent(branch)}&year_level=SE`
      );
      assert.equal(res.status, 200, `${branch} should resolve`);
      const body = await res.json();
      assert.ok(
        body.drive_link.endsWith(folderId),
        `${branch} resolved to ${body.drive_link}`
      );
    }
  });

  await t.test('branch aliases and unknown branches behave predictably', async () => {
    const alias = await fetch(`${base}/api/drive-folders/resolve?branch=CE`);
    assert.equal(alias.status, 200, 'CE is an alias of the Computer branch');
    const aliasBody = await alias.json();
    assert.ok(aliasBody.drive_link.endsWith('1wEtVRbe72SfOr479dSFlhkjMOR1h2FfH'));

    const missing = await fetch(`${base}/api/drive-folders/resolve?branch=Instrumentation`);
    assert.equal(missing.status, 404);
    const missingText = await missing.text();
    assert.match(missingText, /Instrumentation/);
  });

  await t.test('database-backed endpoints stay honest at 503', async () => {
    const papers = await fetch(`${base}/api/papers`);
    assert.equal(papers.status, 503);

    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'student@example.com', password: 'secret123' }),
    });
    assert.equal(login.status, 503);
  });

  await t.test('admin Drive writes are rejected without a database', async () => {
    const res = await fetch(`${base}/api/drive-folders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        branch: 'AIML',
        drive_link: 'https://drive.google.com/drive/folders/abc123',
      }),
    });
    assert.equal(res.status, 503);
  });
});
