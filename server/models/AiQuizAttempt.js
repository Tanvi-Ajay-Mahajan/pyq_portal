import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    answer_index: { type: Number, required: true },
    explanation: { type: String, default: '' },
    page: { type: Number, default: null },
  },
  { _id: false },
);

const aiQuizAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'AiDocument', default: null },
    title: { type: String, default: 'Practice quiz' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    questions: { type: [questionSchema], default: [] },
    answers: { type: [Number], default: [] },
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'aiquizattempts' },
);

aiQuizAttemptSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.AiQuizAttempt ||
  mongoose.model('AiQuizAttempt', aiQuizAttemptSchema);
