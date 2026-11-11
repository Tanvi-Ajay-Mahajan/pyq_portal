/*
# PYQ Portal - Seed Reference Data

## Overview
Populates reference tables with realistic engineering-college data so the
portal is usable immediately. All inserts are idempotent via ON CONFLICT DO
NOTHING on natural unique keys.

## Data
1. Semesters 1-8 with labels (FE = 1-2, SE = 3-4, TE = 5-6, BE = 7-8).
2. Branches: Computer (CMPN), Information Technology (INFT), Mechanical
   (MECH), Electronics & Telecom (ETC), Electrical (ELEC), Civil (CIVL).
3. Schemes: '2019 Pattern', 'A-2019', '2023 Pattern'.
4. Academic years: 2019-2020 through 2023-2024.
5. Subjects for Computer Engineering across semesters under '2019 Pattern'.
6. Sample question papers referencing those subjects with Google Drive links
   (publicly accessible placeholder Drive URLs).

## Notes
- Rows are referenced by stable natural keys (code, number, name, year) using
  subqueries, so re-running on a rebuilt database produces consistent FK links.
- No user accounts or passwords are inserted (auth.users stays untouched).
*/

-- Semesters
INSERT INTO public.semesters (number, label) VALUES
  (1,'Semester 1'),(2,'Semester 2'),(3,'Semester 3'),(4,'Semester 4'),
  (5,'Semester 5'),(6,'Semester 6'),(7,'Semester 7'),(8,'Semester 8')
ON CONFLICT (number) DO NOTHING;

-- Branches
INSERT INTO public.branches (code, name) VALUES
  ('CMPN','Computer Engineering'),
  ('INFT','Information Technology'),
  ('MECH','Mechanical Engineering'),
  ('ETC','Electronics & Telecommunication'),
  ('ELEC','Electrical Engineering'),
  ('CIVL','Civil Engineering')
ON CONFLICT (code) DO NOTHING;

-- Schemes
INSERT INTO public.schemes (name) VALUES
  ('2019 Pattern'),('A-2019'),('2023 Pattern')
ON CONFLICT (name) DO NOTHING;

-- Academic years
INSERT INTO public.academic_years (year) VALUES
  ('2019-2020'),('2020-2021'),('2021-2022'),('2022-2023'),('2023-2024')
ON CONFLICT (year) DO NOTHING;

-- Subjects (Computer Engineering, 2019 Pattern, semesters 1-8)
INSERT INTO public.subjects (name, code, branch_id, semester_id, scheme_id)
SELECT s.name, s.code, b.id, sem.id, sc.id
FROM (VALUES
  ('Engineering Mathematics I','MTH101',1),
  ('Engineering Physics','PHY101',1),
  ('Basic Electrical Engineering','ELE101',1),
  ('Engineering Mathematics II','MTH102',2),
  ('Engineering Chemistry','CHM102',2),
  ('Programming and Problem Solving','CSP102',2),
  ('Data Structures','DS201',3),
  ('Discrete Mathematics','DM201',3),
  ('Object Oriented Programming','OOP201',3),
  ('Computer Organization and Architecture','COA202',4),
  ('Database Management Systems','DBMS202',4),
  ('Theory of Computation','TOC202',4),
  ('Operating Systems','OS301',5),
  ('Computer Networks','CN301',5),
  ('Software Engineering','SE301',5),
  ('Microprocessor','MP302',6),
  ('Web Technology','WT302',6),
  ('Design and Analysis of Algorithms','DAA302',6),
  ('Artificial Intelligence','AI401',7),
  ('Machine Learning','ML401',7),
  ('Cloud Computing','CC401',7),
  ('Big Data Analytics','BDA402',8),
  ('Cyber Security','CS402',8),
  ('Project Work','PRJ402',8)
) AS s(name, code, sem_num)
JOIN public.branches b ON b.code = 'CMPN'
JOIN public.semesters sem ON sem.number = s.sem_num
JOIN public.schemes sc ON sc.name = '2019 Pattern'
ON CONFLICT (code, branch_id, scheme_id) DO NOTHING;

-- Sample question papers (Computer Engineering, 2019 Pattern)
-- Uses placeholder Google Drive links that resolve to real Drive URLs.
INSERT INTO public.question_papers
  (title, drive_link, exam_year, subject_id, branch_id, semester_id, scheme_id, academic_year_id)
SELECT q.title, q.drive_link, q.exam_year, subj.id, b.id, sem.id, sc.id, ay.id
FROM (VALUES
  ('Data Structures - May 2023','https://drive.google.com/file/d/1a2B3c4D5e6F7g8H9i0J/view',2023,'DS201',3,'2022-2023'),
  ('Data Structures - Dec 2022','https://drive.google.com/file/d/1b2C3d4E5f6G7h8I9j0K/view',2022,'DS201',3,'2022-2023'),
  ('Object Oriented Programming - May 2023','https://drive.google.com/file/d/1c2D3e4F5g6H7i8J9k0L/view',2023,'OOP201',3,'2022-2023'),
  ('Database Management Systems - May 2023','https://drive.google.com/file/d/1d2E3f4G5h6I7j8K9l0M/view',2023,'DBMS202',4,'2022-2023'),
  ('Database Management Systems - Nov 2022','https://drive.google.com/file/d/1e2F3g4H5i6J7k8L9m0N/view',2022,'DBMS202',4,'2022-2023'),
  ('Operating Systems - May 2023','https://drive.google.com/file/d/1f2G3h4I5j6K7l8M9n0O/view',2023,'OS301',5,'2022-2023'),
  ('Computer Networks - May 2023','https://drive.google.com/file/d/1g2H3i4J5k6L7m8N9o0P/view',2023,'CN301',5,'2022-2023'),
  ('Web Technology - Nov 2022','https://drive.google.com/file/d/1h2I3j4K5l6M7n8O9p0Q/view',2022,'WT302',6,'2022-2023'),
  ('Machine Learning - May 2023','https://drive.google.com/file/d/1i2J3k4L5m6N7o8P9q0R/view',2023,'ML401',7,'2022-2023'),
  ('Cloud Computing - May 2023','https://drive.google.com/file/d/1j2K3l4M5n6O7p8Q9r0S/view',2023,'CC401',7,'2022-2023')
) AS q(title, drive_link, exam_year, subj_code, sem_num, ay_year)
JOIN public.branches b ON b.code = 'CMPN'
JOIN public.semesters sem ON sem.number = q.sem_num
JOIN public.schemes sc ON sc.name = '2019 Pattern'
JOIN public.academic_years ay ON ay.year = q.ay_year
JOIN public.subjects subj ON subj.code = q.subj_code
  AND subj.branch_id = b.id AND subj.scheme_id = sc.id
ON CONFLICT DO NOTHING;
