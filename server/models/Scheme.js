import mongoose from 'mongoose';

const schemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
  },
  { timestamps: true, versionKey: false }
);

export const Scheme = mongoose.model('Scheme', schemeSchema);
export default Scheme;
