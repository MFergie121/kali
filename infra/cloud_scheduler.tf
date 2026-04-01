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

# Scrape latest match every 30min during AFL game windows — Thu/Fri evenings
resource "google_cloud_scheduler_job" "scrape_weeknight" {
  name        = "kali-afl-scrape-weeknight"
  description = "Scrape latest AFL match every 30min Thu–Fri evenings (5pm–midnight AEST)"
  region      = var.region
  schedule    = "*/30 17-23 * * 4,5"
  time_zone   = "Australia/Melbourne"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.kali_afl.uri}/api/afl/admin/scrape/latest"
    body        = base64encode("{}")

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

# Scrape latest match every 30min during AFL game windows — Sat/Sun daytime
resource "google_cloud_scheduler_job" "scrape_weekend" {
  name        = "kali-afl-scrape-weekend"
  description = "Scrape latest AFL match every 30min Sat–Sun (12pm–midnight AEST)"
  region      = var.region
  schedule    = "*/30 12-23 * * 6,0"
  time_zone   = "Australia/Melbourne"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.kali_afl.uri}/api/afl/admin/scrape/latest"
    body        = base64encode("{}")

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

# Reset API key daily usage counters at midnight AEST
resource "google_cloud_scheduler_job" "reset_api_limits" {
  name        = "kali-afl-reset-api-limits"
  description = "Reset daily API key usage counters at midnight"
  region      = var.region
  schedule    = "0 0 * * *" # Daily at midnight AEST
  time_zone   = "Australia/Melbourne"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.kali_afl.uri}/api/afl/admin/reset-api-limits"
    body        = base64encode("{}")

    headers = {
      "Content-Type"  = "application/json"
      "Authorization" = "Bearer ${data.google_secret_manager_secret_version.scrape_secret.secret_data}"
    }
  }

  retry_config {
    retry_count          = 3
    min_backoff_duration = "10s"
    max_backoff_duration = "60s"
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
