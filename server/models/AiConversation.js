import mongoose from 'mongoose';

const aiConversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    mode: { type: String, enum: ['chat', 'solve'], default: 'chat' },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AiDocument' }],
    message_count: { type: Number, default: 0 },
    last_message_at: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'aiconversations' },
);

aiConversationSchema.index({ user: 1, last_message_at: -1 });

export default mongoose.models.AiConversation ||
  mongoose.model('AiConversation', aiConversationSchema);
