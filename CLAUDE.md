# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server at `http://localhost:5173` |
| `npm run build` | Production build (adapter-node → `build/`) |
| `npm run check` | `svelte-kit sync` + `svelte-check` against `tsconfig.json` (the only static check) |
| `npm run db:push` | Apply Drizzle schema in `src/lib/db/afl/schema.ts` to the DB referenced by `DATABASE_URL` |
| `npm run db:studio` | Drizzle Studio (visual DB browser) |
| `npm run db:clear` | `tsx scripts/clear-afl-data.ts` — wipes AFL data |

There is no test suite, no linter, and no formatter wired into `package.json`. `npm run check` is the only validation step.

### Schema migrations
The project uses `db:push` for **both** local and production. File-based migrations (`drizzle-kit migrate`) are intentionally not used because the prod DB was bootstrapped with push and mixing the two corrupts `__drizzle_migrations`. To push to prod, run `cloud-sql-proxy kali-490813:australia-southeast1:kali-afl-db --port 5433` in a side terminal, then run `db:push` with `DATABASE_URL` overridden inline (do not commit it to `.env`). See `README.md` for the full procedure.

### Deployment
`git push` → Cloud Build (`cloudbuild.yaml`) → Cloud Run in `australia-southeast1`. Secrets (DB URL, AUTH_SECRET, OAuth creds, ADMIN_EMAIL, SCRAPE_SECRET) come from GCP Secret Manager. The container connects to Cloud SQL via a Unix socket — `src/lib/db/afl/index.ts` parses `host=` from the DSN query string and switches transport accordingly, so do not change that parsing without testing both modes.

## Architecture

SvelteKit 2 + Svelte 5 (runes) + Tailwind v4 + Drizzle ORM + PostgreSQL. SSR via `@sveltejs/adapter-node`. Two surfaces share the same app:

1. **Web app** at `/home/kali-afl/*` — session-cookie protected, browses AFL data and admin tooling.
2. **Public REST API** at `/api/afl/v1/*` — Bearer API-key protected, paginated JSON.

### Auth (two distinct systems — keep them separate)

**Browser sessions** (`src/auth.ts` + `src/hooks.server.ts`):
- Custom OAuth 2.0 + PKCE flow for GitHub and Google, no auth library. Session stored as a `jose` JWE cookie (`session`) encrypted with first 32 bytes of `AUTH_SECRET`. Auto-refreshes Google access tokens when within 60s of expiry.
- `hooks.server.ts` attaches `event.locals.auth()` (lazy + cached per-request).
- Route guards live in `src/lib/server/admin.ts`:
  - `requireAuth(locals)` — any signed-in user
  - `requireAdmin(locals)` — `session.user.email === ADMIN_EMAIL`
  - `requireAdminOrCron(request, locals)` — admin session **or** `Authorization: Bearer ${SCRAPE_SECRET}` (used by scheduled scrape endpoints)
- `/home/kali-afl/+layout.server.ts` redirects unauthenticated users to `/auth/login` and exposes `isAdmin` to children.

**API keys** (`src/lib/api/auth.ts`):
- `requireApiKey(request)` reads `Authorization: Bearer <key>`, calls `validateApiKey` (in `service.ts`), and returns either a `Response` to short-circuit (401/429) or `null` to proceed. The handler pattern is always:
  ```ts
  const denied = await requireApiKey(request);
  if (denied) return denied;
  ```
- Keys are tracked in `api_keys` with `usage` / `totalUsage` / `limit` for rate limiting.

### REST API conventions
- Path: `src/routes/api/afl/v{n}/{resource}/+server.ts` (or `[id]/+server.ts` for single-resource).
- Pagination: `limit` clamped to 1–200 (default 50); `offset` ≥ 0 (default 0). Same parsing pattern in every list endpoint — copy from `v1/matches/+server.ts`.
- List response: `json({ data, meta: { limit, offset, count, total } })`.
- Errors: `json({ error: 'message' }, { status })` — 400 for bad query params, 401 unauthorized, 429 rate-limited.
- All DB access goes through `src/lib/db/afl/service.ts`. Do not write Drizzle queries inline in `+server.ts`. Types come from `$inferSelect` on `schema.ts`.

### Database layer
- Single Drizzle instance exported as a `Proxy` in `src/lib/db/afl/index.ts` so the connection is lazy (avoids crashing at import time when `DATABASE_URL` is unset, e.g. during `svelte-kit sync`).
- Core tables: `teams`, `matches`, `fixtures` (Squiggle), `tips` (Squiggle tipsters), `players`, `player_team_assignments`, `player_stats`, `player_stats_advanced`, `kali_users` (auth profile + UI prefs), `api_keys`.
- Match IDs are footywire `mid`s; fixture IDs are Squiggle game IDs — they are not interchangeable.
- `players.online_id` is a unique index but nullable — historical players without a footywire profile are deduplicated by other means (see `service.ts`).

### Scraping
- `src/lib/afl/scraper.ts` parses footywire match HTML via `node-html-parser`. The advanced-stats column order (CP UP ED DE% CM GA MI5 1% BO CCL SCL SI MG TO ITC T5 TOG%) is documented in `schema.ts` — keep them aligned.
- `src/lib/afl/squiggle.ts` wraps the Squiggle JSON API for fixtures and tips.
- Admin scrape endpoints live under `/api/afl/admin/scrape/*` and `/api/afl/admin/sync-fixture`, `sync-tips`. Use `requireAdminOrCron` so they can be hit by cron with `SCRAPE_SECRET`.

### UI / theming
- shadcn-svelte primitives in `src/lib/components/ui/{button, dropdown-menu, input, ...}`; project-specific composites in `src/lib/components/ui/custom/`.
- **Never hardcode colours.** Use semantic tokens only (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `bg-accent` for hover, `bg-destructive`, sidebar tokens). The full token reference and do/don't list is `docs/ui.md` — consult before styling new components.
- Theme + font + dark-mode preferences are persisted in `kali_users` and synced via `src/lib/sync-prefs.ts` / `theme.svelte.ts` / `font.svelte.ts`.

## Environment variables

Required for local dev (see `.env.example`): `DATABASE_URL`, `AUTH_SECRET` (32 hex bytes), `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Additional in prod: `ADMIN_EMAIL` (gates admin UI + scrape endpoints), `SCRAPE_SECRET` (cron bearer), `ORIGIN` (set to deployed URL for SvelteKit). All read via `$env/dynamic/private`.
