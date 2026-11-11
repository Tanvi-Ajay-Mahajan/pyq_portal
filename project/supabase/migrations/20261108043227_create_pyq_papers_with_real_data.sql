/*
# Restructure: pyq_papers table matching real data + pyq_feedback

## Overview
The real question paper data has a simpler shape than the existing schema:
- FE papers: organized by SUBJECT (no branch), patterns 2015/2019/2024
- SE/TE/BE papers: organized by BRANCH (no individual subjects), patterns 2015/2019

This migration creates a new `pyq_papers` table that matches the real data
exactly, plus a `pyq_feedback` table for ratings/reviews on these papers.

## New Table: pyq_papers
- id (uuid PK)
- year_level (FE/SE/TE/BE, NOT NULL)
- pattern (text: '2015', '2019', '2024', NOT NULL)
- branch (text, NULL for FE papers which are branch-independent)
- subject_name (text, NULL for SE/TE/BE which are branch-based)
- drive_link (text, NOT NULL)
- created_at (timestamptz)

## New Table: pyq_feedback
- id, paper_id (FK→pyq_papers CASCADE), user_id (DEFAULT auth.uid()),
  rating (1-5), comment (<=500), created_at
- UNIQUE(paper_id, user_id)

## Security
- Both tables: RLS enabled.
- pyq_papers: public read (anon + authenticated).
- pyq_feedback: public read; users modify only their own.

## Data
- FE 2015: 9 subjects
- FE 2019: 10 subjects
- FE 2024: 1 aggregate link
- SE 2015: 5 branches, SE 2019: 6 branches
- TE 2015: 5 branches, TE 2019: 6 branches
- BE 2015: 5 branches, BE 2019: 6 branches
Total: 53 papers
*/

-- ---------- pyq_papers ----------
CREATE TABLE IF NOT EXISTS public.pyq_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_level text NOT NULL CHECK (year_level IN ('FE','SE','TE','BE')),
  pattern text NOT NULL,
  branch text,
  subject_name text,
  drive_link text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pyq_papers_year ON public.pyq_papers(year_level);
CREATE INDEX IF NOT EXISTS idx_pyq_papers_branch ON public.pyq_papers(branch);
CREATE INDEX IF NOT EXISTS idx_pyq_papers_pattern ON public.pyq_papers(pattern);

ALTER TABLE public.pyq_papers ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.pyq_papers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pyq_papers TO authenticated;

DROP POLICY IF EXISTS "pyq_papers_select_all" ON public.pyq_papers;
CREATE POLICY "pyq_papers_select_all" ON public.pyq_papers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pyq_papers_insert_auth" ON public.pyq_papers;
CREATE POLICY "pyq_papers_insert_auth" ON public.pyq_papers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pyq_papers_update_auth" ON public.pyq_papers;
CREATE POLICY "pyq_papers_update_auth" ON public.pyq_papers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pyq_papers_delete_auth" ON public.pyq_papers;
CREATE POLICY "pyq_papers_delete_auth" ON public.pyq_papers FOR DELETE
  TO authenticated USING (true);

