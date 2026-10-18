# Ironwork: Online Gym Management System

A full-stack gym management app with a staff area and a member area.

- **Frontend:** React 18, React Router 6, Tailwind CSS 3, Vite
- **Backend:** Node.js, Express 4 (REST API)
- **Database:** PostgreSQL with Prisma ORM (migrations and seed script included)
- **Auth:** JWT, passwords hashed with bcrypt, role-based access (`ADMIN`, `MEMBER`)
- **Tests:** Jest and Supertest (run against a separate test database)

## Features

| Area | What it does |
|---|---|
| Public site | Landing page, live membership plans from the API, register and sign in |
| Member area | Dashboard (days left, visits, trainer), profile and body information, plan requests, payment history, assigned workouts, check-in and check-out, change password |
| Staff area | Overview dashboard, members (search, filter, create, edit, deactivate, delete), member detail (body information, trainer assignment, workout assignment), memberships, payments, attendance, trainers, plans, exercise library, workout plan builder |
| Quality | Server-side validation (zod), client-side validation, loading states, error messages, pagination |

### Business rules

- A member can have only one **ACTIVE** membership at a time.
- A member's plan request is created as **PENDING**. Recording a payment linked to it activates it (the period starts that day).
- Memberships past their end date are marked **EXPIRED** automatically whenever they are read.
- Check-in needs an active membership and no open visit. Check-out closes the open visit.
- Plans, exercises or trainers cannot be deleted while other records depend on them (plans with memberships, exercises used in workouts). Deactivate plans instead.
- Anyone can register, but only as `MEMBER`. The first `ADMIN` is created by the seed script.

## Requirements (Windows)

1. **Node.js 20 or newer** (LTS): https://nodejs.org
2. **PostgreSQL 14 or newer**: https://www.postgresql.org/download/windows/
   During installation, remember the password you set for the `postgres` user. Keep the default port `5432`.

Check your tools in PowerShell:

```powershell
node --version
npm --version
```

## 1. Create the databases

Create two empty databases: `gymdb` (the app) and `gymdb_test` (used only by the tests, which wipe it).

**Option A: pgAdmin** (installed with PostgreSQL): right-click *Databases*, choose *Create > Database*, and create both.

**Option B: psql** (adjust the version folder, for example `16`):

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE gymdb;"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE gymdb_test;"
```

## 2. Install and configure

From the project folder (the one containing this README):

```powershell
cd online-gym-management-v2
npm run install:all

copy server\.env.example server\.env
copy server\.env.test.example server\.env.test
copy client\.env.example client\.env
```

Edit **`server\.env`** (Notepad or VS Code) and set:

| Variable | What to put |
|---|---|
| `DATABASE_URL` | Replace `YOUR_PASSWORD` with your `postgres` password. If the password has special characters (`@ : / # ?`), URL-encode them (for example `@` becomes `%40`). |
| `JWT_SECRET` | A long random string. Generate one with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | The administrator login the seed script creates. Password: at least 8 characters with a letter and a number. |
| `SEED_DEMO_DATA` | `true` to also create 3 demo members, or `false` for an empty gym. |
| `SEED_DEMO_PASSWORD` | Password for the demo members (same rules as above). Only needed if demo data is on. |

The seed script refuses to run with the placeholder passwords, so nothing is ever created with a default secret.

Edit **`server\.env.test`**: replace `YOUR_PASSWORD` in `DATABASE_URL` (keep the database name `gymdb_test`).

## 3. Create the tables and seed data

```powershell
npm run db:migrate
npm run db:seed
```

`db:seed` is safe to run more than once. It creates the admin account, three plans (Monthly, Quarterly, Annual), three trainers, twelve exercises, two workout plans and, if enabled, demo members (`aarav@example.com`, `diya@example.com`, `kabir@example.com`).

## 4. Run the app

```powershell
npm run dev
```

- Website: http://localhost:5173
- API health check: http://localhost:5000/api/health

Sign in at `/login` with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you chose for the staff area. Members can register themselves, or use the demo accounts with `SEED_DEMO_PASSWORD`.

