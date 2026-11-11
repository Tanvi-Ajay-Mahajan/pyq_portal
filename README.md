# PYQ Portal — MERN Stack

A Previous Year Question Paper (PYQ) portal for engineering students, converted from
Supabase/PostgreSQL to a genuine MERN stack:

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + React Router + Axios |
| Backend | Node.js + Express 4 (REST API, MVC) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` password hashing, `user`/`admin` roles |
| Database | MongoDB + Mongoose |
| Documents | Google Drive folders, resolved from MongoDB at click time |

The existing UI, theme, responsive layout and features are preserved — only the data
layer changed.

```
PYQ-Portal/
  client/                 React + TypeScript + Vite frontend
    src/
      components/         UI building blocks (Navbar, PaperCard, PaperFeedback, ...)
      pages/              Home, Browse, Dashboard, Admin, Login, Register, ...
      services/           Axios API services (auth, papers, feedback, drive, admin)
      hooks/              useReferenceData
      context/            AuthContext (JWT session)
      lib/                api client, branch Drive link helper
      types/              shared TypeScript types
    .env.example
  server/                 Express + Mongoose REST API
    config/               env.js, db.js
    models/               User, Paper, Feedback, DriveFolder, Branch, Subject, ...
    controllers/          business logic
    routes/               route definitions
    middleware/           auth (protect/adminOnly), validation, error handler
    utils/                ApiError, asyncHandler, token, serialize, constants
    scripts/              seed.js, import.js, export-supabase.js
    tests/                api.test.js (end-to-end against a real MongoDB)
    server.js
    .env.example
  Dockerfile              Single-service image: builds client, serves API + static UI
```

---

## 1. Prerequisites

- Node.js 20 or newer
- MongoDB running locally **or** a MongoDB Atlas connection string
- npm

---

## 2. Windows setup (exact commands)

Open **Command Prompt** (or PowerShell) in the project root.

### Backend

```bat
cd server
copy .env.example .env
npm install
```

Edit `server\.env` and fill in at minimum:

```ini
MONGODB_URI=mongodb://127.0.0.1:27017/pyq_portal
JWT_SECRET=<paste a long random string>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourStrongPassword123
```

Generate a JWT secret:

```bat
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Create the reference data (branches, subjects, patterns, semester options, the four
branch Google Drive folders) and the first admin account:

```bat
npm run seed
```

Start the API:

```bat
npm run dev
```

The API listens on `http://localhost:3000` (`GET http://localhost:3000/api/health`).

### Frontend

In a **second** terminal:

```bat
cd client
copy .env.example .env
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The dev server proxies
`/api` to `http://localhost:3000`, so the default `VITE_API_URL=/api` works with no
extra configuration.

> PowerShell users can use `Copy-Item .env.example .env` instead of `copy`.

### Production-style single service

```bat
cd client
npm run build
cd ..\server
npm start
```

`server/server.js` serves `client/dist` when it exists, so both the UI and the API are
available on port 3000.

---

## 3. Environment variables

`server/.env` (see `server/.env.example`):

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB / Atlas connection string |
| `MONGODB_DB_NAME` | no | Database name override |
| `JWT_SECRET` | yes in production | Signs JWTs; a random per-process secret is used if unset (sessions then reset on restart) |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `7d` |
| `BCRYPT_ROUNDS` | no | Password hash cost, default `10` |
| `PORT` | no | API port, default `3000` |
| `CLIENT_ORIGIN` | production | Comma-separated allowed browser origins |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed only | First administrator created by `npm run seed` |
| `SEED_ON_START` | no | `true` seeds reference data when the server boots |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | one-time only | Used **only** by `scripts/export-supabase.js` to export old data |

`client/.env` (see `client/.env.example`):

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL. `/api` for the single-service build; `http://localhost:3000/api` if you call the API directly |

`.env` files are git-ignored. Never commit real credentials or the JWT secret.

---

## 4. MongoDB collections

Mongoose models (collection names are the pluralized model names):

| Collection | Fields |
| --- | --- |
| `users` | `name`, `email` (unique), `password` (bcrypt hash), `role` (`user` \| `admin`), `createdAt` |
| `papers` | `year_level` (`FE`/`SE`/`TE`/`BE`), `semester`, `pattern`, `branch`, `subject_name`, `category` (`PYQ`/`Notes`/`Practical`/`Syllabus`), `drive_link`, `createdAt` |
| `feedbacks` | `user_id`, `user_name`, `rating` (1–5), `comment`, `createdAt` |
| `drivefolders` | `year_level`, `branch`, `pattern`, `drive_link`, `label`, `is_default` |
| `branches` | branch name, short code and aliases (`CE`, `COMPUTER`, …) |
| `subjects` | subject name, branch, year level, semester |
| `schemes`, `academicyears` | pattern/academic-year reference data |

Plain-text passwords are never stored: `User` hashes with bcrypt before save, and
`password` is never returned by the API.

---

## 5. REST API

