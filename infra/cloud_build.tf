# Cloud Build trigger — uses 2nd-gen repository connection
resource "google_cloudbuild_trigger" "deploy" {
  name        = "kali-afl-stats"
  location    = var.region
  description = "Runs whenever there is a push to main. Will build docker container, push to artifact and run "

  repository_event_config {
    repository = var.github_repo_connection

    push {
      branch = "^main$"
    }
  }

  filename        = "cloudbuild.yaml"
  service_account = google_service_account.cloud_build_sa.id

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"
}
