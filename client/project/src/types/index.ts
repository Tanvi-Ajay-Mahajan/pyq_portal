export type UserRole = 'STUDENT' | 'ADMIN';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
}

export interface Scheme {
  id: string;
  name: string;
}

export interface AcademicYear {
  id: string;
  year: string;
}

export interface Semester {
  id: string;
  number: number;
  label: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  branch_id: string;
  semester_id: string;
  scheme_id: string;
}

export interface QuestionPaper {
  id: string;
  title: string;
  drive_link: string;
  exam_year: number;
  subject_id: string;
  branch_id: string;
  semester_id: string;
  scheme_id: string;
  academic_year_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionPaperWithRelations extends QuestionPaper {
  subject?: Subject;
  branch?: Branch;
  semester?: Semester;
  scheme?: Scheme;
  academic_year?: AcademicYear;
}

export interface ReferenceData {
  branches: Branch[];
  schemes: Scheme[];
  academicYears: AcademicYear[];
  semesters: Semester[];
}

export type YearLevel = 'FE' | 'SE' | 'TE' | 'BE';

export interface PyqPaper {
  id: string;
  year_level: YearLevel;
  pattern: string;
  branch: string | null;
  subject_name: string | null;
  drive_link: string;
  created_at: string;
}

export interface PyqFeedback {
  id: string;
  paper_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface PyqFeedbackWithUser extends PyqFeedback {
  user: { full_name: string } | null;
}

export interface PaperFeedback {
  id: string;
  paper_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface FeedbackWithUser extends PaperFeedback {
  user: { full_name: string } | null;
}
