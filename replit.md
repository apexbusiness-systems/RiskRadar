# RiskRadar

An SMB obligation and deadline tracker SaaS built with a full-stack monorepo.

## Architecture

```
artifacts/
  api-server/        Express 5 + Clerk auth + Drizzle ORM + hourly reminder scheduler
  renewal-radar/     React + Vite + Tailwind v4 + Clerk + TanStack Query + wouter

lib/
  api-spec/          OpenAPI spec (openapi.yaml) + Orval codegen config
  api-client-react/  Generated React Query hooks (from codegen)
  api-zod/           Generated Zod validators (from codegen) — exports ONLY from ./generated/api
  db/                Drizzle ORM schema + migrations
```

## Stack

- **Frontend**: React 18, Vite, Tailwind v4, shadcn/ui, wouter, TanStack Query, Clerk React
- **Backend**: Express 5, Drizzle ORM, PostgreSQL, Clerk Express, nodemailer
- **Auth**: Clerk (email + Google OAuth)
- **Database**: PostgreSQL (Replit-provisioned)
- **API Contract**: OpenAPI 3.1 → Orval codegen → React Query hooks + Zod schemas

## Key Features

- Clerk auth with email + Google, branded sign-in/sign-up pages
- Dashboard with 6 metric cards (Total Active, Overdue, Due Soon, Completed, Expired, Reminders Sent)
- Searchable/filterable obligations table with CSV export
- Obligation CRUD with reminder rules management per obligation
- CSV import wizard: upload/paste → column mapping → preview → confirm
- Delivery history table (all reminder sends)
- Audit log (all obligation actions)
- Workspace and member management (invite, remove)
- Seeded demo data on first sign-in (10 obligations, reminder rules, delivery history, audit logs)
- Hourly reminder processor: marks overdue as expired, sends emails (if SMTP configured), escalates to backup owners

## Database Tables

- `workspaces` — tenant per team
- `workspace_members` — roles: owner/admin/member
- `obligations` — status: active/expired/completed/paused; renewalFrequency: once/monthly/quarterly/annually/custom
- `reminder_rules` — per-obligation; channel: email/in_app; recipientType: owner/backup_owner/all_members/custom_email
- `delivery_history` — reminder send records; status: sent/failed/pending
- `audit_logs` — full action history

## Routes

### Frontend (renewal-radar artifact, path: `/`)

- `/` — Landing page (marketing, redirects signed-in users to /dashboard)
- `/sign-in` — Clerk sign-in
- `/sign-up` — Clerk sign-up
- `/dashboard` — Dashboard with metrics + upcoming obligations
- `/obligations` — Obligations list with search/filter/export
- `/obligations/new` — Create obligation form
- `/obligations/:id` — Detail/edit page with reminder rules
- `/import` — CSV import wizard (4 steps)
- `/delivery` — Delivery history
- `/audit` — Audit log
- `/workspace` — Workspace settings + member management

### Backend (api-server artifact, path: `/api`)

- `GET /api/healthz` — Health check
- `GET /api/dashboard/metrics` — Dashboard metrics
- `GET /api/dashboard/upcoming` — Upcoming obligations
- `POST /api/me/seed` — Seed demo data for new user
- `GET/POST /api/workspaces` — List/create workspaces
- `GET/PUT /api/workspaces/:id` — Get/update workspace
- `GET/POST /api/workspaces/:id/members` — List/invite members
- `DELETE /api/workspaces/:id/members/:memberId` — Remove member
- `GET/POST /api/obligations` — List/create obligations
- `GET/PUT/DELETE /api/obligations/:id` — Get/update/delete obligation
- `POST /api/obligations/:id/complete` — Mark complete
- `GET /api/obligations/export/csv` — Export CSV
- `POST /api/obligations/import/csv/preview` — Preview CSV import
- `POST /api/obligations/import/csv` — Execute CSV import
- `GET/POST /api/obligations/:id/reminder-rules` — List/create reminder rules
- `PUT/DELETE /api/obligations/:id/reminder-rules/:ruleId` — Update/delete rule
- `GET /api/delivery-history` — Delivery history
- `GET /api/audit-logs` — Audit log

## Codegen (IMPORTANT)

After any changes to `lib/api-spec/openapi.yaml`:

```bash
pnpm --filter @workspace/api-spec run codegen
```

**CRITICAL**: `lib/api-zod/src/index.ts` must ONLY export from `"./generated/api"` (NOT `"./generated/types"`). Codegen regenerates this file and causes TS2308 duplicate exports — always re-check after running codegen.

## Environment Variables

### Auto-provisioned
- `DATABASE_URL` — PostgreSQL
- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — Clerk auth
- `SESSION_SECRET` — Session secret

### Optional (email reminders)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Without these, reminders are logged to delivery_history but not emailed

## Development Commands

```bash
pnpm run typecheck                              # Full TypeScript check
pnpm --filter @workspace/api-spec run codegen   # Regenerate API hooks
pnpm --filter @workspace/db run push            # Push DB schema
pnpm --filter @workspace/api-server run build   # Build API server
```

## Reminder Processor

Runs every hour inside the API server process:
1. Marks overdue `active` obligations as `expired` and logs audit entry
2. Fires reminder rules where `daysBefore` matches days until due date
3. Escalates to backup owners for overdue obligations not yet completed
4. Logs all sends to `delivery_history`

## UI Conventions

- Deep navy/slate primary (`--primary: 222 47% 11%`), amber accent (`--accent: 38 92% 50%`)
- Sidebar navigation (dark navy background)
- Status badges: active→blue, expired→red, completed→green, paused→gray
- Due date indicators: overdue→red, 0-7 days→amber, else→muted
- All interactive elements have `data-testid` attributes
