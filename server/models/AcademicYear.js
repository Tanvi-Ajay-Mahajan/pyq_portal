import mongoose from 'mongoose';

const academicYearSchema = new mongoose.Schema(
  {
    year: { type: String, required: true, unique: true, trim: true, maxlength: 20 },
  },
  { timestamps: true, versionKey: false }
);

export const AcademicYear = mongoose.model('AcademicYear', academicYearSchema);
export default AcademicYear;
