/**
 * Serializers keep the REST payloads compatible with the existing React types
 * (src/types/index.ts): every document is exposed with a string `id` and the
 * original snake_case field names the UI already uses.
 */

const idOf = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

export const toUser = (user) => {
  if (!user) return null;
  return {
    id: idOf(user),
    name: user.name,
    full_name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.createdAt,
  };
};

export const toBranch = (branch) => {
  if (!branch) return null;
  return {
    id: idOf(branch),
    code: branch.code,
    name: branch.name,
    drive_link: branch.drive_link || null,
  };
};

export const toScheme = (scheme) => (scheme ? { id: idOf(scheme), name: scheme.name } : null);

export const toAcademicYear = (year) => (year ? { id: idOf(year), year: year.year } : null);

export const toSemester = (semester) =>
  semester ? { id: idOf(semester), number: semester.number, label: semester.label } : null;

export const toSubject = (subject) => {
  if (!subject) return null;
  return {
    id: idOf(subject),
    name: subject.name,
    code: subject.code,
    branch_id: idOf(subject.branch),
    semester_id: idOf(subject.semester),
    scheme_id: idOf(subject.scheme),
  };
};

export const toPaper = (paper) => {
  if (!paper) return null;
  return {
    id: idOf(paper),
    year_level: paper.year_level,
    pattern: paper.pattern,
    branch: paper.branch ?? null,
    subject_name: paper.subject_name ?? null,
    category: paper.category || 'PYQ',
    semester: paper.semester ?? null,
    exam_year: paper.exam_year ?? null,
    drive_link: paper.drive_link,
    subject_id: idOf(paper.subject),
    branch_id: idOf(paper.branch_ref),
    semester_id: idOf(paper.semester_ref),
    scheme_id: idOf(paper.scheme_ref),
    academic_year_id: idOf(paper.academic_year_ref),
    created_by: idOf(paper.created_by),
    created_at: paper.createdAt,
    updated_at: paper.updatedAt,
  };
};

export const toFeedback = (feedback) => {
  if (!feedback) return null;
  const authorName =
    feedback.user_name || feedback.user?.name || feedback.user?.full_name || 'Student';
  return {
    id: idOf(feedback),
    paper_id: idOf(feedback.paper),
    user_id: idOf(feedback.user),
    user_name: authorName,
    rating: feedback.rating,
    comment: feedback.comment ?? null,
    created_at: feedback.createdAt,
    updated_at: feedback.updatedAt,
    user: { full_name: authorName },
  };
};

export const toDriveFolder = (folder) => {
  if (!folder) return null;
  return {
    id: idOf(folder),
    year_level: folder.year_level,
    branch: folder.branch,
    pattern: folder.pattern,
    drive_link: folder.drive_link,
    label: folder.label ?? null,
    kind: folder.kind ?? 'folder',
    is_default: Boolean(folder.is_default),
    updated_at: folder.updatedAt,
  };
};

export { idOf };
