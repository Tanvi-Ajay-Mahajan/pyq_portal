import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
    scheme: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', required: true },
  },
  { timestamps: true, versionKey: false }
);

subjectSchema.index({ code: 1, branch: 1, scheme: 1 }, { unique: true });

export const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;
