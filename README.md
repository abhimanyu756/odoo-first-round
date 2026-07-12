# AssetFlow — Enterprise Asset & Resource Management System

A centralized ERP for tracking, allocating, and maintaining physical assets and shared
resources. Built for the Odoo hackathon.

**Stack:** React 19 + Vite + Tailwind v4 (client) · Express 5 + Prisma + PostgreSQL (server) ·
httpOnly-cookie JWT auth.

---

## Features (all 10 screens)

1. **Auth** — signup (employee-only), login, forgot/reset password, session validation
2. **Dashboard** — 6 KPI cards, overdue banner, upcoming returns, recent activity, quick actions
3. **Organization Setup** (admin) — departments (hierarchy + heads), asset categories with
   custom fields, employee directory + role promotion
4. **Assets** — registration with auto `AF-####` tags, photo/doc uploads, bookable flag,
   search/filter, per-asset allocation + maintenance history
5. **Allocation & Transfer** — allocate/return, double-allocation block, transfer workflow
6. **Resource Booking** — day-timeline calendar, overlap validation, cancel/reschedule
7. **Maintenance** — kanban approval workflow with asset-status automation
8. **Audit** — cycles, multi-auditor assignment, verify/missing/damaged, discrepancy report,
   close-cycle → confirmed-missing become Lost
9. **Reports** — utilization, maintenance frequency, most-used/idle, booking heatmap, CSV export
10. **Notifications & Activity** — event notifications + scheduler (overdue/reminders) + audit trail

Role-based access: **Admin · Asset Manager · Department Head · Employee**.

---

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL running locally

### 1. Database
```bash
createdb assetflow
```

### 2. Server
```bash
cd server
cp .env.example .env          # then set DATABASE_URL + JWT secrets
npm install
npx prisma migrate dev        # create tables
npm run seed                  # load demo data (optional but recommended)
npm run dev                   # http://localhost:4000
```

### 3. Client
```bash
cd client
npm install
npm run dev                   # http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to the Express server on port 4000.

---

## Demo accounts

After `npm run seed` (password for all: **`password123`**):

| Role | Email |
|------|-------|
| Admin | `admin@assetflow.dev` |
| Asset Manager | `manager@assetflow.dev` |
| Department Head | `head@assetflow.dev` |
| Employee | `priya@assetflow.dev`, `raj@assetflow.dev`, `arjun@assetflow.dev` |

> Signing up through the UI always creates an **Employee**. Only an Admin can promote roles
> (Organization Setup → Employee Directory → Role).

---

## Architecture

```
server/src/
  config/        prisma client, env
  middlewares/   auth (JWT cookie), rbac, validate (zod), upload (multer), errorHandler
  modules/       per-domain: routes → controller → service → schema (SQL only in services)
  jobs/          node-cron scheduler (overdue flagging, booking rollover, reminders)
  utils/         assetTag, overlap, activityLogger, tokens, ApiError
client/src/
  lib/           axios (with 401-refresh), query client, constants, utils
  context/       AuthContext
  components/     ui/ primitives, layout (AppShell), guards, StatusBadge
  features/      one folder per screen
```

Key business rules live in services and run inside transactions: double-allocation block,
transfer re-allocation, booking overlap, maintenance status automation, audit close.

---

## Handy dev commands

```bash
# server
npm run prisma:studio          # browse the DB
curl -X POST localhost:4000/api/dev/run-scheduler   # manually run overdue/booking jobs (dev only)

# reset demo data
npm run seed
```
