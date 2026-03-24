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

### 2. Create a local database

```bash
createdb kali-afl
```

> If you don't have PostgreSQL installed: `brew install postgresql@16 && brew services start postgresql@16`

### 3. Configure environment variables

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

```env
# Local PostgreSQL connection
DATABASE_URL=postgresql://localhost:5432/kali-afl

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

- **GitHub:** Go to your OAuth App settings → *Authorization callback URL* → add `http://localhost:5173/auth/callback/github`
- **Google:** Go to your OAuth Client → *Authorised redirect URIs* → add `http://localhost:5173/auth/callback/google`

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

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Build for production |
| `npm run check` | Run Svelte type checks |
| `npm run db:push` | Sync Drizzle schema to the database |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |
| `npm run db:clear` | Clear AFL data from the database |

---

## Migrating the Production Database

Schema changes must be applied to the production Cloud SQL database manually before (or alongside) deploying. The app does not run migrations automatically on startup.

### How it works

There are two distinct Drizzle workflows:

| Command | When to use |
|---|---|
| `npm run db:push` | Local dev only — directly syncs schema, no migration files |
| `drizzle-kit generate` + `drizzle-kit migrate` | Production — generates a SQL migration file, then applies it safely |

> **Never run `db:push` against the production database.** It can drop columns or tables without warning.

### Step 1 — Generate a migration

After making changes to a schema file under `src/lib/db/`:

```bash
npx drizzle-kit generate
```

This creates a new `.sql` file in the `drizzle/` directory. Review it before applying — it is the exact SQL that will run against the database.

### Step 2 — Start the Cloud SQL Auth Proxy

The proxy creates a local TCP tunnel to the production Cloud SQL instance. Run this in a separate terminal:

```bash
# Install once
brew install cloud-sql-proxy

# Run the proxy
cloud-sql-proxy kali-490813:australia-southeast1:kali-afl-db
```

The proxy listens on `localhost:5432` by default.

### Step 3 — Apply the migration

Set the production database URL temporarily in your shell (do not save this to `.env`):

```bash
DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_PASSWORD@localhost:5432/kali-afl" \
  npx drizzle-kit migrate
```

This applies any pending migration files from the `drizzle/` directory in order.

### Step 4 — Verify and deploy

Once the migration succeeds, deploy the app as normal (push to trigger Cloud Build). The new schema will be in place before the new code goes live.

---

## Deployment

The app deploys automatically to Cloud Run via Cloud Build on push. See `cloudbuild.yaml` for the pipeline configuration.

The production database connects to Cloud SQL via a Unix socket — no public IP or proxy required. Secrets (including `DATABASE_URL`) are managed in GCP Secret Manager and injected at container startup.
