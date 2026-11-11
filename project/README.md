# PYQ Portal — Engineering Previous Year Question Paper Archive

A professional, fully-functional web application for engineering students to browse, search, and download previous year question papers (PYQs). Built with a modern React frontend and a Supabase (PostgreSQL) backend with row-level security and role-based access control.

## Features

### Student Features
- **Browse Papers** — Search and filter question papers by branch, semester, scheme, academic year, and exam year.
- **Smart Search** — Search by subject name, subject code, paper title, or branch name.
- **Google Drive Links** — Every paper links to a Google Drive document for viewing and downloading.
- **Student Dashboard** — Personalized welcome, quick stats, recently added papers, and quick actions.
- **Responsive Design** — Works seamlessly across mobile, tablet, and desktop.

### Admin Features
- **Question Paper CRUD** — Add, edit, and delete question papers with full metadata (title, Drive link, exam year, subject, branch, semester, scheme, academic year).
- **Subject Management** — Add and delete subjects, each tied to a branch, semester, and scheme.
- **Branch Management** — Add and delete engineering branches.
- **Scheme Management** — Add and delete academic schemes (e.g., 2019 Pattern).
- **Academic Year Management** — Add and delete academic years (e.g., 2023-2024).
- **Protected Admin Area** — Only users with the ADMIN role can access the admin dashboard or perform write operations.

### Authentication & Security
- **Email/Password Authentication** — Supabase Auth handles registration and login securely.
- **Role-Based Access Control** — Two roles: STUDENT (default) and ADMIN. Roles are stored server-side and enforced via database row-level security policies.
- **Protected Routes** — Frontend route guards redirect unauthenticated users to login and block students from admin pages.
- **Server-Enforced Permissions** — Even if a client bypasses the UI, the database rejects unauthorized writes via RLS policies and a `SECURITY DEFINER` helper function.
- **Session Management** — Persistent sessions with automatic token refresh and proper sign-out.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS 3 |
| Routing | React Router v6 |
| Icons | Lucide React |
| Backend / Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Security | Row-Level Security (RLS), SECURITY DEFINER functions |

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Extends `auth.users` with `full_name` and `role` (STUDENT/ADMIN). Auto-created via trigger on signup. |
| `branches` | Engineering branches (code, name). E.g., CMPN — Computer Engineering. |
| `schemes` | Academic schemes (name). E.g., 2019 Pattern. |
| `academic_years` | Academic years (year). E.g., 2022-2023. |
| `semesters` | Semester numbers 1-8 with labels. |
| `subjects` | Subjects tied to a branch + semester + scheme. Unique by (code, branch, scheme). |
| `question_papers` | PYQ records with Drive link, exam year, and foreign keys to subject/branch/semester/scheme/academic_year. |

### Security Model

- A `SECURITY DEFINER` function `is_admin(uid)` checks whether a user's profile role is ADMIN.
- All reference tables and question papers have **public SELECT** (anyone can browse) but **admin-only INSERT/UPDATE/DELETE** enforced via RLS policies that call `is_admin()`.
- `profiles` allows authenticated users to read all profiles but update only their own.
- A database trigger (`on_auth_user_created`) automatically creates a STUDENT profile row when a new user signs up.

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

The dev server starts automatically in the Bolt environment. For local development:

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Type Check

```bash
npm run typecheck
```

## Creating an Admin Account

1. Register a normal student account through the portal's Register page.
2. In the Supabase dashboard (SQL Editor), promote the user to admin:

```sql
UPDATE public.profiles
SET role = 'ADMIN'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

Only admin accounts can add, edit, or delete question papers and manage reference data.

## Seeded Data

The portal comes pre-loaded with:
- 6 engineering branches (Computer, IT, Mechanical, E&TC, Electrical, Civil)
- 3 academic schemes (2019 Pattern, A-2019, 2023 Pattern)
- 5 academic years (2019-2020 through 2023-2024)
- 8 semesters
- 24 Computer Engineering subjects across all 8 semesters
- 10 sample question papers with Google Drive links

## Project Structure

```
src/
├── components/
│   ├── Footer.tsx          # Site footer
│   ├── Navbar.tsx          # Top navigation with auth-aware links
│   └── ProtectedRoute.tsx  # Route guard for authenticated/admin areas
├── context/
│   ├── AuthContext.tsx     # Auth state provider (session, profile, role)
│   └── ToastContext.tsx    # Toast notification system
├── hooks/
│   └── useReferenceData.ts # Loads and caches branches/schemes/years/semesters
├── lib/
│   └── supabaseClient.ts   # Supabase client singleton
├── pages/
│   ├── Home.tsx            # Landing page with hero, stats, features
│   ├── Browse.tsx          # Paper browsing with filters and search
│   ├── Login.tsx           # Sign-in page
│   ├── Register.tsx        # Student registration page
│   ├── Dashboard.tsx       # Student dashboard (protected)
│   └── Admin.tsx           # Admin CRUD dashboard (admin-only)
├── types/
│   └── index.ts            # TypeScript type definitions
├── App.tsx                 # Router and provider setup
├── main.tsx                # App entry point
└── index.css               # Tailwind + custom styles
supabase/
└── migrations/
    ├── ...create_pyq_portal_schema.sql   # Schema + RLS + trigger
    └── ...seed_pyq_reference_data.sql     # Seed data
```

## API Surface (via Supabase Data API)

The frontend communicates with Supabase's auto-generated REST API. Key operations:

| Operation | Table | Access |
|-----------|-------|--------|
| Browse papers | `question_papers` (with joins) | Public |
| Filter papers | `question_papers` (`.eq()` chain) | Public |
| Sign up | `auth.users` (via `supabase.auth.signUp`) | Public |
| Sign in | `auth.users` (via `supabase.auth.signInWithPassword`) | Public |
| Add paper | `question_papers` (INSERT) | Admin only |
| Edit paper | `question_papers` (UPDATE) | Admin only |
| Delete paper | `question_papers` (DELETE) | Admin only |
| Manage subjects | `subjects` (INSERT/DELETE) | Admin only |
| Manage branches/schemes/years | respective tables | Admin only |

## License

This project is built for educational and portfolio purposes.
