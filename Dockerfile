# syntax=docker/dockerfile:1

# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:24-slim AS builder

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy workspace manifests first — install layer is cached until these change.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .npmrc ./

# Stub every workspace package so pnpm workspace resolution succeeds.
# Only package.json files are needed at install time (no source yet).
COPY lib/db/package.json                  lib/db/package.json
COPY lib/db/tsconfig.json                 lib/db/tsconfig.json
COPY lib/api-zod/package.json             lib/api-zod/package.json
COPY lib/api-zod/tsconfig.json            lib/api-zod/tsconfig.json
COPY lib/api-spec/package.json            lib/api-spec/package.json
COPY lib/api-client-react/package.json    lib/api-client-react/package.json
COPY artifacts/api-server/package.json    artifacts/api-server/package.json
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/package.json
COPY artifacts/renewal-radar/package.json artifacts/renewal-radar/package.json
COPY scripts/package.json                 scripts/package.json

RUN pnpm install --frozen-lockfile

# Copy only the source that the API server build needs.
COPY lib/db/src                     lib/db/src
COPY lib/api-zod/src                lib/api-zod/src
COPY artifacts/api-server/src       artifacts/api-server/src
COPY artifacts/api-server/build.mjs artifacts/api-server/build.mjs

# Build TypeScript project references, then bundle with esbuild.
RUN pnpm exec tsc --build lib/db/tsconfig.json && \
    pnpm exec tsc --build lib/api-zod/tsconfig.json && \
    pnpm --filter @workspace/api-server run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# esbuild bundles all dependencies — only the compiled dist is needed at runtime.
COPY --from=builder /app/artifacts/api-server/dist ./dist

EXPOSE 3001

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
