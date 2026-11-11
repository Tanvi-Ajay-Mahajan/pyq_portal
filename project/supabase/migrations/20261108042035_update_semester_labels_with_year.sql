-- Update semester labels to include year designations (FE/SE/TE/BE)
-- so first-year engineering is clearly identifiable in filters and UI.
UPDATE public.semesters SET label = 'FE - Semester 1' WHERE number = 1;
UPDATE public.semesters SET label = 'FE - Semester 2' WHERE number = 2;
UPDATE public.semesters SET label = 'SE - Semester 3' WHERE number = 3;
UPDATE public.semesters SET label = 'SE - Semester 4' WHERE number = 4;
UPDATE public.semesters SET label = 'TE - Semester 5' WHERE number = 5;
UPDATE public.semesters SET label = 'TE - Semester 6' WHERE number = 6;
UPDATE public.semesters SET label = 'BE - Semester 7' WHERE number = 7;
UPDATE public.semesters SET label = 'BE - Semester 8' WHERE number = 8;
