import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 20 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    drive_link: { type: String, trim: true, default: null },
  },
  { timestamps: true, versionKey: false }
);

export const Branch = mongoose.model('Branch', branchSchema);
export default Branch;
