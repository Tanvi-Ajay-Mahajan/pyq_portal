import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * AI feature API tests: a real in-memory MongoDB plus the actual Express app.
 *
 * No AI provider key is present, which is deliberate: it proves that
 *  - document upload, extraction, chunking and storage work on their own,
 *  - generation endpoints fail with a clear 503 instead of inventing answers,
 *  - every AI record is scoped to its owner.
 */

let mongo;
let httpServer;
let baseUrl;
let User;
let AiQuizAttempt;
let AiFlashcard;
let disconnectDB;

const OWNER = { name: 'Owner Student', email: 'ai-owner@pyq.test', password: 'OwnerPass123' };
const OTHER = { name: 'Other Student', email: 'ai-other@pyq.test', password: 'OtherPass123' };

/** Builds a small but genuinely valid multi-page PDF (correct xref offsets). */
const buildPdf = (pageTexts) => {
  const objects = [];
  const pageCount = pageTexts.length;
  const fontId = 3 + pageCount * 2;
  const kids = pageTexts.map((_, index) => `${3 + index * 2} 0 R`).join(' ');

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;

  pageTexts.forEach((text, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const escaped = text.replace(/([()\\])/g, '\\$1');
    const stream = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] =
      `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  });

  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const startxref = Buffer.byteLength(pdf, 'latin1');
  const size = objects.length;
  pdf += `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let id = 1; id < size; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
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

const uploadPdf = async (token, buffer, filename = 'unit-notes.pdf') => {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'application/pdf' }), filename);
  const response = await fetch(`${baseUrl}/api/ai/documents`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
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

const login = async (credentials) => {
  const response = await api('/auth/login', { method: 'POST', body: credentials });
  assert.equal(response.status, 200, `login should succeed: ${response.text}`);
  return response.json.token;
};

before(async () => {
  // Deliberately no provider key: generation must report a clear 503.
  delete process.env.GEMINI_API_KEY;

  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('pyq_ai_test');
  process.env.JWT_SECRET = 'test-only-secret-value-0123456789';
  process.env.NODE_ENV = 'test';

  const db = await import('../config/db.js');
  disconnectDB = db.disconnectDB;
  const { connected } = await db.connectDB();
  assert.equal(connected, true, 'expected a MongoDB connection');

  ({ default: User } = await import('../models/User.js'));
  ({ default: AiQuizAttempt } = await import('../models/AiQuizAttempt.js'));
  ({ default: AiFlashcard } = await import('../models/AiFlashcard.js'));
  const { createApp } = await import('../server.js');

  await User.create(OWNER);
  await User.create(OTHER);

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

test('AI status reports an unconfigured provider without leaking secrets', async () => {
  const token = await login(OWNER);
  const { status, json } = await api('/ai/status', { token });
  assert.equal(status, 200);
  assert.equal(json.ai_configured, false);
  assert.equal(json.model, null);
  assert.ok(json.max_pdf_mb > 0);
  assert.ok(json.limits.generations_per_hour > 0);
  assert.doesNotMatch(JSON.stringify(json), /key|secret|token/i);
});

test('AI routes reject anonymous callers', async () => {
  const { status } = await api('/ai/documents');
  assert.equal(status, 401);
  const upload = await uploadPdf('not-a-real-token', buildPdf(['Hello']));
  assert.equal(upload.status, 401);
});

test('a PDF is extracted, chunked and stored for its owner', async () => {
  const token = await login(OWNER);
  const pdf = buildPdf([
    'Binary search tree stores keys so that the left subtree is smaller and the right subtree is larger.',
    'Insertion and deletion in a balanced binary search tree take logarithmic time on average.',
  ]);

  const { status, json } = await uploadPdf(token, pdf);
  assert.equal(status, 201, `upload should succeed: ${JSON.stringify(json)}`);
  assert.equal(json.document.page_count, 2);
  assert.ok(json.document.chunk_count > 0);
  assert.ok(json.document.char_count > 0);
  assert.equal(json.document.status, 'ready');
  assert.equal(json.document.filename, 'unit-notes.pdf');

  const list = await api('/ai/documents', { token });
  assert.equal(list.status, 200);
  assert.equal(list.json.documents.length, 1);
  assert.equal(list.json.documents[0].id, json.document.id);
});

test('a file that is not a real PDF is rejected', async () => {
  const token = await login(OWNER);
  const fake = Buffer.from('This is plain text pretending to be a PDF document.');
  const { status, json } = await uploadPdf(token, fake, 'fake.pdf');
  assert.equal(status, 400);
  assert.match(json.error, /pdf/i);
});

test('chat history and documents are isolated per user', async () => {
  const ownerToken = await login(OWNER);
  const otherToken = await login(OTHER);

  const created = await api('/ai/conversations', {
    method: 'POST',
    token: ownerToken,
    body: { title: 'Binary search tree doubts' },
  });
  assert.equal(created.status, 201);
  const conversationId = created.json.conversation.id;

  const otherList = await api('/ai/conversations', { token: otherToken });
  assert.equal(otherList.status, 200);
  assert.equal(otherList.json.conversations.length, 0);

  const otherRead = await api(`/ai/conversations/${conversationId}/messages`, { token: otherToken });
  assert.equal(otherRead.status, 404);

  const otherDelete = await api(`/ai/conversations/${conversationId}`, {
    method: 'DELETE',
    token: otherToken,
  });
  assert.equal(otherDelete.status, 404);

  const ownerDocuments = await api('/ai/documents', { token: ownerToken });
  const documentId = ownerDocuments.json.documents[0].id;
  const otherDocumentDelete = await api(`/ai/documents/${documentId}`, {
    method: 'DELETE',
    token: otherToken,
  });
  assert.equal(otherDocumentDelete.status, 404);
});

test('generation returns a clear 503 while no AI provider key is configured', async () => {
  const token = await login(OWNER);
  const created = await api('/ai/conversations', {
    method: 'POST',
    token,
    body: { title: 'Follow up' },
  });
  const conversationId = created.json.conversation.id;

  const message = await api(`/ai/conversations/${conversationId}/messages`, {
    method: 'POST',
    token,
    body: { content: 'Explain binary search tree' },
  });
  assert.equal(message.status, 503);
  assert.match(message.json.error, /GEMINI_API_KEY/);

  const solve = await api('/ai/solve', {
    method: 'POST',
    token,
    body: { question: 'Explain paging in operating systems', marks: 10 },
  });
  assert.equal(solve.status, 503);

  const summary = await api('/ai/summary', {
    method: 'POST',
    token,
    body: { document_id: '507f1f77bcf86cd799439011' },
  });
  assert.equal(summary.status, 503);
});

test('conversation titles can be renamed and conversations deleted', async () => {
  const token = await login(OWNER);
  const created = await api('/ai/conversations', {
    method: 'POST',
    token,
    body: { title: 'Rename me' },
  });
  const id = created.json.conversation.id;

  const renamed = await api(`/ai/conversations/${id}`, {
    method: 'PATCH',
    token,
    body: { title: 'Data structures revision' },
  });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.json.conversation.title, 'Data structures revision');

  const empty = await api(`/ai/conversations/${id}`, {
    method: 'PATCH',
    token,
    body: { title: '   ' },
  });
  assert.equal(empty.status, 400);

  const deleted = await api(`/ai/conversations/${id}`, { method: 'DELETE', token });
  assert.equal(deleted.status, 200);

  const missing = await api(`/ai/conversations/${id}/messages`, { token });
  assert.equal(missing.status, 404);
});

test('quiz scoring marks answers and reveals explanations', async () => {
  const token = await login(OWNER);
  const user = await User.findOne({ email: OWNER.email });

  const attempt = await AiQuizAttempt.create({
    user: user._id,
    title: 'Trees quiz',
    difficulty: 'medium',
    questions: [
      {
        question: 'Which traversal visits the root first?',
        options: ['Inorder', 'Preorder', 'Postorder', 'Level order'],
        answer_index: 1,
        explanation: 'Preorder visits root, then left, then right.',
      },
      {
        question: 'Height of a single node tree?',
        options: ['0', '1', '2', '3'],
        answer_index: 0,
        explanation: 'A single node tree has height 0.',
      },
    ],
    total: 2,
  });

  const submitted = await api(`/ai/quiz/${attempt._id}/submit`, {
    method: 'POST',
    token,
    body: { answers: [1, 3] },
  });

  assert.equal(submitted.status, 200);
  assert.equal(submitted.json.result.score, 1);
  assert.equal(submitted.json.result.total, 2);
  assert.equal(submitted.json.result.percentage, 50);
  assert.equal(submitted.json.result.questions[0].correct, true);
  assert.equal(submitted.json.result.questions[1].correct, false);
  assert.equal(submitted.json.result.questions[1].answer_index, 0);
  assert.match(submitted.json.result.questions[0].explanation, /Preorder/);

  const otherToken = await login(OTHER);
  const forbidden = await api(`/ai/quiz/${attempt._id}/submit`, {
    method: 'POST',
    token: otherToken,
    body: { answers: [1, 0] },
  });
  assert.equal(forbidden.status, 404);
});

test('flashcards can be listed, marked for revision and deleted', async () => {
  const token = await login(OWNER);
  const user = await User.findOne({ email: OWNER.email });
  const documents = await api('/ai/documents', { token });
  const documentId = documents.json.documents[0].id;

  const card = await AiFlashcard.create({
    user: user._id,
    document: documentId,
    front: 'What is a binary search tree?',
    back: 'A binary tree where left keys are smaller and right keys are larger.',
    page: 1,
  });

  const list = await api(`/ai/flashcards?document_id=${documentId}`, { token });
  assert.equal(list.status, 200);
  assert.equal(list.json.flashcards.length, 1);

  const marked = await api(`/ai/flashcards/${card._id}`, {
    method: 'PATCH',
    token,
    body: { marked: true },
  });
  assert.equal(marked.status, 200);
  assert.equal(marked.json.flashcard.marked, true);

  const otherToken = await login(OTHER);
  const otherMark = await api(`/ai/flashcards/${card._id}`, {
    method: 'PATCH',
    token: otherToken,
    body: { marked: false },
  });
  assert.equal(otherMark.status, 404);

  const deleted = await api(`/ai/flashcards/${card._id}`, { method: 'DELETE', token });
  assert.equal(deleted.status, 200);
  assert.equal(await AiFlashcard.countDocuments({ user: user._id }), 0);
});

test('deleting a document removes its chunks', async () => {
  const token = await login(OWNER);
  const list = await api('/ai/documents', { token });
  const documentId = list.json.documents[0].id;

  const removed = await api(`/ai/documents/${documentId}`, { method: 'DELETE', token });
  assert.equal(removed.status, 200);

  const after = await api('/ai/documents', { token });
  assert.equal(after.json.documents.length, 0);

  const { default: AiChunk } = await import('../models/AiChunk.js');
  assert.equal(await AiChunk.countDocuments({ document: documentId }), 0);
});
