# Kali-AFL

SvelteKit application backed by PostgreSQL (Drizzle ORM), deployed to Cloud Run via Cloud Build.

## Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/) running locally
- A GitHub OAuth App and/or Google OAuth Client for authentication

---

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up PostgreSQL

**Install and start** (Homebrew):

```bash
brew install postgresql@16
brew services start postgresql@16
```

**Create the database:**

```bash
createdb kali-afl
```

**Useful PostgreSQL commands:**

| Command | Description |
|---------|-------------|
| `brew services start postgresql@16` | Start PostgreSQL |
| `brew services stop postgresql@16` | Stop PostgreSQL |
| `brew services restart postgresql@16` | Restart PostgreSQL |
| `brew services list` | Show status of all services (check if PostgreSQL is running) |
| `psql kali-afl` | Open a psql shell connected to the local DB |
| `psql kali-afl -c "SELECT * FROM fixtures LIMIT 5;"` | Run a one-off query |
| `createdb kali-afl` | Create the database (first time only) |
| `dropdb kali-afl` | Delete the database entirely (destructive) |

> **Connection string note:** Homebrew PostgreSQL on macOS uses your OS username as the default role (not `postgres`). The correct local `DATABASE_URL` uses your macOS username — see step 3 below.

### 3. Configure environment variables

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

```env
# Local PostgreSQL connection — replace YOUR_USERNAME with your macOS username (run: whoami)
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/kali-afl

# Generate with: openssl rand -hex 32
AUTH_SECRET=

# GitHub OAuth App — https://github.com/settings/developers
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Google OAuth — https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 4. Push the database schema

```bash
npm run db:push
```

This applies the Drizzle schema directly to your local database. Run this again any time the schema changes.

### 5. Start the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Important Notes

### OAuth redirect URIs

For OAuth login to work locally, your GitHub and Google OAuth apps must have `http://localhost:5173` registered as an allowed redirect URI.

- **GitHub:** Go to your OAuth App settings → _Authorization callback URL_ → add `http://localhost:5173/auth/callback/github`
- **Google:** Go to your OAuth Client → _Authorised redirect URIs_ → add `http://localhost:5173/auth/callback/google`

> In production these point to the Cloud Run URL. You can use separate OAuth apps for dev and prod, or add both URIs to the same app.

### AUTH_SECRET

This must be a securely generated random string (32+ bytes). It encrypts session JWTs — changing it will invalidate all existing sessions.

```bash
openssl rand -hex 32
```

### DATABASE_URL special characters

If your database password contains special characters, they must be URL-encoded in the connection string (e.g. `!` → `%21`, `@` → `%40`). See [percent-encoding](https://en.wikipedia.org/wiki/Percent-encoding) for the full list.

---

## Useful Scripts

| Command             | Description                             |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Start local dev server                  |
| `npm run build`     | Build for production                    |
| `npm run check`     | Run Svelte type checks                  |
| `npm run db:push`   | Sync Drizzle schema to the database     |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |
| `npm run db:clear`  | Clear AFL data from the database        |

---

## Migrating the Production Database

Schema changes must be applied to the production Cloud SQL database manually before (or alongside) deploying. The app does not run migrations automatically on startup.

### How it works

This project uses `db:push` for both local and production schema management. Drizzle push compares the TypeScript schema against the live database and generates only the necessary SQL — it will **prompt before dropping anything**, so it is safe to review before confirming.

> `drizzle-kit migrate` (file-based migrations) is not used because the production database was originally bootstrapped with `db:push`. Mixing the two approaches causes state mismatches in the `__drizzle_migrations` table.

### Step 1 — Start the Cloud SQL Auth Proxy

The proxy creates a local TCP tunnel to the production Cloud SQL instance. If local PostgreSQL is already running on port 5432, use `--port 5433` to avoid conflicts. Run this in a separate terminal:

```bash
# Install once
brew install cloud-sql-proxy

# Run on default port (only if local Postgres is stopped)
cloud-sql-proxy kali-490813:australia-southeast1:kali-afl-db

# Run on alternate port (recommended — keeps local Postgres running)
cloud-sql-proxy kali-490813:australia-southeast1:kali-afl-db --port 5433
```

### Step 2 — Push schema changes

Set the production database URL temporarily in your shell (do not save this to `.env`):

```bash
# Via default port 5432
DATABASE_URL="postgresql://kali-afl-user:PASSWORD@localhost:5432/kali-afl" npm run db:push

# Via alternate port 5433
DATABASE_URL="postgresql://kali-afl-user:PASSWORD@localhost:5433/kali-afl" npm run db:push
```

Drizzle will print the SQL it plans to run and ask for confirmation. Review it, then confirm.

### Step 3 — Verify and deploy

Once the push succeeds, deploy the app as normal (push to trigger Cloud Build). The new schema will be in place before the new code goes live.

---

## Deployment

The app deploys automatically to Cloud Run via Cloud Build on push. See `cloudbuild.yaml` for the pipeline configuration.

The production database connects to Cloud SQL via a Unix socket — no public IP or proxy required. Secrets (including `DATABASE_URL`) are managed in GCP Secret Manager and injected at container startup.
