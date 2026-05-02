# Renewal Radar

An SMB obligation and deadline tracker SaaS. Track licenses, insurance, contracts, and other recurring obligations. Get reminded before they expire.

## Features

- Secure sign-in with email and Google (Clerk Auth)
- Dashboard with metric cards (overdue, due soon, completed, expired)
- Searchable/filterable obligations table
- Obligation detail page with reminder rules
- CSV import wizard with column mapping and preview
- CSV export
- Reminder process that checks obligations hourly, sends emails, escalates to backup owners, marks overdue obligations as expired
- Delivery history and audit log
- Workspace and member management
- Seeded demo data on first sign-in

## Required Environment Variables

### Auto-provisioned by Replit

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk server secret key |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (frontend) |

### Optional — Email Reminders

Set these to enable outbound reminder emails. Without them, reminders are logged but not sent.

| Variable | Description | Example |
|---|---|---|
| `SMTP_HOST` | SMTP server hostname | `smtp.sendgrid.net` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | Use TLS (`true`/`false`) | `false` |
| `SMTP_USER` | SMTP username | `apikey` |
| `SMTP_PASS` | SMTP password/API key | `SG.xxxxx` |
| `SMTP_FROM` | Sender address | `noreply@yourapp.com` |

## Setup & Quickstart

### On Replit

1. Click **Run** — the database and Clerk auth are auto-provisioned
2. Sign up for an account in the app
3. Demo data is seeded automatically on first sign-in

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Set environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, CLERK keys, etc.

# 3. Push database schema
pnpm --filter @workspace/db run push

# 4. Start the API server
pnpm --filter @workspace/api-server run dev

# 5. Start the frontend (in another terminal)
pnpm --filter @workspace/renewal-radar run dev
```

## Architecture

```
artifacts/
  api-server/        Express 5 + Clerk auth + reminder scheduler
  renewal-radar/     React + Vite + Tailwind + Clerk

lib/
  api-spec/          OpenAPI spec + Orval codegen config
  api-client-react/  Generated React Query hooks
  api-zod/           Generated Zod validators
  db/                Drizzle ORM schema + migrations
```

### Database Models

- `workspaces` — Tenant/org per team
- `workspace_members` — Role-based membership (owner/admin/member)
- `obligations` — Tracked deadlines (status: active/expired/completed/paused)
- `reminder_rules` — Per-obligation reminder configuration
- `delivery_history` — Record of all reminder sends
- `audit_logs` — Full action history

### Reminder Processor

Runs every hour inside the API server process:
1. Marks overdue `active` obligations as `expired`
2. Fires reminder rules whose `daysBefore` matches today
3. Escalates to backup owners when primary owner hasn't completed
4. Logs all sends to `delivery_history`

## Key Commands

```bash
pnpm run typecheck                         # Full TypeScript check
pnpm --filter @workspace/api-spec codegen  # Regenerate API hooks from OpenAPI
pnpm --filter @workspace/db run push       # Push schema to dev DB
```
