import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { aiGenerationLimit, aiUploadLimit, requireAiConfigured } from '../middleware/aiRateLimit.js';
import { uploadSinglePdf } from '../middleware/upload.js';
import {
  createConversation,
  createFlashcards,
  createQuiz,
  deleteConversation,
  deleteDocument,
  deleteFlashcard,
  getStatus,
  listConversations,
  listDocuments,
  listFlashcards,
  listMessages,
  listQuizzes,
  sendMessage,
  solveQuestion,
  submitQuiz,
  summarizeDocument,
  updateConversation,
  updateFlashcard,
  uploadDocument,
} from '../controllers/aiController.js';

const router = Router();

/** Every AI route requires a signed-in student: no anonymous AI usage. */
router.use(protect);

router.get('/status', getStatus);

// Documents: uploading is allowed even without a provider key so the extraction
// pipeline stays testable; all generation routes below require a configured key.
router.get('/documents', listDocuments);
router.post('/documents', aiUploadLimit, uploadSinglePdf, uploadDocument);
router.delete('/documents/:id', deleteDocument);

router.get('/conversations', listConversations);
router.post('/conversations', createConversation);
router.patch('/conversations/:id', updateConversation);
router.delete('/conversations/:id', deleteConversation);
router.get('/conversations/:id/messages', listMessages);
router.post('/conversations/:id/messages', aiGenerationLimit, requireAiConfigured, sendMessage);

router.post('/solve', aiGenerationLimit, requireAiConfigured, solveQuestion);

router.get('/quizzes', listQuizzes);
router.post('/quiz', aiGenerationLimit, requireAiConfigured, createQuiz);
router.post('/quiz/:id/submit', submitQuiz);

router.post('/summary', aiGenerationLimit, requireAiConfigured, summarizeDocument);

router.get('/flashcards', listFlashcards);
router.post('/flashcards', aiGenerationLimit, requireAiConfigured, createFlashcards);
router.patch('/flashcards/:id', updateFlashcard);
router.delete('/flashcards/:id', deleteFlashcard);

export default router;
