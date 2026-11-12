import mongoose from 'mongoose';

const citationSchema = new mongoose.Schema(
  {
    page: { type: Number, default: null },
    snippet: { type: String, default: '' },
    document_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AiDocument', default: null },
    document_name: { type: String, default: null },
  },
  { _id: false },
);

const aiMessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'AiConversation', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    citations: { type: [citationSchema], default: [] },
    model: { type: String, default: null },
  },
  { timestamps: true, collection: 'aimessages' },
);

aiMessageSchema.index({ conversation: 1, createdAt: 1 });

export default mongoose.models.AiMessage || mongoose.model('AiMessage', aiMessageSchema);
