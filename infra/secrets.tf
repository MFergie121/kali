# Secret Manager secrets (containers only — values managed outside Terraform)
resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(var.secret_names)
  secret_id = each.value

  replication {
    auto {}
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Data source to read SCRAPE_SECRET for Cloud Scheduler auth header
# Note: this puts the secret value in Terraform state — keep state file secure
data "google_secret_manager_secret_version" "scrape_secret" {
  secret = "SCRAPE_SECRET"

  depends_on = [google_secret_manager_secret.secrets]
}
