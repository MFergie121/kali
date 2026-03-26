resource "google_cloud_run_v2_service" "kali_afl" {
  name     = var.cloud_run_service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    # Use default compute SA for now — switch to cloud_run_sa after import is stable
    service_account = "${var.project_number}-compute@developer.gserviceaccount.com"

    max_instance_request_concurrency = 80
    timeout                          = "300s"

    scaling {
      max_instance_count = 3
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = ["${var.project_id}:${var.region}:${var.cloud_sql_instance_name}"]
      }
    }

    containers {
      image = "australia-southeast1-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/app:latest"

      ports {
        container_port = 8080
        name           = "http1"
      }

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      # Env vars in the same order as deployed (GCP matches by position)
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = "DATABASE_URL"
            version = "latest"
          }
        }
      }

      env {
        name = "AUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = "AUTH_SECRET"
            version = "latest"
          }
        }
      }

      env {
        name = "GITHUB_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = "GITHUB_CLIENT_ID"
            version = "latest"
          }
        }
      }

      env {
        name = "GITHUB_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = "GITHUB_CLIENT_SECRET"
            version = "latest"
          }
        }
      }

      env {
        name = "GOOGLE_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = "GOOGLE_CLIENT_ID"
            version = "latest"
          }
        }
      }

      env {
        name = "GOOGLE_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = "GOOGLE_CLIENT_SECRET"
            version = "latest"
          }
        }
      }

      env {
        name  = "ORIGIN"
        value = "https://${var.cloud_run_service_name}-${var.project_number}.${var.region}.run.app"
      }

      env {
        name = "ADMIN_EMAIL"
        value_source {
          secret_key_ref {
            secret  = "ADMIN_EMAIL"
            version = "latest"
          }
        }
      }

      env {
        name = "SCRAPE_SECRET"
        value_source {
          secret_key_ref {
            secret  = "SCRAPE_SECRET"
            version = "latest"
          }
        }
      }

      startup_probe {
        tcp_socket {
          port = 8080
        }
        failure_threshold = 1
        period_seconds    = 240
        timeout_seconds   = 240
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  # Cloud Build deploys new images — Terraform must not revert them
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret.secrets,
  ]
}

# Allow unauthenticated access (public website)
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.kali_afl.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
