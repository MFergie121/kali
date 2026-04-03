variable "project_id" {
  type    = string
  default = "kali-490813"
}

variable "project_number" {
  type    = string
  default = "173366351243"
}

variable "region" {
  type    = string
  default = "australia-southeast1"
}

variable "cloud_sql_instance_name" {
  type    = string
  default = "kali-afl-db"
}

variable "database_name" {
  type    = string
  default = "kali-afl"
}

variable "database_user" {
  type    = string
  default = "kali-afl-user"
}

variable "cloud_run_service_name" {
  type    = string
  default = "kali-afl"
}

variable "artifact_registry_repo" {
  type    = string
  default = "kali-afl"
}

variable "secret_names" {
  type = list(string)
  default = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "ADMIN_EMAIL",
    "SCRAPE_SECRET",
  ]
}

variable "cloud_build_trigger_id" {
  type    = string
  default = "792fd1b4-911f-4b66-9c05-cc634ff485de"
}

variable "github_repo_connection" {
  type    = string
  default = "projects/kali-490813/locations/australia-southeast1/connections/Mfergie121-Github/repositories/MFergie121-kali-afl-stats"
}

variable "custom_domain" {
  description = "Custom domain name for the application (e.g. kaliaflstats.com)"
  type        = string
}
