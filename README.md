# DueRadar

**Version:** 1.0.0  
**Date:** 2026-05-13  
**Domain:** dueradar.icu

Your business deadline warning system. DueRadar tracks contracts, permits, insurance, renewals, compliance dates, vendor notice windows, and operational deadlines before they become expensive problems.

"Due" is the trigger. "Radar" is the monitoring system.

## Design System

- **Visual anchor:** Dark cinematic obsidian · amber sweep beam · cyan orbital rings
- **Typography:** Space Grotesk globally · Space Mono for tabular numerals
- **Color used only to communicate exposure** — no decorative accents
- **Status palette:** emerald (protected) · amber (due soon) · orange (high) · red (critical)

## Features

- **Command Center:** Orbital risk map, Most Urgent Due Item, Monitoring Coverage, deadline rail
- **Due Register:** Searchable/filterable table of all deadlines with status badges
- **Due Record:** Full detail view — countdown, action history, reminder rules, resolution path
- **Due Intake:** CSV spreadsheet import with column mapping and validation
- **Secure sign-in** with email and Google (Clerk Auth)
- **Searchable/filterable obligations table** with CSV export
- **Reminder process** that checks obligations hourly, sends emails, escalates to backup owners
- **Delivery history and audit log**
- **Workspace and member management**
- **Seeded demo data** on first sign-in

## UI Language

| Old | New |
|-----|-----|
| RiskRadar | DueRadar |
| Risk Register | Due Register |
| Risk Record | Due Record |
| Risk Intake | Due Intake |
| Highest Risk Now | Most Urgent Due Item |
| Coverage Meter | Monitoring Coverage |
| Risk Coverage | Monitoring Coverage |

"Risk" is used only as supporting language when explaining consequence (e.g., "3 due items carry financial or compliance risk").

## Required Environment Variables

### Auto-provisioned by Replit

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk server secret key |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (frontend) |
| `PORT` | Frontend dev server port |
| `BASE_PATH` | Vite base path |

### Deployment (Cloudflare Pages)

| Variable | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_ZONE_ID` | Cloudflare zone ID for dueradar.icu |

### Optional — Email Reminders

| Variable | Description | Example |
|---|---|---|
| `SMTP_HOST` | SMTP server hostname | `smtp.sendgrid.net` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | Use TLS | `false` |
| `SMTP_USER` | SMTP username | `apikey` |
| `SMTP_PASS` | SMTP password/API key | `SG.xxxxx` |
| `SMTP_FROM` | Sender address | `noreply@dueradar.icu` |

## Architecture

```
artifacts/
  api-server/        Express 5 + Clerk auth + Drizzle ORM + reminder scheduler
  renewal-radar/     React 19 + Vite 7 + Tailwind v4 + Clerk + TanStack Query + wouter

lib/
  api-spec/          OpenAPI spec (openapi.yaml) + Orval codegen config
  api-client-react/  Generated React Query hooks
  api-zod/           Generated Zod validators
  db/                Drizzle ORM schema + migrations
```

### Frontend Routes (renewal-radar)

| Path | Screen | Description |
|------|--------|-------------|
| `/` | Landing | Marketing page with animated hero |
| `/dashboard` | Command Center | Orbital radar, Most Urgent Due Item, coverage, deadline rail |
| `/obligations` | Due Register | Searchable/filterable deadline table |
| `/obligations/:id` | Due Record | Full detail with countdown, history, reminder rules |
| `/obligations/new` | Due Intake | CSV import wizard |
| `/import` | Due Intake | CSV import (alternate route) |
| `/delivery` | Signal Log | Delivery history |
| `/audit` | Activity Ledger | Audit log |
| `/workspace` | Mission Control | Workspace + member management |

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

## Setup & Quickstart

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Set environment variables
cp .env.example .env

# 3. Push database schema
pnpm --filter @workspace/db run push

# 4. Start the API server
pnpm --filter @workspace/api-server run dev

# 5. Start the frontend
PORT=3000 BASE_PATH="/" pnpm --filter @workspace/renewal-radar run dev
```

## Key Commands

```bash
pnpm run typecheck                         # Full TypeScript check
pnpm --filter @workspace/api-spec codegen  # Regenerate API hooks from OpenAPI
pnpm --filter @workspace/db run push       # Push schema to dev DB
pnpm --filter @workspace/db run generate    # Generate checked-in SQL migrations
pnpm --filter @workspace/db run migrate    # Apply checked-in migrations
pnpm --filter @workspace/renewal-radar run build  # Build production frontend
```

## Migration Policy

### Demo / Local environments
- `drizzle-kit push` for rapid schema sync.

### Staging / Production environments
- Only apply **checked-in migrations**:
  1. Generate with `pnpm --filter @workspace/db run generate`
  2. Review migration SQL in PR
  3. Apply with `pnpm --filter @workspace/db run migrate`

## Demo Data Safety

- Seeded demo records use clearly fake identifiers (`example.com` email domains).
- Do not import real customer data into public demo environments.
