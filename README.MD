# Cliff's Farm — Farm Management Platform

A simple system built around one idea: **the supervisor logs everything that happens in the field, and the owner sees it instantly.** One activity feed solves both the communication problem (issues become alerts immediately) and the sales problem (harvests become live stock, orders sell against it).

---

## Who uses this

| Role | Who | What they can do |
|---|---|---|
| **Supervisor** | On-site, has the smartphone | Logs every activity, adds workers, adds buyers, logs orders, resolves alerts |
| **Owner** | Remote | Views everything — read-only, except managing user accounts |

There is **no public sign-up**. Only two accounts exist, created once via `seed.py`.

---

## Tech stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** FastAPI + SQLAlchemy
- **Database:** PostgreSQL

---

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
│   └── .env                  — your local secrets (never commit this)
└── frontend/
    ├── app/
    │   ├── login/             — sign in
    │   ├── change-password/   — forced on first login
    │   ├── settings/password/ — change password any time
    │   ├── home/              — supervisor's dashboard/landing page
    │   ├── entry/              — new field entry form + recent entries
    │   ├── activity/           — full live activity feed with filters
    │   ├── workers/            — worker list, add worker, worker profile (/workers/[id])
    │   ├── alerts/             — safety alerts, resolve issues
    │   ├── buyers/             — buyer contacts
    │   └── orders/             — log sales, view live stock, order history
    └── lib/
        ├── api.ts              — all backend calls
        └── useRequireAuth.ts   — page access control
```

---

## First-time setup

### 1. Database

```bash
createdb -U postgres farm_system
psql -U postgres -d farm_system -f schema.sql
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate      # Windows Git Bash
pip install -r requirements.txt
```

Create `.env` in `backend/` (copy `.env.example` and fill in real values):

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/farm_system
JWT_SECRET=some-long-random-string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

OWNER_NAME=Cliff Nakitare
OWNER_EMAIL=owner@example.com
OWNER_TEMP_PASSWORD=ChangeMe123

SUPERVISOR_NAME=Tinega Lydia
SUPERVISOR_EMAIL=supervisor@example.com
SUPERVISOR_TEMP_PASSWORD=ChangeMe1234
```

Create the two accounts (only ever needs to run once):

```bash
python seed.py
```

Start the API:

```bash
uvicorn app.main:app --reload
```

Runs at `http://127.0.0.1:8000`. Visit `/docs` to see all endpoints.

### 3. Frontend

```bash
cd frontend
npm install
```

Create `.env.local` in `frontend/`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start it:

```bash
npm run dev
```

Runs at `http://localhost:3000`.

### 4. Log in

Go to `http://localhost:3000/login` and sign in with the supervisor's email and temp password. First login forces a password change, then lands on the supervisor's home dashboard.

---

## Features

**Home dashboard** — greeting, today's entry count, active alert count, quick access to every section below.

**New entry** — pick crop + activity (spray, weed, irrigate, fertilize, harvest, issue). Harvest asks for quantity in kg (feeds live stock). Issue asks for a description (auto-creates an alert). Optionally attach a worker — saved workers appear in a dropdown so their details are never re-typed.

**Activity feed** (`/activity`) — full log, grouped by day, filterable by crop and activity type, auto-refreshes every 15 seconds.

**Workers** (`/workers`) — add a worker once (name, phone, role). Tap into any worker to see their full activity history — this is their "tracking page."

**Safety alerts** (`/alerts`) — every issue entry becomes an alert here automatically. Supervisor can mark resolved.

**Buyers** (`/buyers`) — passive contact records (name, phone). Buyers never log into the system themselves.

**Orders** (`/orders`) — shows live stock available per crop (harvested − sold). Log a sale against a buyer; mark it paid or cancelled later.

---

## Known limitations (by design, for now)

- **"Pending sync" on the home dashboard is a placeholder (always 0)** — there's no offline mode built yet, so this number isn't live.
- **Activity feed shows the latest 50 entries only** — fine for now, but will need pagination once activity volume grows.
- **Orders don't hard-block overselling past live stock** — it's shown as a number, but the supervisor can still log a sale beyond it; this was a deliberate judgment-call decision, not a bug.

## Not yet built

- Owner's `/dashboard` page (read-only mirror of everything above)
- "Manage users" screen for the owner (currently accounts can only be created via `seed.py`)
- Forgot-password flow
- Photo attachments on activity entries (`photo_url` column exists, no upload UI yet)

---

## Useful commands

**Check the database directly:**
```bash
psql -U postgres -d farm_system
\dt                          -- list tables
SELECT * FROM live_stock;    -- current stock per crop
```

**If `bcrypt` throws a version error when seeding:**
```bash
pip install "bcrypt==4.0.1"
```

**If you're on Windows and `npm install` keeps failing with "Device or resource busy":**
Your project is probably syncing live with OneDrive, which locks files mid-install. Move the project folder outside any OneDrive-synced directory and reinstall from there.