Base URL: `/api`. Protected routes need `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | Create an account, returns `{ token, user }` |
| POST | `/auth/login` | public | Email + password login, returns `{ token, user }` |
| GET | `/auth/me` | user | Current profile from the JWT |
| POST | `/auth/logout` | public | Client-side token discard acknowledgement |

### Papers (PYQ / Notes / Practical / Syllabus)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/papers` | public | List with `year_level`, `semester`, `branch`, `pattern`, `category`, `subject`, `search`, `page`, `limit` |
| GET | `/papers/stats` | public | Counts per year/category/branch |
| GET | `/papers/:id` | public | Single paper |
| GET | `/papers/:id/feedback` | public | Feedback + average rating for a paper |
| POST | `/papers` | admin | Create paper |
| PUT | `/papers/:id` | admin | Update paper (including `drive_link`) |
| DELETE | `/papers/:id` | admin | Delete paper |

### Google Drive folders (branch clicks)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/drive-folders` | public | List folders, filter by `year_level` / `branch` |
| GET | `/drive-folders/resolve` | public | **Resolve the link for a branch click** — query `year_level`, `branch`, optional `pattern` |
| POST | `/drive-folders` | admin | Add/update a Drive folder link |
| PUT | `/drive-folders/:id` | admin | Update a Drive folder link |
| DELETE | `/drive-folders/:id` | admin | Delete a Drive folder link |

Resolution order (no hardcoded URLs in the frontend):

1. Exact year + branch + pattern (when a pattern is requested)
2. Branch-wide entry (`year_level: 'ALL'`) with that pattern
3. Exact year + branch, newest pattern first
4. Branch-wide newest pattern
5. Any alias match, else `404` with a clear message

Branch names match through their alias key, so `CE` and `COMPUTER` resolve to the same
branch. The browser tab is opened synchronously on click and then navigated once the API
answers, which avoids popup blocking.

### Feedback

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/feedback/recent` | public | Recent feedback + overall average |
| GET | `/feedback/mine` | user | Feedback written by the current user |
| POST | `/feedback` | user | Submit a rating (1–5) and comment |
| PUT | `/feedback/:id` | owner/admin | Update own feedback |
| DELETE | `/feedback/:id` | owner/admin | Delete own feedback |

### Reference data

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/reference` | public | All reference data in one payload |
| GET/POST/PUT/DELETE | `/reference/branches[/:id]` | read public, write admin | Branch management |
| GET/POST/PUT/DELETE | `/reference/subjects[/:id]` | read public, write admin | Subject management |
| GET/POST/PUT/DELETE | `/reference/schemes[/:id]` | read public, write admin | Pattern/scheme management |
| GET/POST/DELETE | `/reference/academic-years[/:id]` | read public, write admin | Academic years |
| GET | `/reference/semesters` | public | Semester options |

### Users (admin dashboard)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/users` | admin | Registered users |
| PATCH | `/users/:id` | admin | Change role |
| DELETE | `/users/:id` | admin | Remove a user |

### Status codes

`200` OK · `201` created · `400` validation error · `401` missing/invalid token ·
`403` not an admin/owner · `404` not found · `409` duplicate email · `503` database not
configured.

---

## 6. Data migration from the previous Supabase database

Nothing is invented: if credentials are unavailable, use the import script with an
exported file.

**Option A — direct export (requires old Supabase access):**

```bat
cd server
set SUPABASE_URL=https://<project>.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
npm run export:supabase
```

This writes `server/scripts/data/supabase-export.json` (papers, Drive links, feedback).

**Option B — import a JSON or CSV file you exported manually:**

```bat
cd server
npm run import -- --file path\to\export.json
npm run import -- --file path\to\papers.csv
```

The import script upserts papers and Drive folder links, preserving year, semester,
pattern, branch, subject name and the original Google Drive URLs. It never imports
plain-text passwords.

**Verify the migration:**

```bat
cd server
node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{const c=m.connection.db.collection('papers');console.log('papers:',await c.countDocuments());console.log(await c.find().limit(3).toArray());process.exit(0)})"
```

The Supabase integration is only used by that one-off export script; the application
itself never calls Supabase.

---

## 7. Tests

The API test suite runs the real Express app against a real MongoDB instance:

```bat
cd server
npm test
```

Covered: seeded records and Drive folders, registration + JWT login, duplicate email,
wrong password, protected `/auth/me`, admin-only paper CRUD, branch Drive-link resolution
(exact pattern, latest pattern, alias branch, missing link), feedback submission and
average rating, and admin-only user listing.

Frontend checks:

```bat
cd client
npm run typecheck
npm run build
```

---

## 8. Deployment

The Dockerfile builds the client and serves the API plus the static UI from one
container on `PORT=3000` (`0.0.0.0`).

Set these environment variables in the hosting settings before expecting data to load:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string |
| `CLIENT_ORIGIN` | Your deployed URL (optional when same-origin) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin account for the dashboard |
| `SEED_ON_START` | `true` on the first boot to seed reference data and the admin user |

Without `MONGODB_URI` the UI still loads, and the API answers `503` with a clear message
instead of pretending the data exists.

---

## 9. Security notes

- Passwords are hashed with bcrypt; hashes are never serialized to clients.
- JWTs are verified by `middleware/auth.js`; admin routes require the `admin` role.
- All request bodies are validated with `express-validator` before reaching controllers.
- Admin-only endpoints (`POST/PUT/DELETE` on papers, Drive folders, reference data,
  users) return `403` for normal users.
- CORS is restricted to `CLIENT_ORIGIN` when configured.
- Secrets live only in environment variables; `.env` files are git-ignored.
- Feedback updates/deletes are limited to the author or an admin.
