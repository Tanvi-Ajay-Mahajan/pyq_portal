import mongoose from 'mongoose';

const aiFlashcardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'AiDocument', required: true, index: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    marked: { type: Boolean, default: false },
    page: { type: Number, default: null },
  },
  { timestamps: true, collection: 'aiflashcards' },
);

aiFlashcardSchema.index({ user: 1, document: 1, createdAt: 1 });

export default mongoose.models.AiFlashcard ||
  mongoose.model('AiFlashcard', aiFlashcardSchema);
