import mongoose from 'mongoose';

/**
 * An uploaded study document (PDF). The original file is never written to disk:
 * its text is extracted in memory and stored as AiChunk rows, which also keeps
 * the app working on hosts without a persistent volume.
 */
const aiDocumentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true, trim: true },
    mime_type: { type: String, default: 'application/pdf' },
    size_bytes: { type: Number, default: 0 },
    page_count: { type: Number, default: 0 },
    chunk_count: { type: Number, default: 0 },
    char_count: { type: Number, default: 0 },
    status: { type: String, enum: ['ready', 'failed'], default: 'ready' },
    /** Embedding model used for the chunks, or null when keyword retrieval is used. */
    embedding_model: { type: String, default: null },
    warnings: [{ type: String }],
  },
  { timestamps: true, collection: 'aidocuments' },
);

aiDocumentSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.AiDocument || mongoose.model('AiDocument', aiDocumentSchema);
