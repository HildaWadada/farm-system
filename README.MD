# Cliff's Farm — Farm Management Platform

A simple system built around one idea: the supervisor logs everything that happens in the field, and the owner sees it instantly. One activity feed solves both the communication problem (issues become alerts immediately) and the sales problem (harvests become live stock, orders sell against it).

**Live:**
- Frontend: https://cliffs-farm.vercel.app
- Backend API: https://farm-system-backend.onrender.com (see `/docs` for all endpoints)

## Who uses this

| Role | Who | What they can do |
|---|---|---|
| Supervisor | On-site, has the smartphone | Logs every activity, adds workers, adds buyers, logs orders, resolves alerts |
| Owner | Remote | Views everything on a read-only dashboard, except managing user accounts |

There is no public sign-up. Only two accounts exist, created once via `seed.py`.

## Tech stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS — deployed on Vercel
- **Backend:** FastAPI + SQLAlchemy — deployed on Render
- **Database:** PostgreSQL — hosted on Neon
- **Email:** Resend (password reset emails)

## Project structure

```
farm_system/
├── backend/
│   ├── app/
│   │   ├── main.py          — all API routes
│   │   ├── models.py        — database tables (SQLAlchemy)
│   │   ├── schemas.py       — request/response shapes (Pydantic)
│   │   ├── auth.py          — login, JWT, password hashing
│   │   ├── config.py        — reads .env
│   │   └── database.py      — DB connection
│   ├── schema.sql           — full database schema (fresh installs)
│   ├── migration_add_workers.sql
│   ├── seed.py               — creates the owner + supervisor accounts
│   ├── requirements.txt
│   ├── runtime.txt           — pins Python version for Render
│   └── .env                  — your local secrets (never commit this)
└── frontend/
    ├── app/
    │   ├── login/             — sign in
    │   ├── change-password/   — forced on first login
    │   ├── settings/password/ — change password any time
    │   ├── forgot-password/   — request a reset email
    │   ├── reset-password/    — set new password via emailed link
    │   ├── home/              — supervisor's dashboard/landing page
    │   ├── entry/              — new field entry form (supports photo attachment on issues)
    │   ├── activity/           — full live activity feed with filters
    │   ├── workers/            — worker list, add worker, worker profile (/workers/[id])
    │   ├── alerts/             — safety alerts, resolve issues
    │   ├── buyers/             — buyer contacts
    │   ├── orders/             — log sales, view live stock, order history
    │   └── dashboard/          — owner's read-only overview (KPIs, alerts, stock, recent orders)
    ├── components/
    │   ├── CountUp.tsx         — animated number count-up, used across dashboards
    │   └── CustomSelect.tsx    — styled dropdown (replaces native <select>)
    └── lib/
        ├── api.ts              — all backend calls
        └── useRequireAuth.ts   — page access control
```

## First-time setup (local development)

### 1. Database

```
createdb -U postgres farm_system
psql -U postgres -d farm_system -f schema.sql
```

### 2. Backend

```
cd backend
python -m venv .venv
source .venv/Scripts/activate      # Windows Git Bash
pip install -r requirements.txt
```

Create `.env` in `backend/` (copy `.env.example` and fill in real values — `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, owner/supervisor seed values).

```
python seed.py
```

Start the API:

```
uvicorn app.main:app --reload
```

Runs at `http://127.0.0.1:8000`. Visit `/docs` to see all endpoints.

### 3. Frontend

```
cd frontend
npm install
```

Create `.env.local` in `frontend/`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start it:

```
npm run dev
```

Runs at `http://localhost:3000`.

### 4. Log in

Go to `http://localhost:3000/login` and sign in with the supervisor's email and temp password. First login forces a password change, then lands on the supervisor's home dashboard.

## Deployment

### Database — Neon
Free Postgres. Connection string goes into `DATABASE_URL` wherever the backend runs. Requires `?sslmode=require` on the connection string.

### Backend — Render
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (no `--reload` in production)
- Python version pinned via `runtime.txt` (`python-3.11.9`) and/or the `PYTHON_VERSION` environment variable — Render's default Python (3.14 at time of writing) doesn't have a pre-built wheel for `pydantic-core`, so it tries to compile from source and fails on Render's read-only build filesystem.
- Environment variables: all values from `.env.example` (`DATABASE_URL`, `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `OWNER_*`, `SUPERVISOR_*`, `RESEND_API_KEY`)
- Free tier spins down after ~15 min idle — first request after a quiet period takes 30–50s to wake up.

### Frontend — Vercel
- Root directory: `frontend`
- Environment variable: `NEXT_PUBLIC_API_URL` set to the Render backend URL
- Subdomain is editable under Project Settings → Domains

### After both are deployed
Add the live Vercel URL to the backend's CORS allowed origins (in `main.py`) and redeploy the backend — otherwise the browser blocks requests from the deployed frontend to the deployed backend.

## Features

**Home dashboard (supervisor)** — greeting, today's entry count, active alert count, quick access to every section below.

**Owner dashboard (`/dashboard`)** — read-only overview: active orders, live stock (kg), pending orders, active workers, critical alerts, stock by crop, recent orders with PDF export.

**New entry** — pick crop + activity (spray, weed, irrigate, fertilize, harvest, issue). Harvest asks for quantity in kg (feeds live stock). Issue asks for a description and optionally a photo (auto-creates an alert). Optionally attach a worker — saved workers appear in a dropdown so their details are never re-typed.

**Activity feed (`/activity`)** — full log, grouped by day, filterable by crop and activity type, auto-refreshes every 15 seconds.

**Workers (`/workers`)** — add a worker once (name, phone, role). Tap into any worker to see their full activity history — this is their "tracking page."

**Safety alerts (`/alerts`)** — every issue entry becomes an alert here automatically. Supervisor can mark resolved.

**Buyers (`/buyers`)** — passive contact records (name, phone). Buyers never log into the system themselves.

**Orders (`/orders`)** — shows live stock available per crop (harvested − sold). Log a sale against a buyer; mark it paid or cancelled later.

**Password reset** — supervisor or owner can request a reset email (via Resend) from the login screen, or change their password any time from account settings.

## Known limitations (by design, for now)

- "Pending sync" on the home dashboard is a placeholder (always 0) — there's no offline mode built yet, so this number isn't live.
- Activity feed shows the latest 50 entries only — fine for now, but will need pagination once activity volume grows.
- Orders don't hard-block overselling past live stock — it's shown as a number, but the supervisor can still log a sale beyond it; this was a deliberate judgment-call decision, not a bug.
- Resend's free tier only delivers to the email address used to sign up for Resend, since no domain is verified yet — password reset emails work for testing but not yet for arbitrary real addresses. Verifying a domain (~$10/year + DNS records) removes this limit.

## Not yet built

- "Manage users" screen for the owner (currently accounts can only be created via `seed.py`)

## Useful commands

Check the database directly:

```
psql -U postgres -d farm_system
\dt                          -- list tables
SELECT * FROM live_stock;    -- current stock per crop
```

If bcrypt throws a version error when seeding:

```
pip install "bcrypt==4.0.1"
```

If you're on Windows and `npm install` keeps failing with "Device or resource busy": your project is probably syncing live with OneDrive, which locks files mid-install. Move the project folder outside any OneDrive-synced directory and reinstall from there.
