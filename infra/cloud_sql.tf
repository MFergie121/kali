resource "google_sql_database_instance" "main" {
  name             = var.cloud_sql_instance_name
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier    = "db-f1-micro"
    edition = "ENTERPRISE"

    ip_configuration {
      ipv4_enabled = true
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "kali_afl" {
  name     = var.database_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "kali_afl_user" {
  name     = var.database_user
  instance = google_sql_database_instance.main.name

  # Password managed outside Terraform (already set via gcloud)
  lifecycle {
    ignore_changes = [password]
  }
}
