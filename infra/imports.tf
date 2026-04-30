# Import blocks for existing GCP resources
# These run automatically on terraform plan/apply (Terraform 1.5+)
# Safe to remove after successful first apply

# --- GCP APIs ---
import {
  to = google_project_service.apis["run.googleapis.com"]
  id = "kali-490813/run.googleapis.com"
}

import {
  to = google_project_service.apis["sqladmin.googleapis.com"]
  id = "kali-490813/sqladmin.googleapis.com"
}

import {
  to = google_project_service.apis["artifactregistry.googleapis.com"]
  id = "kali-490813/artifactregistry.googleapis.com"
}

import {
  to = google_project_service.apis["secretmanager.googleapis.com"]
  id = "kali-490813/secretmanager.googleapis.com"
}

import {
  to = google_project_service.apis["cloudbuild.googleapis.com"]
  id = "kali-490813/cloudbuild.googleapis.com"
}

# --- Artifact Registry ---
import {
  to = google_artifact_registry_repository.kali_afl
  id = "projects/kali-490813/locations/australia-southeast1/repositories/kali-afl"
}

# --- Cloud SQL ---
import {
  to = google_sql_database_instance.main
  id = "projects/kali-490813/instances/kali-afl-db"
}

import {
  to = google_sql_database.kali_afl
  id = "projects/kali-490813/instances/kali-afl-db/databases/kali-afl"
}

import {
  to = google_sql_user.kali_afl_user
  id = "kali-490813/kali-afl-db/kali-afl-user"
}

# --- Secret Manager ---
import {
  to = google_secret_manager_secret.secrets["DATABASE_URL"]
  id = "projects/kali-490813/secrets/DATABASE_URL"
}

import {
  to = google_secret_manager_secret.secrets["AUTH_SECRET"]
  id = "projects/kali-490813/secrets/AUTH_SECRET"
}

import {
  to = google_secret_manager_secret.secrets["GITHUB_CLIENT_ID"]
  id = "projects/kali-490813/secrets/GITHUB_CLIENT_ID"
}

import {
  to = google_secret_manager_secret.secrets["GITHUB_CLIENT_SECRET"]
  id = "projects/kali-490813/secrets/GITHUB_CLIENT_SECRET"
}

import {
  to = google_secret_manager_secret.secrets["GOOGLE_CLIENT_ID"]
  id = "projects/kali-490813/secrets/GOOGLE_CLIENT_ID"
}

import {
  to = google_secret_manager_secret.secrets["GOOGLE_CLIENT_SECRET"]
  id = "projects/kali-490813/secrets/GOOGLE_CLIENT_SECRET"
}

import {
  to = google_secret_manager_secret.secrets["ADMIN_EMAIL"]
  id = "projects/kali-490813/secrets/ADMIN_EMAIL"
}

import {
  to = google_secret_manager_secret.secrets["SCRAPE_SECRET"]
  id = "projects/kali-490813/secrets/SCRAPE_SECRET"
}

# --- Cloud Run ---
import {
  to = google_cloud_run_v2_service.kali_afl
  id = "projects/kali-490813/locations/australia-southeast1/services/kali-afl"
}

# --- Cloud Run IAM (public access) ---
import {
  to = google_cloud_run_v2_service_iam_member.public
  id = "projects/kali-490813/locations/australia-southeast1/services/kali-afl roles/run.invoker allUsers"
}

# --- Service Accounts ---
import {
  to = google_service_account.cloud_build_sa
  id = "projects/kali-490813/serviceAccounts/svc-github-actions-kali-afl@kali-490813.iam.gserviceaccount.com"
}

# --- IAM Bindings (Cloud Build SA) ---
import {
  to = google_project_iam_member.cloudbuild_run_admin
  id = "kali-490813 roles/run.admin serviceAccount:svc-github-actions-kali-afl@kali-490813.iam.gserviceaccount.com"
}

import {
  to = google_project_iam_member.cloudbuild_sa_user
  id = "kali-490813 roles/iam.serviceAccountUser serviceAccount:svc-github-actions-kali-afl@kali-490813.iam.gserviceaccount.com"
}

import {
  to = google_project_iam_member.cloudbuild_secret_accessor
  id = "kali-490813 roles/secretmanager.secretAccessor serviceAccount:svc-github-actions-kali-afl@kali-490813.iam.gserviceaccount.com"
}

# --- Cloud Run Service Account ---
import {
  to = google_service_account.cloud_run_sa
  id = "projects/kali-490813/serviceAccounts/kali-afl-run@kali-490813.iam.gserviceaccount.com"
}

# --- IAM Bindings (Cloud Run SA) ---
import {
  to = google_project_iam_member.cloud_run_secret_accessor
  id = "kali-490813 roles/secretmanager.secretAccessor serviceAccount:kali-afl-run@kali-490813.iam.gserviceaccount.com"
}

import {
  to = google_project_iam_member.cloud_run_sql_client
  id = "kali-490813 roles/cloudsql.client serviceAccount:kali-afl-run@kali-490813.iam.gserviceaccount.com"
}

# --- Cloud Build Trigger ---
import {
  to = google_cloudbuild_trigger.deploy
  id = "projects/kali-490813/locations/australia-southeast1/triggers/792fd1b4-911f-4b66-9c05-cc634ff485de"
}
