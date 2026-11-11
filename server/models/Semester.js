import mongoose from 'mongoose';

const semesterSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true, min: 1, max: 8 },
    label: { type: String, required: true, trim: true, maxlength: 60 },
  },
  { timestamps: true, versionKey: false }
);

export const Semester = mongoose.model('Semester', semesterSchema);
export default Semester;
