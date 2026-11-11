/*
# PYQ Portal - Core Schema

## Overview
Creates the relational schema for a Previous Year Question Paper (PYQ) portal
for engineering students. Supports FE/SE/TE/BE question papers organized by
scheme, academic year, branch, semester, and subject. Includes student/admin
authentication with role-based access control.

## Tables
- profiles: extends auth.users with role (STUDENT/ADMIN) + full_name.
- branches: engineering branches (code, name).
- schemes: academic schemes (name).
- academic_years: academic years (year).
- semesters: semester numbers 1-8 (number, label).
- subjects: subjects tied to branch + semester + scheme.
- question_papers: PYQ records with Google Drive link, exam_year, and FKs.

## Security (RLS)
- profiles: authenticated read all; users update only own. Signup creates row
  via trigger.
- reference tables + subjects + question_papers: public SELECT (anon +
  authenticated); admin-only INSERT/UPDATE/DELETE enforced via is_admin().
- is_admin(uid) is a SECURITY DEFINER helper that checks profile role = ADMIN.

## Notes
1. Trigger auto-creates a profiles row (role STUDENT) on auth.users INSERT.
2. Reference tables use natural unique keys for idempotent seeding.
*/

-- ---------- profiles (must exist before is_admin references it) ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT','ADMIN')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_all_authenticated"
ON public.profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------- Helper: is_admin ----------
CREATE OR REPLACE FUNCTION public.is_admin(check_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_uid AND role = 'ADMIN'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- ---------- branches ----------
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.branches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.branches TO authenticated;

DROP POLICY IF EXISTS "branches_select_public" ON public.branches;
CREATE POLICY "branches_select_public"
ON public.branches FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "branches_admin_insert" ON public.branches;
CREATE POLICY "branches_admin_insert"
ON public.branches FOR INSERT
TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "branches_admin_update" ON public.branches;
CREATE POLICY "branches_admin_update"
ON public.branches FOR UPDATE
TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "branches_admin_delete" ON public.branches;
CREATE POLICY "branches_admin_delete"
ON public.branches FOR DELETE
TO authenticated USING (public.is_admin(auth.uid()));

-- ---------- schemes ----------
CREATE TABLE IF NOT EXISTS public.schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schemes ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.schemes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.schemes TO authenticated;

DROP POLICY IF EXISTS "schemes_select_public" ON public.schemes;
CREATE POLICY "schemes_select_public"
ON public.schemes FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "schemes_admin_insert" ON public.schemes;
CREATE POLICY "schemes_admin_insert"
ON public.schemes FOR INSERT
TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "schemes_admin_update" ON public.schemes;
CREATE POLICY "schemes_admin_update"
ON public.schemes FOR UPDATE
TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "schemes_admin_delete" ON public.schemes;
CREATE POLICY "schemes_admin_delete"
ON public.schemes FOR DELETE
TO authenticated USING (public.is_admin(auth.uid()));

-- ---------- academic_years ----------
CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.academic_years TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.academic_years TO authenticated;

DROP POLICY IF EXISTS "academic_years_select_public" ON public.academic_years;
CREATE POLICY "academic_years_select_public"
ON public.academic_years FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "academic_years_admin_insert" ON public.academic_years;
CREATE POLICY "academic_years_admin_insert"
ON public.academic_years FOR INSERT
TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "academic_years_admin_update" ON public.academic_years;
CREATE POLICY "academic_years_admin_update"
ON public.academic_years FOR UPDATE
TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "academic_years_admin_delete" ON public.academic_years;
CREATE POLICY "academic_years_admin_delete"
ON public.academic_years FOR DELETE
TO authenticated USING (public.is_admin(auth.uid()));

-- ---------- semesters ----------
CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number int UNIQUE NOT NULL CHECK (number BETWEEN 1 AND 8),
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.semesters TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.semesters TO authenticated;

DROP POLICY IF EXISTS "semesters_select_public" ON public.semesters;
CREATE POLICY "semesters_select_public"
ON public.semesters FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "semesters_admin_insert" ON public.semesters;
CREATE POLICY "semesters_admin_insert"
ON public.semesters FOR INSERT
TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "semesters_admin_update" ON public.semesters;
CREATE POLICY "semesters_admin_update"
ON public.semesters FOR UPDATE
TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "semesters_admin_delete" ON public.semesters;
CREATE POLICY "semesters_admin_delete"
ON public.semesters FOR DELETE
TO authenticated USING (public.is_admin(auth.uid()));

-- ---------- subjects ----------
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  semester_id uuid NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
  scheme_id uuid NOT NULL REFERENCES public.schemes(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, branch_id, scheme_id)
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.subjects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subjects TO authenticated;

DROP POLICY IF EXISTS "subjects_select_public" ON public.subjects;
CREATE POLICY "subjects_select_public"
ON public.subjects FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "subjects_admin_insert" ON public.subjects;
CREATE POLICY "subjects_admin_insert"
ON public.subjects FOR INSERT
TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "subjects_admin_update" ON public.subjects;
CREATE POLICY "subjects_admin_update"
ON public.subjects FOR UPDATE
TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "subjects_admin_delete" ON public.subjects;
CREATE POLICY "subjects_admin_delete"
ON public.subjects FOR DELETE
TO authenticated USING (public.is_admin(auth.uid()));

-- ---------- question_papers ----------
CREATE TABLE IF NOT EXISTS public.question_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  drive_link text NOT NULL,
  exam_year int NOT NULL CHECK (exam_year BETWEEN 2000 AND 2100),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  semester_id uuid NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
  scheme_id uuid NOT NULL REFERENCES public.schemes(id) ON DELETE RESTRICT,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qp_subject ON public.question_papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_qp_branch_semester ON public.question_papers(branch_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_qp_academic_year ON public.question_papers(academic_year_id);

ALTER TABLE public.question_papers ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.question_papers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.question_papers TO authenticated;

DROP POLICY IF EXISTS "qp_select_public" ON public.question_papers;
CREATE POLICY "qp_select_public"
ON public.question_papers FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "qp_admin_insert" ON public.question_papers;
CREATE POLICY "qp_admin_insert"
ON public.question_papers FOR INSERT
TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "qp_admin_update" ON public.question_papers;
CREATE POLICY "qp_admin_update"
ON public.question_papers FOR UPDATE
TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "qp_admin_delete" ON public.question_papers;
CREATE POLICY "qp_admin_delete"
ON public.question_papers FOR DELETE
TO authenticated USING (public.is_admin(auth.uid()));

-- ---------- Trigger: auto-create profile on signup ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'STUDENT'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
