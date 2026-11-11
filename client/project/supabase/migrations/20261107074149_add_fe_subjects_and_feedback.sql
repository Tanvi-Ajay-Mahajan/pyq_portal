/*
# Add FE (1st Year) Subjects for All Branches + Feedback/Rating System

## Overview
1. Adds first-year (Semester 1 & 2) subjects for INFT, MECH, ETC, ELEC, CIVL.
2. Adds `paper_feedback` table: star rating (1-5) + optional comment, one per user per paper.
3. Adds sample FE question papers.

## New Table: paper_feedback
- id (uuid PK), paper_id (FK CASCADE), user_id (DEFAULT auth.uid(), FK CASCADE),
  rating (1-5 NOT NULL), comment (text <=500), created_at.
- UNIQUE(paper_id, user_id).

## Security
- RLS enabled. Public read; users can only modify their own feedback.
*/

-- ---------- paper_feedback table ----------
CREATE TABLE IF NOT EXISTS public.paper_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES public.question_papers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (length(comment) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_paper_feedback_unique ON public.paper_feedback(paper_id, user_id);
CREATE INDEX IF NOT EXISTS idx_paper_feedback_paper ON public.paper_feedback(paper_id);

ALTER TABLE public.paper_feedback ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paper_feedback TO authenticated;
GRANT SELECT ON public.paper_feedback TO anon, authenticated;

DROP POLICY IF EXISTS "feedback_select_all" ON public.paper_feedback;
CREATE POLICY "feedback_select_all"
ON public.paper_feedback FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "feedback_insert_own" ON public.paper_feedback;
CREATE POLICY "feedback_insert_own"
ON public.paper_feedback FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_update_own" ON public.paper_feedback;
CREATE POLICY "feedback_update_own"
ON public.paper_feedback FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_delete_own" ON public.paper_feedback;
CREATE POLICY "feedback_delete_own"
ON public.paper_feedback FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ---------- FE subjects for INFT ----------
INSERT INTO public.subjects (name, code, branch_id, semester_id, scheme_id)
SELECT s.name, s.code, b.id, sem.id, sc.id
FROM (VALUES
  ('Engineering Mathematics I','INFT-MTH101',1),
  ('Engineering Physics','INFT-PHY101',1),
  ('Basic Electrical Engineering','INFT-ELE101',1),
  ('Engineering Mathematics II','INFT-MTH102',2),
  ('Engineering Chemistry','INFT-CHM102',2),
  ('Programming and Problem Solving','INFT-CSP102',2)
) AS s(name, code, sem_num)
JOIN public.branches b ON b.code = 'INFT'
JOIN public.semesters sem ON sem.number = s.sem_num
JOIN public.schemes sc ON sc.name = '2019 Pattern'
ON CONFLICT (code, branch_id, scheme_id) DO NOTHING;

-- ---------- FE subjects for MECH ----------
INSERT INTO public.subjects (name, code, branch_id, semester_id, scheme_id)
SELECT s.name, s.code, b.id, sem.id, sc.id
FROM (VALUES
  ('Engineering Mathematics I','MECH-MTH101',1),
  ('Engineering Physics','MECH-PHY101',1),
  ('Basic Mechanical Engineering','MECH-MEC101',1),
  ('Engineering Mathematics II','MECH-MTH102',2),
  ('Engineering Chemistry','MECH-CHM102',2),
  ('Engineering Graphics','MECH-EG102',2)
) AS s(name, code, sem_num)
JOIN public.branches b ON b.code = 'MECH'
JOIN public.semesters sem ON sem.number = s.sem_num
JOIN public.schemes sc ON sc.name = '2019 Pattern'
ON CONFLICT (code, branch_id, scheme_id) DO NOTHING;

-- ---------- FE subjects for ETC ----------
INSERT INTO public.subjects (name, code, branch_id, semester_id, scheme_id)
SELECT s.name, s.code, b.id, sem.id, sc.id
FROM (VALUES
  ('Engineering Mathematics I','ETC-MTH101',1),
  ('Engineering Physics','ETC-PHY101',1),
  ('Basic Electronics Engineering','ETC-ELN101',1),
  ('Engineering Mathematics II','ETC-MTH102',2),
  ('Engineering Chemistry','ETC-CHM102',2),
  ('C Programming','ETC-CSP102',2)
) AS s(name, code, sem_num)
JOIN public.branches b ON b.code = 'ETC'
JOIN public.semesters sem ON sem.number = s.sem_num
JOIN public.schemes sc ON sc.name = '2019 Pattern'
ON CONFLICT (code, branch_id, scheme_id) DO NOTHING;

-- ---------- FE subjects for ELEC ----------
INSERT INTO public.subjects (name, code, branch_id, semester_id, scheme_id)
SELECT s.name, s.code, b.id, sem.id, sc.id
FROM (VALUES
  ('Engineering Mathematics I','ELEC-MTH101',1),
  ('Engineering Physics','ELEC-PHY101',1),
  ('Basic Electrical Engineering','ELEC-EEE101',1),
  ('Engineering Mathematics II','ELEC-MTH102',2),
  ('Engineering Chemistry','ELEC-CHM102',2),
  ('Electrical Circuits','ELEC-EC102',2)
) AS s(name, code, sem_num)
JOIN public.branches b ON b.code = 'ELEC'
JOIN public.semesters sem ON sem.number = s.sem_num
JOIN public.schemes sc ON sc.name = '2019 Pattern'
ON CONFLICT (code, branch_id, scheme_id) DO NOTHING;

-- ---------- FE subjects for CIVL ----------
INSERT INTO public.subjects (name, code, branch_id, semester_id, scheme_id)
SELECT s.name, s.code, b.id, sem.id, sc.id
FROM (VALUES
  ('Engineering Mathematics I','CIVL-MTH101',1),
  ('Engineering Physics','CIVL-PHY101',1),
  ('Basic Civil Engineering','CIVL-CVE101',1),
  ('Engineering Mathematics II','CIVL-MTH102',2),
  ('Engineering Chemistry','CIVL-CHM102',2),
  ('Engineering Mechanics','CIVL-EM102',2)
) AS s(name, code, sem_num)
JOIN public.branches b ON b.code = 'CIVL'
JOIN public.semesters sem ON sem.number = s.sem_num
JOIN public.schemes sc ON sc.name = '2019 Pattern'
ON CONFLICT (code, branch_id, scheme_id) DO NOTHING;

-- ---------- Sample FE question papers ----------
-- INFT FE papers
INSERT INTO public.question_papers (title, drive_link, exam_year, subject_id, branch_id, semester_id, scheme_id, academic_year_id)
SELECT q.title, q.drive_link, q.exam_year, subj.id, b.id, sem.id, sc.id, ay.id
FROM (VALUES
  ('Engineering Mathematics I - May 2023','https://drive.google.com/file/d/1fe_inft_mth1_may2023/view',2023,'INFT-MTH101',1,'2022-2023'),
  ('Programming and Problem Solving - May 2023','https://drive.google.com/file/d/1fe_inft_prog_may2023/view',2023,'INFT-CSP102',2,'2022-2023')
) AS q(title, drive_link, exam_year, subj_code, sem_num, ay_year)
JOIN public.branches b ON b.code = 'INFT'
JOIN public.semesters sem ON sem.number = q.sem_num
JOIN public.schemes sc ON sc.name = '2019 Pattern'
JOIN public.academic_years ay ON ay.year = q.ay_year
JOIN public.subjects subj ON subj.code = q.subj_code AND subj.branch_id = b.id AND subj.scheme_id = sc.id
ON CONFLICT DO NOTHING;

-- MECH FE papers
INSERT INTO public.question_papers (title, drive_link, exam_year, subject_id, branch_id, semester_id, scheme_id, academic_year_id)
SELECT q.title, q.drive_link, q.exam_year, subj.id, b.id, sem.id, sc.id, ay.id
FROM (VALUES
  ('Engineering Physics - May 2023','https://drive.google.com/file/d/1fe_mech_phy_may2023/view',2023,'MECH-PHY101',1,'2022-2023'),
  ('Engineering Graphics - Nov 2022','https://drive.google.com/file/d/1fe_mech_graphics_nov2022/view',2022,'MECH-EG102',2,'2022-2023')
) AS q(title, drive_link, exam_year, subj_code, sem_num, ay_year)
JOIN public.branches b ON b.code = 'MECH'
JOIN public.semesters sem ON sem.number = q.sem_num
JOIN public.schemes sc ON sc.name = '2019 Pattern'
JOIN public.academic_years ay ON ay.year = q.ay_year
JOIN public.subjects subj ON subj.code = q.subj_code AND subj.branch_id = b.id AND subj.scheme_id = sc.id
ON CONFLICT DO NOTHING;

-- ETC FE papers
INSERT INTO public.question_papers (title, drive_link, exam_year, subject_id, branch_id, semester_id, scheme_id, academic_year_id)
SELECT q.title, q.drive_link, q.exam_year, subj.id, b.id, sem.id, sc.id, ay.id
FROM (VALUES
  ('Basic Electronics Engineering - May 2023','https://drive.google.com/file/d/1fe_etc_eln_may2023/view',2023,'ETC-ELN101',1,'2022-2023'),
  ('C Programming - May 2023','https://drive.google.com/file/d/1fe_etc_cprog_may2023/view',2023,'ETC-CSP102',2,'2022-2023')
) AS q(title, drive_link, exam_year, subj_code, sem_num, ay_year)
JOIN public.branches b ON b.code = 'ETC'
JOIN public.semesters sem ON sem.number = q.sem_num
JOIN public.schemes sc ON sc.name = '2019 Pattern'
JOIN public.academic_years ay ON ay.year = q.ay_year
JOIN public.subjects subj ON subj.code = q.subj_code AND subj.branch_id = b.id AND subj.scheme_id = sc.id
ON CONFLICT DO NOTHING;

-- ELEC FE papers
INSERT INTO public.question_papers (title, drive_link, exam_year, subject_id, branch_id, semester_id, scheme_id, academic_year_id)
SELECT q.title, q.drive_link, q.exam_year, subj.id, b.id, sem.id, sc.id, ay.id
FROM (VALUES
  ('Basic Electrical Engineering - May 2023','https://drive.google.com/file/d/1fe_elec_eee_may2023/view',2023,'ELEC-EEE101',1,'2022-2023'),
  ('Electrical Circuits - Nov 2022','https://drive.google.com/file/d/1fe_elec_ec_nov2022/view',2022,'ELEC-EC102',2,'2022-2023')
) AS q(title, drive_link, exam_year, subj_code, sem_num, ay_year)
JOIN public.branches b ON b.code = 'ELEC'
JOIN public.semesters sem ON sem.number = q.sem_num
JOIN public.schemes sc ON sc.name = '2019 Pattern'
JOIN public.academic_years ay ON ay.year = q.ay_year
JOIN public.subjects subj ON subj.code = q.subj_code AND subj.branch_id = b.id AND subj.scheme_id = sc.id
ON CONFLICT DO NOTHING;

-- CIVL FE papers
INSERT INTO public.question_papers (title, drive_link, exam_year, subject_id, branch_id, semester_id, scheme_id, academic_year_id)
SELECT q.title, q.drive_link, q.exam_year, subj.id, b.id, sem.id, sc.id, ay.id
FROM (VALUES
  ('Basic Civil Engineering - May 2023','https://drive.google.com/file/d/1fe_civl_cve_may2023/view',2023,'CIVL-CVE101',1,'2022-2023'),
  ('Engineering Mechanics - Nov 2022','https://drive.google.com/file/d/1fe_civl_em_nov2022/view',2022,'CIVL-EM102',2,'2022-2023')
) AS q(title, drive_link, exam_year, subj_code, sem_num, ay_year)
JOIN public.branches b ON b.code = 'CIVL'
JOIN public.semesters sem ON sem.number = q.sem_num
JOIN public.schemes sc ON sc.name = '2019 Pattern'
JOIN public.academic_years ay ON ay.year = q.ay_year
JOIN public.subjects subj ON subj.code = q.subj_code AND subj.branch_id = b.id AND subj.scheme_id = sc.id
ON CONFLICT DO NOTHING;
