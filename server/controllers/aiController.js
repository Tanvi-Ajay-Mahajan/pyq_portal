import mongoose from 'mongoose';
import { env, isAiConfigured } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import AiDocument from '../models/AiDocument.js';
import AiChunk from '../models/AiChunk.js';
import AiConversation from '../models/AiConversation.js';
import AiMessage from '../models/AiMessage.js';
import AiQuizAttempt from '../models/AiQuizAttempt.js';
import AiFlashcard from '../models/AiFlashcard.js';
import { extractPdfPages } from '../services/ai/pdfExtract.js';
import { chunkPages } from '../services/ai/chunk.js';
import { selectRelevantChunks, snippetOf } from '../services/ai/retrieval.js';
import { embedTexts, generateText } from '../services/ai/geminiClient.js';
import {
  buildExcerptBlock,
  chatPrompt,
  flashcardSystem,
  quizSystem,
  solvePrompt,
  summarySystem,
} from '../services/ai/prompts.js';
import { isPdfBuffer } from '../middleware/upload.js';

/* ------------------------------------------------------------------ helpers */

const userIdOf = (req) => req.user?.id || req.user?._id;

const assertObjectId = (value, label) => {
  if (!mongoose.isValidObjectId(value)) throw ApiError.badRequest(`Invalid ${label}.`);
  return value;
};

const MAX_EXCERPT_CHARS = 9000;

const serializeDocument = (doc) => ({
  id: String(doc._id),
  filename: doc.filename,
  page_count: doc.page_count,
  chunk_count: doc.chunk_count,
  char_count: doc.char_count,
  size_bytes: doc.size_bytes,
  status: doc.status,
  embedded: Boolean(doc.embedding_model),
  warnings: doc.warnings || [],
  created_at: doc.createdAt,
});

const serializeConversation = (conversation) => ({
  id: String(conversation._id),
  title: conversation.title,
  mode: conversation.mode,
  document_ids: (conversation.documents || []).map(String),
  message_count: conversation.message_count,
  last_message_at: conversation.last_message_at,
  created_at: conversation.createdAt,
});

const serializeMessage = (message) => ({
  id: String(message._id),
  role: message.role,
  content: message.content,
  citations: (message.citations || []).map((citation) => ({
    page: citation.page,
    snippet: citation.snippet,
    document_id: citation.document_id ? String(citation.document_id) : null,
    document_name: citation.document_name || null,
  })),
  created_at: message.createdAt,
});

/** Parses JSON that the model returned, tolerating stray code fences. */
const parseModelJson = (text) => {
  const cleaned = String(text)
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
  }
  throw new ApiError(502, 'The AI response could not be read. Please try again.');
};

const requireOwnedDocument = async (userId, documentId) => {
  assertObjectId(documentId, 'document id');
  const document = await AiDocument.findOne({ _id: documentId, user: userId });
  if (!document) throw ApiError.notFound('Document not found.');
  return document;
};

const requireOwnedConversation = async (userId, conversationId) => {
  assertObjectId(conversationId, 'conversation id');
  const conversation = await AiConversation.findOne({ _id: conversationId, user: userId });
  if (!conversation) throw ApiError.notFound('Conversation not found.');
  return conversation;
};

/**
 * Retrieves the most relevant chunks for a question and builds the prompt block
 * plus the page citations shown in the UI.
 */
const buildContext = async ({ userId, question, documentIds }) => {
  const ids = (documentIds || []).filter(Boolean);
  if (!ids.length) return { excerpts: '', hasDocuments: false, citations: [] };

  const documents = await AiDocument.find({ _id: { $in: ids }, user: userId })
    .select('filename embedding_model')
    .lean();
  if (!documents.length) return { excerpts: '', hasDocuments: false, citations: [] };

  const useEmbeddings = documents.every((document) => Boolean(document.embedding_model));
  const query = AiChunk.find({ document: { $in: documents.map((document) => document._id) } })
    .select(`document index page text${useEmbeddings ? ' embedding' : ''}`)
    .lean();

  const [chunks, queryVectors] = await Promise.all([
    query,
    useEmbeddings ? embedTexts([question]) : Promise.resolve(null),
  ]);

  const queryEmbedding = Array.isArray(queryVectors) ? queryVectors[0] : null;
  const selected = selectRelevantChunks(question, chunks, { topK: 6, queryEmbedding });
  if (!selected.length) return { excerpts: '', hasDocuments: true, citations: [] };

  const nameById = new Map(documents.map((document) => [String(document._id), document.filename]));
  const nameOf = (chunk) => nameById.get(String(chunk.document)) || 'uploaded document';

  let excerpts = buildExcerptBlock(
    selected.map((entry) => ({ chunk: entry.chunk, documentName: nameOf(entry.chunk) })),
  );
  if (excerpts.length > MAX_EXCERPT_CHARS) {
    excerpts = `${excerpts.slice(0, MAX_EXCERPT_CHARS)}\n[excerpts truncated]`;
  }

  return {
    excerpts,
    hasDocuments: true,
    citations: selected.map((entry) => ({
      page: entry.chunk.page,
      snippet: snippetOf(entry.chunk.text),
      document_id: entry.chunk.document,
      document_name: nameOf(entry.chunk),
    })),
  };
};

