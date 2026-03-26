resource "google_artifact_registry_repository" "kali_afl" {
  location      = var.region
  repository_id = var.artifact_registry_repo
  format        = "DOCKER"
}
