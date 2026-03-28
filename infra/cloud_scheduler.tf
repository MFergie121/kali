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

# Weekly fixture sync from Squiggle — every Thursday at 6am AEST
resource "google_cloud_scheduler_job" "sync_fixture" {
  name        = "kali-afl-sync-fixture"
  description = "Sync AFL fixture data from Squiggle"
  region      = var.region
  schedule    = "0 6 * * 4" # Thursday at 6am AEST
  time_zone   = "Australia/Melbourne"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.kali_afl.uri}/api/afl/admin/sync-fixture"
    body        = base64encode("{}")

    headers = {
      "Content-Type"  = "application/json"
      "Authorization" = "Bearer ${data.google_secret_manager_secret_version.scrape_secret.secret_data}"
    }
  }

  retry_config {
    retry_count          = 2
    min_backoff_duration = "30s"
    max_backoff_duration = "120s"
  }

  depends_on = [google_project_service.apis]
}

# Daily tips sync from Squiggle — every day at 10am AEST
resource "google_cloud_scheduler_job" "sync_tips" {
  name        = "kali-afl-sync-tips"
  description = "Sync AFL tipster predictions from Squiggle"
  region      = var.region
  schedule    = "0 10 * * *" # Every day at 10am AEST
  time_zone   = "Australia/Melbourne"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.kali_afl.uri}/api/afl/admin/sync-tips"
    body        = base64encode("{}")

    headers = {
      "Content-Type"  = "application/json"
      "Authorization" = "Bearer ${data.google_secret_manager_secret_version.scrape_secret.secret_data}"
    }
  }

  retry_config {
    retry_count          = 2
    min_backoff_duration = "30s"
    max_backoff_duration = "120s"
  }

  depends_on = [google_project_service.apis]
}
