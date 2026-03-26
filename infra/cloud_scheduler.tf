# Cloud Scheduler job for automated AFL data scraping
resource "google_cloud_scheduler_job" "scrape" {
  name        = "kali-afl-scrape"
  description = "Trigger AFL stats scrape"
  region      = var.region
  schedule    = "0 6 * * *" # Daily at 6am AEST
  time_zone   = "Australia/Melbourne"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.kali_afl.uri}/api/afl/admin/scrape"

    headers = {
      "Content-Type"  = "application/json"
      "Authorization" = "Bearer ${data.google_secret_manager_secret_version.scrape_secret.secret_data}"
    }
  }

  retry_config {
    retry_count          = 1
    min_backoff_duration = "10s"
    max_backoff_duration = "60s"
  }

  depends_on = [google_project_service.apis]
}