const textFromRequest = (req, field, { max = 4000, label = 'question' } = {}) => {
  const raw = typeof req.body?.[field] === 'string' ? req.body[field].trim() : '';
  if (!raw) throw ApiError.badRequest(`Please provide a ${label}.`);
  if (raw.length > max) throw ApiError.badRequest(`The ${label} is too long (maximum ${max} characters).`);
  return raw;
};

/* ------------------------------------------------------------------- status */

export const getStatus = asyncHandler(async (_req, res) => {
  res.json({
    ai_configured: isAiConfigured(),
    model: isAiConfigured() ? env.GEMINI_MODEL : null,
    embedding_model: isAiConfigured() ? env.GEMINI_EMBED_MODEL : null,
    max_pdf_mb: env.AI_MAX_PDF_MB,
    max_pages: env.AI_MAX_PAGES,
    ocr_enabled: env.AI_OCR_ENABLED,
    limits: { generations_per_hour: 80, uploads_per_hour: 25 },
  });
});

/* ---------------------------------------------------------------- documents */

export const uploadDocument = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  if (!req.file?.buffer) throw ApiError.badRequest('Attach a PDF in the "file" field.');
  if (!isPdfBuffer(req.file.buffer)) {
    throw ApiError.badRequest('That file is not a valid PDF.');
  }

  const { pages, totalPages, truncated, maxPages } = await extractPdfPages(req.file.buffer, {
    maxPages: env.AI_MAX_PAGES,
  });

  if (!pages.length) {
    throw new ApiError(
      422,
      env.AI_OCR_ENABLED
        ? 'No text could be extracted from this PDF. It may be damaged.'
        : 'No text could be extracted from this PDF. It looks like a scanned document, and OCR is disabled. Upload a text-based PDF.',
    );
  }

  const chunks = chunkPages(pages, { maxChunks: env.AI_MAX_CHUNKS });
  if (!chunks.length) throw new ApiError(422, 'This PDF did not contain usable text.');

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
  const warnings = [];
  if (truncated) warnings.push(`Only the first ${maxPages} pages were processed.`);
  if (!embeddings) warnings.push('Semantic search is unavailable, so keyword search is used.');

  const document = await AiDocument.create({
    user: userId,
    filename: (req.file.originalname || 'document.pdf').slice(0, 200),
    mime_type: 'application/pdf',
    size_bytes: req.file.size || req.file.buffer.length,
    page_count: totalPages,
    chunk_count: chunks.length,
    char_count: pages.reduce((sum, page) => sum + page.text.length, 0),
    status: 'ready',
    embedding_model: embeddings ? env.GEMINI_EMBED_MODEL : null,
    warnings,
  });

  await AiChunk.insertMany(
    chunks.map((chunk, position) => ({
      document: document._id,
      user: userId,
      index: chunk.index,
      page: chunk.page,
      text: chunk.text,
      ...(embeddings ? { embedding: embeddings[position] } : {}),
    })),
  );

  res.status(201).json({ document: serializeDocument(document) });
});

export const listDocuments = asyncHandler(async (req, res) => {
  const documents = await AiDocument.find({ user: userIdOf(req) })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ documents: documents.map(serializeDocument) });
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const document = await requireOwnedDocument(userId, req.params.id);

  await Promise.all([
    AiChunk.deleteMany({ document: document._id, user: userId }),
    AiFlashcard.deleteMany({ document: document._id, user: userId }),
    AiConversation.updateMany(
      { user: userId },
      { $pull: { documents: document._id } },
    ),
    document.deleteOne(),
  ]);

  res.json({ message: 'Document deleted.' });
});

/* ------------------------------------------------------------ conversations */

export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await AiConversation.find({ user: userIdOf(req) })
    .sort({ last_message_at: -1 })
    .limit(100);
  res.json({ conversations: conversations.map(serializeConversation) });
});

