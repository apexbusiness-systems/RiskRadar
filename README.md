# RiskRadar

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

### Supabase Backend Configuration (Optional)

RiskRadar does not require the Supabase SDK in the API server. It connects to PostgreSQL via `DATABASE_URL`, so you can attach a Supabase project by setting `DATABASE_URL` to the Supabase Postgres connection string (Transaction/Session pooler URL recommended).

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase Postgres connection string (acts as the runtime backend for API + Drizzle) |

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
| `DEMO_DATA_MODE` | Seed synthetic demo identities (`true` default, set `false` to use real sign-in email in seed data) | `true` |

## Setup & Quickstart

### Local `.env` Template

Use `.env.example` as the canonical template for local/dev environment setup:

```bash
cp .env.example .env
```

### On Replit

1. Click **Run** — the database and Clerk auth are auto-provisioned
2. Sign up for an account in the app
3. Demo data is seeded automatically on first sign-in

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Set environment variables in your shell or Replit Secrets
# Required: DATABASE_URL, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, VITE_CLERK_PUBLISHABLE_KEY

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
pnpm --filter @workspace/db run generate   # Generate checked-in SQL migrations
pnpm --filter @workspace/db run migrate    # Apply checked-in migrations
pnpm --filter @workspace/db run check:migration-policy # Guard push usage by environment
```

## Migration Policy (APEX Step 3)

### Demo / Replit environments
- `drizzle-kit push` is allowed only for **explicit demo/dev** workflows.
- Use `pnpm --filter @workspace/db run push` for rapid local/demo schema sync.

### Staging / Production environments
- `drizzle-kit push` and `push-force` are forbidden.
- Only apply **checked-in migrations**:
  1. Generate with `pnpm --filter @workspace/db run generate`
  2. Review migration SQL in PR
  3. Apply with `pnpm --filter @workspace/db run migrate`
- Run `pnpm --filter @workspace/db run check:migration-policy` in CI/release jobs before any schema command.

## Invite Lifecycle Notes (APEX Step 4)

- Invites are stored as pending membership rows and marked by `clerk_user_id` prefix `pending:`.
- Pending invite rows are never treated as active membership in server-side authorization checks.
- On authenticated seed/bootstrap, pending rows that match user email are reconciled to the real Clerk user id and logged as invite acceptance.
- Full Clerk webhook-driven invite reconciliation is not implemented yet; this remains a documented limitation.

## Demo Data Safety (APEX Step 5)

- Seeded demo records are synthetic and use clearly fake identifiers (including `example.com` email domains).
- Do **not** import real customer data into any public demo environment.
- To reset demo records safely:
  1. Use app workspace/member controls to remove demo-only workspaces, or
  2. In a non-production database session, delete by known demo workspace slug prefix (`demo-`) after review.
- Avoid destructive broad deletes; always scope cleanup to known demo workspaces.
