# Existing Cloud Build service account (used by the trigger)
resource "google_service_account" "cloud_build_sa" {
  account_id   = "svc-github-actions-kali-afl"
  display_name = "svc-github-actions-kali-afl"
  description  = "Used for all the github actions for the kali afl applcation"
}

# Cloud Build SA IAM bindings
resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

resource "google_project_iam_member" "cloudbuild_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

resource "google_project_iam_member" "cloudbuild_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# NEW: Dedicated Cloud Run service account
resource "google_service_account" "cloud_run_sa" {
  account_id   = "kali-afl-run"
  display_name = "Kali AFL Cloud Run Service Account"
}

# Cloud Run SA needs to read secrets
resource "google_project_iam_member" "cloud_run_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Cloud Run SA needs to connect to Cloud SQL
resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}