export const createConversation = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const title = (req.body?.title || '').trim().slice(0, 120) || 'New chat';
  const documentIds = [];

  if (req.body?.document_id) {
    const document = await requireOwnedDocument(userId, req.body.document_id);
    documentIds.push(document._id);
  }

  const conversation = await AiConversation.create({
    user: userId,
    title,
    mode: req.body?.mode === 'solve' ? 'solve' : 'chat',
    documents: documentIds,
  });

  res.status(201).json({ conversation: serializeConversation(conversation) });
});

export const updateConversation = asyncHandler(async (req, res) => {
  const conversation = await requireOwnedConversation(userIdOf(req), req.params.id);
  const title = (req.body?.title || '').trim();
  if (!title) throw ApiError.badRequest('A conversation title is required.');
  conversation.title = title.slice(0, 120);
  await conversation.save();
  res.json({ conversation: serializeConversation(conversation) });
});

export const deleteConversation = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const conversation = await requireOwnedConversation(userId, req.params.id);
  await AiMessage.deleteMany({ conversation: conversation._id, user: userId });
  await conversation.deleteOne();
  res.json({ message: 'Conversation deleted.' });
});

export const listMessages = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const conversation = await requireOwnedConversation(userId, req.params.id);
  const messages = await AiMessage.find({ conversation: conversation._id, user: userId })
    .sort({ createdAt: 1 })
    .limit(500);
  res.json({
    conversation: serializeConversation(conversation),
    messages: messages.map(serializeMessage),
  });
});

/* -------------------------------------------------------------------- chat */

export const sendMessage = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const conversation = await requireOwnedConversation(userId, req.params.id);
  const content = textFromRequest(req, 'content', { label: 'message' });

  if (req.body?.document_id) {
    const document = await requireOwnedDocument(userId, req.body.document_id);
    if (!conversation.documents.some((id) => String(id) === String(document._id))) {
      conversation.documents.push(document._id);
    }
  }

  const history = await AiMessage.find({ conversation: conversation._id, user: userId })
    .sort({ createdAt: 1 })
    .limit(20)
    .select('role content')
    .lean();

  const context = await buildContext({
    userId,
    question: content,
    documentIds: conversation.documents,
  });

  const { system, prompt } = chatPrompt({
    question: content,
    excerpts: context.excerpts,
    hasDocuments: context.hasDocuments,
  });

  const historyBlock = history
    .map((entry) => `${entry.role === 'user' ? 'Student' : 'Assistant'}: ${entry.content}`)
    .join('\n\n');

  const { text, model } = await generateText({
    system,
    prompt: historyBlock
      ? `Earlier in this conversation:\n${historyBlock.slice(-4000)}\n\n${prompt}`
      : prompt,
    temperature: 0.4,
    maxOutputTokens: 2048,
  });

  const [userMessage, assistantMessage] = await Promise.all([
    AiMessage.create({
      conversation: conversation._id,
      user: userId,
      role: 'user',
      content,
    }),
    AiMessage.create({
      conversation: conversation._id,
      user: userId,
      role: 'assistant',
      content: text,
      citations: context.citations,
      model,
    }),
  ]);

  if (!conversation.title || conversation.title === 'New chat') {
    conversation.title = content.slice(0, 60);
  }
  conversation.message_count += 2;
  conversation.last_message_at = new Date();
  await conversation.save();

  res.json({
    conversation: serializeConversation(conversation),
    user_message: serializeMessage(userMessage),
    assistant_message: serializeMessage(assistantMessage),
  });
});

/* ------------------------------------------------------------------- solve */

export const solveQuestion = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const question = textFromRequest(req, 'question', { label: 'question' });
  const rawMarks = Number(req.body?.marks ?? 5);
  const marks = rawMarks <= 2 ? 2 : rawMarks <= 5 ? 5 : 10;

  let documentIds = [];
  if (req.body?.document_id) {
    const document = await requireOwnedDocument(userId, req.body.document_id);
    documentIds = [document._id];
  }

  const context = await buildContext({ userId, question, documentIds });
  const { system, prompt } = solvePrompt({
    question,
    marks,
    excerpts: context.excerpts,
    hasDocuments: context.hasDocuments,
  });

  const { text, model } = await generateText({
    system,
    prompt,
    temperature: 0.35,
    maxOutputTokens: marks >= 10 ? 3072 : 1536,
  });

  res.json({ answer: text, marks, citations: context.citations, model });
});

/* -------------------------------------------------------------------- quiz */