To run the two parts separately: `npm --prefix server run dev` and `npm --prefix client run dev`.

## 5. Run the tests

The tests use the separate `gymdb_test` database and refuse to run against any database whose name does not contain `test`.

```powershell
npm run db:test:migrate
npm test
```

The suites cover registration, login, token handling, role-based access (401/403), and CRUD for plans, trainers, members, memberships, payments, attendance, exercises and workout plans, plus the member self-service flow.

## 6. Production build of the frontend

```powershell
npm run build
```

The output is written to `client\dist`. In production, serve it from a static host and set `VITE_API_URL` in `client\.env` to your API address (and `CLIENT_ORIGIN` in the server `.env` to the site address).

## Project structure

```
online-gym-management-v2/
  package.json            root scripts (install:all, dev, db:*, test, build)
  server/
    prisma/               schema.prisma, migrations/, seed.js
    src/
      app.js, server.js
      config/env.js       environment loading and checks
      middleware/         auth (JWT, roles), validate (zod), errorHandler
      validators/         zod schemas for every endpoint
      services/           membership and attendance rules
      routes/             auth, plans, members, trainers, memberships, payments,
                          attendance, exercises, workouts, me, dashboard
    tests/                Jest + Supertest suites
  client/
    src/
      api/                axios instance, error helper
      context/            AuthContext
      hooks/              useApi
      components/         UI kit, CrudPage, DashboardLayout, ProfileForm
      pages/              public, auth, admin, member
```

## API overview

All endpoints are under `/api`. Protected routes need `Authorization: Bearer <token>`. List endpoints accept `page`, `pageSize` (max 100) and return `{ data, meta }`.

| Endpoint | Access |
|---|---|
| `POST /auth/register`, `POST /auth/login` | public |
| `GET /auth/me`, `PUT /auth/password` | signed in |
| `GET /plans` | public (non-admins see active plans only) |
| `POST/PUT/DELETE /plans` | admin |
| `/members`, `/members/:id`, `/members/:id/profile`, `/members/:id/trainer` | admin |
| `/trainers`, `/memberships`, `/memberships/:id/status`, `/payments`, `/attendance`, `/attendance/check-in`, `/attendance/:id/check-out` | admin |
| `GET /exercises` | signed in |
| `POST/PUT/DELETE /exercises`, `/workouts`, `/workouts/:id/assign` | admin |
| `/me/profile`, `/me/trainer`, `/me/memberships`, `/me/payments`, `/me/attendance`, `/me/attendance/check-in`, `/me/attendance/check-out`, `/me/workouts` | member |
| `GET /dashboard/admin`, `GET /dashboard/member` | admin, member |

## Troubleshooting

| Problem | Fix |
|---|---|
| `Missing environment variable DATABASE_URL` | You have not created `server\.env` (step 2). |
| `P1000` / authentication failed | Wrong password in `DATABASE_URL`, or special characters not URL-encoded. |
| `P1001` can't reach database | PostgreSQL service is not running (check *Services* for `postgresql-x64-16`), or the port is not 5432. |
| `P3009` / migration errors on a fresh database | Run `npm --prefix server run db:push` to create the tables directly from `schema.prisma`, then `npm run db:seed`. |
| `EPERM` while running `prisma generate` | Stop `npm run dev` (it locks the Prisma engine file), then run `npm --prefix server install` again. |
| Seed says a password must contain a letter and a number | Edit `ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD` in `server\.env`. |
| `Refusing to reset database` when testing | `server\.env.test` must point to a database whose name contains `test`. |
| Port 5000 or 5173 already in use | Change `PORT` in `server\.env` (and the proxy target in `client\vite.config.js`), or close the other program. |

## Known limitations

- Payments are manual records entered by staff. There is no online payment gateway.
- Trainers are records managed by staff. They do not have their own login.
- Members request a plan online; staff record the payment and activation. There is no automatic renewal.
- A visit that is never checked out stays open until staff or the member closes it.
- Times use the server's time zone for "today" and "this month" statistics.
- No email notifications or password reset by email.
