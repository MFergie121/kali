# Repository Guidelines

## Project Structure & Module Organization

This is a SvelteKit/TypeScript app for Kali AFL, backed by PostgreSQL through Drizzle ORM. Application code lives in `src/`: pages and server handlers are in `src/routes`, shared helpers in `src/lib`, auth in `src/auth.ts`, and global styles in `src/app.css`. AFL schema and service logic are in `src/lib/db/afl/`. Static public assets live in `static/`; docs and reference HTML samples are in `docs/`; operational scripts are in `scripts/`. Terraform is isolated in `infra/`, which has its own `AGENTS.md`.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run dev`: start the Vite/SvelteKit dev server at `http://localhost:5173`.
- `npm run build`: build the production app.
- `npm run preview`: preview the production build locally.
- `npm run check`: run Svelte and TypeScript checks.
- `npm run db:up` / `npm run db:down`: start or stop the local PostgreSQL Docker container.
- `npm run db:push`: apply the Drizzle schema to the configured database.
- `npm run db:studio`: open Drizzle Studio.
- `npm run db:clear`: clear AFL data using `.env` and `scripts/clear-afl-data.ts`.

## Coding Style & Naming Conventions

Use TypeScript and Svelte 5 conventions already present in the repo. Keep indentation consistent with nearby files; current TS and config files commonly use tabs. Name routes with SvelteKit conventions such as `+page.svelte`, `+page.server.ts`, and `+server.ts`. Keep shared utilities small, and place AFL domain logic under `src/lib/db/afl` or `src/lib/api` instead of duplicating it in route handlers.

## Testing Guidelines

There is no dedicated unit test runner configured yet. Treat `npm run check` and `npm run build` as minimum verification before committing. For database changes, run `npm run db:up` then `npm run db:push`, and exercise the affected page or API route locally. If adding tests later, prefer colocated `*.test.ts` or `*.spec.ts` files and document the command in `package.json`.

## Commit & Pull Request Guidelines

Recent commits use short Conventional Commit-style prefixes, especially `fix:` and `feat:`. Follow that pattern, for example `fix: handle empty predictions` or `feat: add standings endpoint`. Pull requests should include a concise summary, verification steps, linked issues when relevant, and screenshots for visible UI changes. Call out schema, environment, or deployment changes explicitly.

## Security & Configuration Tips

Copy `.env.example` to `.env` for local development and never commit real secrets. `AUTH_SECRET`, OAuth credentials, and production database URLs must stay out of source control. Review Drizzle push output before confirming destructive schema changes.
