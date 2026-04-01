# --- Global Application Load Balancer for custom domain ---

# Static external IP address for DNS
resource "google_compute_global_address" "default" {
  name    = "${var.cloud_run_service_name}-lb-ip"
  project = var.project_id

  depends_on = [google_project_service.apis]
}

# Serverless NEG pointing to the Cloud Run service
resource "google_compute_region_network_endpoint_group" "cloud_run" {
  name                  = "${var.cloud_run_service_name}-neg"
  project               = var.project_id
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.kali_afl.name
  }

  depends_on = [google_project_service.apis]
}

# Backend service wrapping the NEG
resource "google_compute_backend_service" "default" {
  name                  = "${var.cloud_run_service_name}-backend"
  project               = var.project_id
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.cloud_run.id
  }
}

# URL map routing all traffic to the backend
resource "google_compute_url_map" "default" {
  name            = "${var.cloud_run_service_name}-url-map"
  project         = var.project_id
  default_service = google_compute_backend_service.default.id
}

# Google-managed SSL certificate for the custom domain
resource "google_compute_managed_ssl_certificate" "default" {
  name    = "${var.cloud_run_service_name}-ssl-cert"
  project = var.project_id

  managed {
    domains = [var.custom_domain]
  }
}

# HTTPS target proxy binding URL map and SSL certificate
resource "google_compute_target_https_proxy" "default" {
  name             = "${var.cloud_run_service_name}-https-proxy"
  project          = var.project_id
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
}

# Global forwarding rule binding static IP to HTTPS proxy on port 443
resource "google_compute_global_forwarding_rule" "default" {
  name                  = "${var.cloud_run_service_name}-https-rule"
  project               = var.project_id
  ip_address            = google_compute_global_address.default.id
  ip_protocol           = "TCP"
  port_range            = "443"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  target                = google_compute_target_https_proxy.default.id

  depends_on = [google_project_service.apis]
}
