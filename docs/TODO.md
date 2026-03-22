# TODO

## General

- [ ] figure out how to use this as a trusted SSO website into other build applications
- [ ] Build a trigger that scrapes a game as soon as its finished
- [ ] Populate all of 2024/2025

## GCP Deployment

### Done ✓

- [x] Migrate database from SQLite to PostgreSQL
- [x] Switch to `adapter-node` + create `Dockerfile`

### Next steps (in order)

#### 1. Set up GCP project

- [x] Create a GCP project (or select existing one)
- [x] Install & auth the `gcloud` CLI:
  - Note: requires Python 3.10+. Set `CLOUDSDK_PYTHON=/opt/homebrew/bin/python3.13` in `~/.zshrc` before installing
  - `brew install google-cloud-sdk`, then `gcloud auth login`
  - Also run `gcloud auth application-default login` for tools like Cloud SQL Auth Proxy
- [x] Set your project: `gcloud config set project kali-490813`
- [x] Enable required APIs:
  ```
  gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com
  ```

#### 2. Create Artifact Registry (Docker image storage)

- [x] Create a repository:
  ```
  gcloud artifacts repositories create kali-afl \
    --repository-format=docker \
    --location=australia-southeast1
  ```
- [x] Auth Docker to push to it:
  ```
  gcloud auth configure-docker australia-southeast1-docker.pkg.dev
  ```

#### 3. Create Cloud SQL (Postgres)

- [x] Create a Postgres instance:
  ```
  gcloud sql instances create kali-afl-db \
    --database-version=POSTGRES_16 \
    --tier=db-f1-micro \
    --edition=ENTERPRISE \
    --region=australia-southeast1
  ```
  Note: `--edition=ENTERPRISE` is required — GCP now defaults to ENTERPRISE_PLUS which uses different tier names
- [x] Create the database: `gcloud sql databases create kali-afl --instance=kali-afl-db`
- [x] Create a user: `gcloud sql users create kali-afl-user --instance=kali-afl-db --password=YOUR_PASSWORD`
- [x] Instance connection name: `kali-490813:australia-southeast1:kali-afl-db`

#### 4. Store secrets in Secret Manager

- [x] Create a secret for each env var:
  ```
  echo -n "postgresql://..." | gcloud secrets create DATABASE_URL --data-file=-
  echo -n "your-secret"     | gcloud secrets create AUTH_SECRET --data-file=-
  echo -n "your-id"         | gcloud secrets create GITHUB_CLIENT_ID --data-file=-
  echo -n "your-secret"     | gcloud secrets create GITHUB_CLIENT_SECRET --data-file=-
  echo -n "your-id"         | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
  echo -n "your-secret"     | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
  ```
- [x] Note: The `DATABASE_URL` for Cloud Run uses Unix socket format:
      `postgresql://kali-afl-user:PASSWORD@/kali-afl?host=/cloudsql/kali-490813:australia-southeast1:kali-afl-db`

#### 5. Build & push Docker image manually (first time)

- [x] Build and tag — must include `--platform linux/amd64` (Cloud Run requires amd64, Macs build ARM by default):
  ```
  docker build --platform linux/amd64 \
    -t australia-southeast1-docker.pkg.dev/kali-490813/kali-afl/app:latest .
  ```
- [x] Push:
  ```
  docker push australia-southeast1-docker.pkg.dev/kali-490813/kali-afl/app:latest
  ```

#### 6. Deploy to Cloud Run

- [x] Deploy:
  ```
  gcloud run deploy kali-afl \
    --image=australia-southeast1-docker.pkg.dev/kali-490813/kali-afl/app:latest \
    --region=australia-southeast1 \
    --platform=managed \
    --allow-unauthenticated \
    --add-cloudsql-instances=kali-490813:australia-southeast1:kali-afl-db \
    --update-secrets=DATABASE_URL=DATABASE_URL:latest,AUTH_SECRET=AUTH_SECRET:latest,GITHUB_CLIENT_ID=GITHUB_CLIENT_ID:latest,GITHUB_CLIENT_SECRET=GITHUB_CLIENT_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest
  ```
- [x] Run database migrations against Cloud SQL:
  - Install the proxy: `brew install cloud-sql-proxy`
  - Stop local Postgres first (frees port 5432): `brew services stop postgresql@16`
  - Start the tunnel: `cloud-sql-proxy kali-490813:australia-southeast1:kali-afl-db`
  - In a new terminal, run migrations (wrap DATABASE_URL in single quotes to avoid shell issues with special characters):
    ```
    DATABASE_URL='postgresql://kali-afl-user:PASSWORD@localhost:5432/kali-afl' npx drizzle-kit migrate
    ```

#### 7. Set up Cloud Build (CI/CD)

Replaced GitHub Actions with Cloud Build — no service account keys required (blocked by org policy).
Cloud Build runs inside GCP and uses its own managed service account.

- [x] Create `cloudbuild.yaml` in project root (builds, pushes, deploys on every push to `main`)
- [x] Grant Cloud Build service account required roles (project number: `173366351243`):
  ```
  gcloud projects add-iam-policy-binding kali-490813 \
    --member="serviceAccount:173366351243@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin"

  gcloud projects add-iam-policy-binding kali-490813 \
    --member="serviceAccount:173366351243@cloudbuild.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

  gcloud projects add-iam-policy-binding kali-490813 \
    --member="serviceAccount:173366351243@cloudbuild.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
  ```
  Note: Cloud Build service account is Google-managed — find it under IAM (not Service Accounts) with "Include Google-provided role grants" ticked
- [x] Connect GitHub repo and create trigger in GCP Console → Cloud Build → Triggers

#### 8. Update OAuth callback URLs

- [ ] Add Cloud Run URL to GitHub OAuth app allowed callback URIs
- [ ] Add Cloud Run URL to Google OAuth app allowed redirect URIs
