import mongoose from 'mongoose';

/**
 * One text chunk of an uploaded document, with its page number so answers can
 * cite "page N". Chunks live in their own collection so a large PDF never hits
 * MongoDB's 16 MB document limit.
 */
const aiChunkSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'AiDocument', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    index: { type: Number, required: true },
    page: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], default: undefined },
  },
  { timestamps: true, collection: 'aichunks' },
);

aiChunkSchema.index({ document: 1, index: 1 }, { unique: true });

export default mongoose.models.AiChunk || mongoose.model('AiChunk', aiChunkSchema);