-- ---------- pyq_feedback ----------
CREATE TABLE IF NOT EXISTS public.pyq_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES public.pyq_papers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (length(comment) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pyq_feedback_unique ON public.pyq_feedback(paper_id, user_id);
CREATE INDEX IF NOT EXISTS idx_pyq_feedback_paper ON public.pyq_feedback(paper_id);

ALTER TABLE public.pyq_feedback ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pyq_feedback TO authenticated;
GRANT SELECT ON public.pyq_feedback TO anon, authenticated;

DROP POLICY IF EXISTS "pyq_fb_select_all" ON public.pyq_feedback;
CREATE POLICY "pyq_fb_select_all" ON public.pyq_feedback FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pyq_fb_insert_own" ON public.pyq_feedback;
CREATE POLICY "pyq_fb_insert_own" ON public.pyq_feedback FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pyq_fb_update_own" ON public.pyq_feedback;
CREATE POLICY "pyq_fb_update_own" ON public.pyq_feedback FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pyq_fb_delete_own" ON public.pyq_feedback;
CREATE POLICY "pyq_fb_delete_own" ON public.pyq_feedback FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ========== INSERT REAL DATA ==========

-- FE 2015 (9 subjects)
INSERT INTO public.pyq_papers (year_level, pattern, subject_name, drive_link) VALUES
  ('FE','2015','Basic Electronics Engineering','https://drive.google.com/drive/folders/12XySY50JOzJzS5nS_S6OPXjN0msBnzYF'),
  ('FE','2015','Engineering Graphics & Design','https://drive.google.com/drive/folders/1C9HJ1VQfTtlGtUhPlFzT2Z8K6on4Afx_'),
  ('FE','2015','Engineering Mechanics','https://drive.google.com/drive/folders/1TVIEGLjFGuvkDkWmLz8N-ibHXEJdC0ZW'),
  ('FE','2015','Basic Mechanical Engineering','https://drive.google.com/drive/folders/17RpbLba1lmpUCpFhtQHtJ1DcaQKR_kPv'),
  ('FE','2015','Basic Electrical Engineering','https://drive.google.com/drive/folders/1i0cpVG60qeQMzLY8S-732Dnq9wVZ48Jj'),
  ('FE','2015','Engineering Physics','https://drive.google.com/drive/folders/1C-AD9oms1KnnDz4BGRXpsM9IDzv96zDR'),
  ('FE','2015','Engineering Chemistry','https://drive.google.com/drive/folders/1c9QsHkVszRTCFD3-1dHNDm7Ja9RhK_dr'),
  ('FE','2015','Engineering Mathematics II','https://drive.google.com/drive/folders/1poVtOFiM0lOpfsEyeqc7iK_rhG-gA0gr'),
  ('FE','2015','Engineering Mathematics I','https://drive.google.com/drive/folders/1IAXuGctGEruYx_ISwdgg3WF2RDTihv0L');

-- FE 2019 (10 subjects)
INSERT INTO public.pyq_papers (year_level, pattern, subject_name, drive_link) VALUES
  ('FE','2019','Programming and Problem Solving','https://drive.google.com/drive/folders/1ePCcJ8ySJOmGnlAO3w48u8xYRvUum3bH'),
  ('FE','2019','Basic Electronics Engineering','https://drive.google.com/drive/folders/18wSo0ray2iBkk58g18zQ4B7jzH8zH6bC'),
  ('FE','2019','Engineering Graphics & Design','https://drive.google.com/drive/folders/1Is1AIcMlQ-8GxMf6LVU1KFETKYPUAl-G'),
  ('FE','2019','Engineering Mechanics','https://drive.google.com/drive/folders/1O3fh6ozTFQWQx6uxCkP5oU_oXH5h4f_d'),
  ('FE','2019','Systems in Mechanical Engineering','https://drive.google.com/drive/folders/1D-voK3nBXYQ6h0kne72TyxCZh_4EciqW'),
  ('FE','2019','Basic Electrical Engineering','https://drive.google.com/drive/folders/1__wzCaISvedG8fMvCtGcOqAnvs5CP4P_'),
  ('FE','2019','Engineering Physics','https://drive.google.com/drive/folders/1Nbs_h9HXLtLbsf2y37MkiMvWG0MpQTqS'),
  ('FE','2019','Engineering Chemistry','https://drive.google.com/drive/folders/1ClEjDZLgTLDBezdaW0waRXNP2PX-f7zh'),
  ('FE','2019','Engineering Mathematics I','https://drive.google.com/drive/folders/10gRCXAh4sTmLTybwgjUX8JkI_uCX81Bb'),
  ('FE','2019','Engineering Mathematics II','https://drive.google.com/drive/folders/1IAXuGctGEruYx_ISwdgg3WF2RDTihv0L');

-- FE 2024 (1 aggregate PDF)
INSERT INTO public.pyq_papers (year_level, pattern, subject_name, drive_link) VALUES
  ('FE','2024','All FE Papers (2024 Pattern)','http://collegecirculars.unipune.ac.in/sites/examdocs/November%20%202024/F.E%20(%202024%20PATTERN%20).pdf');

-- SE 2015 (5 branches)
INSERT INTO public.pyq_papers (year_level, pattern, branch, drive_link) VALUES
  ('SE','2015','CE','https://drive.google.com/drive/folders/1U5GSyE98gAlgmalU3msfYRia2O1vJXXB'),
  ('SE','2015','CIVIL','https://drive.google.com/drive/folders/1zvOpx6mI7IzrcwzyJIEdFcIy4jL0k1je'),
  ('SE','2015','E & TC','https://drive.google.com/drive/folders/1BYMyVAoXLtwHELJChpg2E0DyCISxQ4Vg'),
  ('SE','2015','Electrical','https://drive.google.com/drive/folders/1LZL1C3cd7HW_-LFJjhovUUTS_TAiXd_f'),
  ('SE','2015','IT','https://drive.google.com/drive/folders/1vIIs8YTAB2Z3NarT-FrhEDnT7WwUpzra');

-- SE 2019 (6 branches)
INSERT INTO public.pyq_papers (year_level, pattern, branch, drive_link) VALUES
  ('SE','2019','CE','https://drive.google.com/drive/folders/1fYPVTHH7isAj2B8dyPIACfY1PlsS54Qk'),
  ('SE','2019','CIVIL','https://drive.google.com/drive/folders/1ddYeII76yTioDloBq1oqnY2ybRFFeMKS'),
  ('SE','2019','AIDS','https://drive.google.com/drive/folders/1-w2SEeZ25Lotu8Fp-XfjAib1NDQsJjeC'),
  ('SE','2019','E & TC','https://drive.google.com/drive/folders/1znUA6j7xWA1TkVsaq44mQ0DC3A9fZqcT'),
  ('SE','2019','Electrical','https://drive.google.com/drive/folders/1HiS1SVPgwbdEqiMkH4HfwOkUlz37S1z0'),
  ('SE','2019','IT','https://drive.google.com/drive/folders/13Zo_dCjALauLbFcUjOuL3MeaMIChf_GZ');

-- TE 2015 (5 branches)
INSERT INTO public.pyq_papers (year_level, pattern, branch, drive_link) VALUES
  ('TE','2015','CE','https://drive.google.com/drive/folders/1VdW86SktSClXf4OXX5RAe18v9Nq4ftlB'),
  ('TE','2015','CIVIL','https://drive.google.com/drive/folders/1xZIyOJzOfbGM2gMQRDzKLcnuxozsFmwK'),
  ('TE','2015','E & TC','https://drive.google.com/drive/folders/1T0OiHPD3AaWms8H7exDy6rR7VxeSbkPL'),
  ('TE','2015','Electrical','https://drive.google.com/drive/folders/1MJHEnvVUhBodloNVXNfa-tO8WaEfqKer'),
  ('TE','2015','IT','https://drive.google.com/drive/folders/1n7PQw6RdyBm7ST4qCGBKPuJ7rCWZnx_4');

-- TE 2019 (6 branches)
INSERT INTO public.pyq_papers (year_level, pattern, branch, drive_link) VALUES
  ('TE','2019','CE','https://drive.google.com/drive/folders/1JcbfSbv3yUjU0WAOR5enIhSRdpbfgJcB'),
  ('TE','2019','CIVIL','https://drive.google.com/drive/folders/1w5BKzM_kRgyyLqbmeItnvJ7u7RlkQyca'),
  ('TE','2019','AIDS','https://drive.google.com/drive/folders/1M6k2J9S_MNJDSzRuyLiUjNTHAYC6t3QZ'),
  ('TE','2019','E & TC','https://drive.google.com/drive/folders/16ilHxjAW9mwz_bL9KP-HqIK_dKDR-0JM'),
  ('TE','2019','Electrical','https://drive.google.com/drive/folders/1slvcUrgObYVdrps6hH4o9qhuxNmHZYjK'),
  ('TE','2019','IT','https://drive.google.com/drive/folders/1s3pPLI-tSpYELtKBUn8yLO0iBflOuo8A');

-- BE 2015 (5 branches)
INSERT INTO public.pyq_papers (year_level, pattern, branch, drive_link) VALUES
  ('BE','2015','CE','https://drive.google.com/drive/folders/1VkYw8chtgs4nABUN3MVyl1gewB8uzvFN'),
  ('BE','2015','CIVIL','https://drive.google.com/drive/folders/1EiohKTm706mj6EHP59-K5q9HThhEpCXz'),
  ('BE','2015','E & TC','https://drive.google.com/drive/folders/1vbvZEV4y_astBYEr1UwB57m2uc4HHHs5'),
  ('BE','2015','Electrical','https://drive.google.com/drive/folders/1dPPnunzKN-uxC-BqlAT5mSpORTApwHJQ'),
  ('BE','2015','IT','https://drive.google.com/drive/folders/1CB8_sIIz6wXd7cv3ou0BJ716fxgOxKbM');

-- BE 2019 (6 branches)
INSERT INTO public.pyq_papers (year_level, pattern, branch, drive_link) VALUES
  ('BE','2019','CE','https://drive.google.com/drive/folders/1T6r518CZdIA4j96UD0bj5SdPHzw5rS1i'),
  ('BE','2019','CIVIL','https://drive.google.com/drive/folders/1ctse7DjDBwZiW5rvD8rHu4TmBrqMdVHx'),
  ('BE','2019','AIDS','https://drive.google.com/drive/folders/1WUkRXhLHHdzjPVReyUEhlfvNLrXv0aau'),
  ('BE','2019','E & TC','https://drive.google.com/drive/folders/1idRmvl7dAkrYIOoy2C_yUmbduhYizcxo'),
  ('BE','2019','Electrical','https://drive.google.com/drive/folders/1tpKv5GGH6qCBBKgMLzhTXQW9AGXKU4SA'),
  ('BE','2019','IT','https://drive.google.com/drive/folders/18Fj1Sl4JqY2qhg99WP1edUdYqfqhnCtn');
