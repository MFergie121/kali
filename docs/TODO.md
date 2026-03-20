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
- [ ] Create a GCP project (or select existing one)
- [ ] Install & auth the `gcloud` CLI: `brew install google-cloud-sdk` then `gcloud auth login`
- [ ] Set your project: `gcloud config set project YOUR_PROJECT_ID`
- [ ] Enable required APIs:
  ```
  gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com
  ```

#### 2. Create Artifact Registry (Docker image storage)
- [ ] Create a repository:
  ```
  gcloud artifacts repositories create kali \
    --repository-format=docker \
    --location=australia-southeast1
  ```
- [ ] Auth Docker to push to it:
  ```
  gcloud auth configure-docker australia-southeast1-docker.pkg.dev
  ```

#### 3. Create Cloud SQL (Postgres)
- [ ] Create a Postgres instance:
  ```
  gcloud sql instances create kali-db \
    --database-version=POSTGRES_16 \
    --tier=db-f1-micro \
    --region=australia-southeast1
  ```
- [ ] Create the database: `gcloud sql databases create kali --instance=kali-db`
- [ ] Create a user: `gcloud sql users create kali-user --instance=kali-db --password=YOUR_PASSWORD`
- [ ] Note the instance connection name: `PROJECT:australia-southeast1:kali-db`

#### 4. Store secrets in Secret Manager
- [ ] Create a secret for each env var:
  ```
  echo -n "postgresql://..." | gcloud secrets create DATABASE_URL --data-file=-
  echo -n "your-secret"     | gcloud secrets create AUTH_SECRET --data-file=-
  echo -n "your-id"         | gcloud secrets create GITHUB_CLIENT_ID --data-file=-
  echo -n "your-secret"     | gcloud secrets create GITHUB_CLIENT_SECRET --data-file=-
  echo -n "your-id"         | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
  echo -n "your-secret"     | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
  ```
- [ ] Note: The `DATABASE_URL` for Cloud Run uses Unix socket format:
  `postgresql://kali-user:PASSWORD@/kali?host=/cloudsql/PROJECT:australia-southeast1:kali-db`

#### 5. Build & push Docker image manually (first time)
- [ ] Build and tag:
  ```
  docker build -t australia-southeast1-docker.pkg.dev/PROJECT/kali/app:latest .
  ```
- [ ] Push:
  ```
  docker push australia-southeast1-docker.pkg.dev/PROJECT/kali/app:latest
  ```

#### 6. Deploy to Cloud Run
- [ ] Deploy:
  ```
  gcloud run deploy kali \
    --image=australia-southeast1-docker.pkg.dev/PROJECT/kali/app:latest \
    --region=australia-southeast1 \
    --platform=managed \
    --allow-unauthenticated \
    --add-cloudsql-instances=PROJECT:australia-southeast1:kali-db \
    --update-secrets=DATABASE_URL=DATABASE_URL:latest,AUTH_SECRET=AUTH_SECRET:latest,GITHUB_CLIENT_ID=GITHUB_CLIENT_ID:latest,GITHUB_CLIENT_SECRET=GITHUB_CLIENT_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest
  ```
- [ ] Run database migrations against Cloud SQL

#### 7. Set up GitHub Actions (CI/CD)
- [ ] Create a GCP service account for GitHub Actions
- [ ] Grant it roles: Artifact Registry Writer, Cloud Run Developer, Secret Manager Secret Accessor
- [ ] Add service account key as GitHub secret `GCP_SA_KEY`
- [ ] Create `.github/workflows/deploy.yml` to build + push + deploy on push to `main`

#### 8. Update OAuth callback URLs
- [ ] Add Cloud Run URL to GitHub OAuth app allowed callback URIs
- [ ] Add Cloud Run URL to Google OAuth app allowed redirect URIs
