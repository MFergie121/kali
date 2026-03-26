output "cloud_run_url" {
  value = google_cloud_run_v2_service.kali_afl.uri
}

output "cloud_run_service_account" {
  value = google_service_account.cloud_run_sa.email
}

output "cloud_sql_connection_name" {
  value = google_sql_database_instance.main.connection_name
}