const normalizeQuestion = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const options = Array.isArray(entry.options)
    ? entry.options.map((option) => String(option ?? '').trim()).filter(Boolean)
    : [];
  const answerIndex = Number(entry.answer_index);
  if (options.length !== 4 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
    return null;
  }
  const question = String(entry.question || '').trim();
  if (!question) return null;
  return {
    question,
    options,
    answer_index: answerIndex,
    explanation: String(entry.explanation || '').trim(),
    page: Number.isInteger(Number(entry.page)) ? Number(entry.page) : null,
  };
};

export const createQuiz = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const document = await requireOwnedDocument(userId, req.body?.document_id);
  const difficulty = ['easy', 'medium', 'hard'].includes(req.body?.difficulty)
    ? req.body.difficulty
    : 'medium';
  const count = Math.min(Math.max(Number(req.body?.count) || 10, 5), 20);

  const chunks = await AiChunk.find({ document: document._id, user: userId })
    .sort({ index: 1 })
    .select('page text')
    .lean();

  if (!chunks.length) throw ApiError.badRequest('This document has no readable text to quiz on.');

  const material = chunks
    .map((chunk) => `--- page ${chunk.page} ---\n${chunk.text}`)
    .join('\n\n')
    .slice(0, 24000);

  const { text } = await generateText({
    system: quizSystem,
    prompt: `Create ${count} ${difficulty} multiple-choice questions from this material:\n\n${material}`,
    temperature: 0.5,
    maxOutputTokens: 4096,
    json: true,
  });

  const parsed = parseModelJson(text);
  const questions = (Array.isArray(parsed?.questions) ? parsed.questions : [])
    .map(normalizeQuestion)
    .filter(Boolean)
    .slice(0, count);

  if (!questions.length) {
    throw new ApiError(502, 'The AI could not generate valid questions. Please try again.');
  }

  const attempt = await AiQuizAttempt.create({
    user: userId,
    document: document._id,
    title: `${document.filename} — ${difficulty} quiz`,
    difficulty,
    questions,
    total: questions.length,
  });

  res.status(201).json({
    quiz: {
      id: String(attempt._id),
      title: attempt.title,
      difficulty,
      total: questions.length,
      // Correct answers stay on the server until the quiz is submitted.
      questions: questions.map((question) => ({
        question: question.question,
        options: question.options,
      })),
    },
  });
});

export const submitQuiz = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  assertObjectId(req.params.id, 'quiz id');
  const attempt = await AiQuizAttempt.findOne({ _id: req.params.id, user: userId });
  if (!attempt) throw ApiError.notFound('Quiz not found.');

  const submitted = Array.isArray(req.body?.answers) ? req.body.answers : null;
  if (!submitted) throw ApiError.badRequest('Send answers as an array.');

  const answers = attempt.questions.map((_question, index) => {
    const value = Number(submitted[index]);
    return Number.isInteger(value) && value >= 0 && value <= 3 ? value : -1;
  });

  const score = attempt.questions.reduce(
    (total, question, index) => total + (answers[index] === question.answer_index ? 1 : 0),
    0,
  );

  attempt.answers = answers;
  attempt.score = score;
  attempt.total = attempt.questions.length;
  attempt.completed = true;
  await attempt.save();

  res.json({
    result: {
      id: String(attempt._id),
      score,
      total: attempt.questions.length,
      percentage: attempt.questions.length
        ? Math.round((score / attempt.questions.length) * 100)
        : 0,
      questions: attempt.questions.map((question, index) => ({
        question: question.question,
        options: question.options,
        answer_index: question.answer_index,
        explanation: question.explanation,
        page: question.page,
        selected_index: answers[index] === -1 ? null : answers[index],
        correct: answers[index] === question.answer_index,
      })),
    },
  });
});

export const listQuizzes = asyncHandler(async (req, res) => {
  const attempts = await AiQuizAttempt.find({ user: userIdOf(req) })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('title difficulty score total completed createdAt');
  res.json({
    quizzes: attempts.map((attempt) => ({
      id: String(attempt._id),
      title: attempt.title,
      difficulty: attempt.difficulty,
      score: attempt.score,
      total: attempt.total,
      completed: attempt.completed,
      created_at: attempt.createdAt,
    })),
  });
});

/* ----------------------------------------------------------------- summary */

