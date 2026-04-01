terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Start with local state. To migrate to GCS later:
  # 1. Create bucket: gsutil mb -l australia-southeast1 gs://kali-afl-tfstate
  # 2. Uncomment the backend block below
  # 3. Run: terraform init -migrate-state
  #
  # backend "gcs" {
  #   bucket = "kali-afl-tfstate"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required GCP APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudscheduler.googleapis.com",
    "compute.googleapis.com",
    "certificatemanager.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  disable_dependent_services = false
  disable_on_destroy         = false
}
