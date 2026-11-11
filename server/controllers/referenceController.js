import Branch from '../models/Branch.js';
import Scheme from '../models/Scheme.js';
import AcademicYear from '../models/AcademicYear.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  toAcademicYear,
  toBranch,
  toScheme,
  toSemester,
  toSubject,
} from '../utils/serialize.js';

/** GET /api/reference — everything the UI needs in one request. */
export const getReferenceData = asyncHandler(async (_req, res) => {
  const [branches, schemes, academicYears, semesters, subjects] = await Promise.all([
    Branch.find().sort({ name: 1 }),
    Scheme.find().sort({ name: 1 }),
    AcademicYear.find().sort({ year: -1 }),
    Semester.find().sort({ number: 1 }),
    Subject.find().sort({ name: 1 }),
  ]);

  res.json({
    branches: branches.map(toBranch),
    schemes: schemes.map(toScheme),
    academicYears: academicYears.map(toAcademicYear),
    semesters: semesters.map(toSemester),
    subjects: subjects.map(toSubject),
  });
});

export const listBranches = asyncHandler(async (_req, res) => {
  const branches = await Branch.find().sort({ name: 1 });
  res.json(branches.map(toBranch));
});

export const createBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.create({
    code: String(req.body.code || '').trim().toUpperCase(),
    name: String(req.body.name || '').trim(),
    drive_link: req.body.drive_link ? String(req.body.drive_link).trim() : null,
  });
  res.status(201).json(toBranch(branch));
});

export const updateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) throw ApiError.notFound('Branch not found');

  if (req.body.code !== undefined) branch.code = String(req.body.code).trim().toUpperCase();
  if (req.body.name !== undefined) branch.name = String(req.body.name).trim();
  if (req.body.drive_link !== undefined) {
    branch.drive_link = req.body.drive_link ? String(req.body.drive_link).trim() : null;
  }
  await branch.save();
  res.json(toBranch(branch));
});

export const deleteBranch = asyncHandler(async (req, res) => {
  const inUse = await Subject.countDocuments({ branch: req.params.id });
  if (inUse > 0) throw ApiError.conflict('This branch is used by existing subjects');
  const branch = await Branch.findByIdAndDelete(req.params.id);
  if (!branch) throw ApiError.notFound('Branch not found');
  res.json({ message: 'Branch deleted', id: req.params.id });
});

export const listSchemes = asyncHandler(async (_req, res) => {
  const schemes = await Scheme.find().sort({ name: 1 });
  res.json(schemes.map(toScheme));
});

export const createScheme = asyncHandler(async (req, res) => {
  const scheme = await Scheme.create({ name: String(req.body.name || '').trim() });
  res.status(201).json(toScheme(scheme));
});

export const updateScheme = asyncHandler(async (req, res) => {
  const scheme = await Scheme.findByIdAndUpdate(
    req.params.id,
    { name: String(req.body.name || '').trim() },
    { new: true, runValidators: true }
  );
  if (!scheme) throw ApiError.notFound('Scheme not found');
  res.json(toScheme(scheme));
});

export const deleteScheme = asyncHandler(async (req, res) => {
  const inUse = await Subject.countDocuments({ scheme: req.params.id });
  if (inUse > 0) throw ApiError.conflict('This scheme is used by existing subjects');
  const scheme = await Scheme.findByIdAndDelete(req.params.id);
  if (!scheme) throw ApiError.notFound('Scheme not found');
  res.json({ message: 'Scheme deleted', id: req.params.id });
});

export const listAcademicYears = asyncHandler(async (_req, res) => {
  const years = await AcademicYear.find().sort({ year: -1 });
  res.json(years.map(toAcademicYear));
});

export const createAcademicYear = asyncHandler(async (req, res) => {
  const year = await AcademicYear.create({ year: String(req.body.year || '').trim() });
  res.status(201).json(toAcademicYear(year));
});

export const deleteAcademicYear = asyncHandler(async (req, res) => {
  const year = await AcademicYear.findByIdAndDelete(req.params.id);
  if (!year) throw ApiError.notFound('Academic year not found');
  res.json({ message: 'Academic year deleted', id: req.params.id });
});

export const listSemesters = asyncHandler(async (_req, res) => {
  const semesters = await Semester.find().sort({ number: 1 });
  res.json(semesters.map(toSemester));
});

export const listSubjects = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.branch_id) filter.branch = req.query.branch_id;
  if (req.query.semester_id) filter.semester = req.query.semester_id;
  if (req.query.scheme_id) filter.scheme = req.query.scheme_id;

  const subjects = await Subject.find(filter).sort({ name: 1 });
  res.json(subjects.map(toSubject));
});

export const createSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.create({
    name: String(req.body.name || '').trim(),
    code: String(req.body.code || '').trim().toUpperCase(),
    branch: req.body.branch_id,
    semester: req.body.semester_id,
    scheme: req.body.scheme_id,
  });
  res.status(201).json(toSubject(subject));
});

export const updateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) throw ApiError.notFound('Subject not found');

  if (req.body.name !== undefined) subject.name = String(req.body.name).trim();
  if (req.body.code !== undefined) subject.code = String(req.body.code).trim().toUpperCase();
  if (req.body.branch_id !== undefined) subject.branch = req.body.branch_id;
  if (req.body.semester_id !== undefined) subject.semester = req.body.semester_id;
  if (req.body.scheme_id !== undefined) subject.scheme = req.body.scheme_id;

  await subject.save();
  res.json(toSubject(subject));
});

export const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findByIdAndDelete(req.params.id);
  if (!subject) throw ApiError.notFound('Subject not found');
  res.json({ message: 'Subject deleted', id: req.params.id });
});