export const summarizeDocument = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const document = await requireOwnedDocument(userId, req.body?.document_id);

  const chunks = await AiChunk.find({ document: document._id, user: userId })
    .sort({ index: 1 })
    .select('page text')
    .lean();
  if (!chunks.length) throw ApiError.badRequest('This document has no readable text to summarise.');

  const material = chunks
    .map((chunk) => `--- page ${chunk.page} ---\n${chunk.text}`)
    .join('\n\n')
    .slice(0, 24000);

  const { text } = await generateText({
    system: summarySystem,
    prompt: `Summarise this study material for exam revision:\n\n${material}`,
    temperature: 0.3,
    maxOutputTokens: 4096,
    json: true,
  });

  const parsed = parseModelJson(text);
  const asArray = (value) => (Array.isArray(value) ? value : []);

  res.json({
    summary: {
      document_id: String(document._id),
      filename: document.filename,
      title: String(parsed?.title || document.filename),
      chapters: asArray(parsed?.chapters).map((chapter) => ({
        heading: String(chapter?.heading || 'Section'),
        summary: String(chapter?.summary || ''),
        key_points: asArray(chapter?.key_points).map(String),
        definitions: asArray(chapter?.definitions).map((definition) => ({
          term: String(definition?.term || ''),
          meaning: String(definition?.meaning || ''),
        })),
        formulas: asArray(chapter?.formulas).map(String),
      })),
      exam_points: asArray(parsed?.exam_points).map(String),
      faqs: asArray(parsed?.faqs).map((faq) => ({
        question: String(faq?.question || ''),
        answer: String(faq?.answer || ''),
      })),
      revision_notes: asArray(parsed?.revision_notes).map(String),
    },
  });
});

/* -------------------------------------------------------------- flashcards */

export const createFlashcards = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const document = await requireOwnedDocument(userId, req.body?.document_id);
  const count = Math.min(Math.max(Number(req.body?.count) || 12, 5), 30);

  const chunks = await AiChunk.find({ document: document._id, user: userId })
    .sort({ index: 1 })
    .select('page text')
    .lean();
  if (!chunks.length) throw ApiError.badRequest('This document has no readable text.');

  const material = chunks
    .map((chunk) => `--- page ${chunk.page} ---\n${chunk.text}`)
    .join('\n\n')
    .slice(0, 24000);

  const { text } = await generateText({
    system: flashcardSystem,
    prompt: `Create ${count} revision flashcards from this material:\n\n${material}`,
    temperature: 0.4,
    maxOutputTokens: 3072,
    json: true,
  });

  const parsed = parseModelJson(text);
  const cards = (Array.isArray(parsed?.flashcards) ? parsed.flashcards : [])
    .map((card) => ({
      front: String(card?.front || '').trim(),
      back: String(card?.back || '').trim(),
      page: Number.isInteger(Number(card?.page)) ? Number(card.page) : null,
    }))
    .filter((card) => card.front && card.back)
    .slice(0, count);

  if (!cards.length) {
    throw new ApiError(502, 'The AI could not generate flashcards. Please try again.');
  }

  const saved = await AiFlashcard.insertMany(
    cards.map((card) => ({ ...card, user: userId, document: document._id })),
  );

  res.status(201).json({
    flashcards: saved.map((card) => ({
      id: String(card._id),
      front: card.front,
      back: card.back,
      page: card.page,
      marked: card.marked,
    })),
  });
});

export const listFlashcards = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const filter = { user: userId };
  if (req.query.document_id) {
    assertObjectId(req.query.document_id, 'document id');
    filter.document = req.query.document_id;
  }
  const cards = await AiFlashcard.find(filter).sort({ createdAt: 1 }).limit(300);
  res.json({
    flashcards: cards.map((card) => ({
      id: String(card._id),
      front: card.front,
      back: card.back,
      page: card.page,
      marked: card.marked,
      document_id: String(card.document),
    })),
  });
});

export const updateFlashcard = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  assertObjectId(req.params.id, 'flashcard id');
  const card = await AiFlashcard.findOne({ _id: req.params.id, user: userId });
  if (!card) throw ApiError.notFound('Flashcard not found.');

  if (typeof req.body?.marked === 'boolean') card.marked = req.body.marked;
  if (typeof req.body?.front === 'string' && req.body.front.trim()) card.front = req.body.front.trim();
  if (typeof req.body?.back === 'string' && req.body.back.trim()) card.back = req.body.back.trim();
  await card.save();

  res.json({
    flashcard: {
      id: String(card._id),
      front: card.front,
      back: card.back,
      page: card.page,
      marked: card.marked,
      document_id: String(card.document),
    },
  });
});

export const deleteFlashcard = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  assertObjectId(req.params.id, 'flashcard id');
  const card = await AiFlashcard.findOneAndDelete({ _id: req.params.id, user: userId });
  if (!card) throw ApiError.notFound('Flashcard not found.');
  res.json({ message: 'Flashcard deleted.' });
});
