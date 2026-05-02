# Repository Guidelines

## Project Structure & Module Organization

This repository contains Terraform infrastructure for the Kali AFL Google Cloud deployment. Files are split by service:

- `main.tf`: Terraform version, Google provider, and required GCP APIs.
- `variables.tf`, `terraform.tfvars`, `outputs.tf`: inputs, local environment values, and exported values.
- `cloud_run.tf`, `cloud_sql.tf`, `cloud_scheduler.tf`, `cloud_build.tf`: runtime, database, scheduled jobs, and CI trigger resources.
- `artifact_registry.tf`, `iam.tf`, `secrets.tf`, `load_balancer.tf`, `imports.tf`: supporting platform resources and imported existing infrastructure.

There is no application source or test suite here; keep service-specific infrastructure in clearly named `*.tf` files.

## Build, Test, and Development Commands

- `terraform init`: installs providers and prepares local state.
- `terraform fmt`: formats all Terraform files in place before committing.
- `terraform validate`: checks syntax and provider configuration.
- `terraform plan`: previews infrastructure changes against the configured GCP project.
- `terraform apply`: applies reviewed changes after plan inspection.
- `terraform import <address> <id>`: brings existing GCP resources under management; record imports in `imports.tf` when practical.

Run commands from this `infra` directory.

## Coding Style & Naming Conventions

Use standard Terraform formatting via `terraform fmt` with two-space indentation. Prefer descriptive resource names that match the managed GCP service, for example `google_cloud_run_v2_service` resources in `cloud_run.tf`. Keep variables in `snake_case`, and add a `description` when the purpose is not obvious. Avoid hard-coding environment-specific values inside resources; place them in `variables.tf` or `terraform.tfvars`.

## Testing Guidelines

Before opening a PR, run `terraform fmt`, `terraform validate`, and `terraform plan`. Treat the plan as the primary test artifact: check for accidental destroys, IAM broadening, region changes, and secret exposure. For imported resources, verify that a follow-up plan is empty or contains only intentional drift correction.

## Commit & Pull Request Guidelines

Recent history uses short Conventional Commit-style prefixes such as `fix:` and `feat:`. Follow that pattern: `fix: update cloud run env vars` or `feat: add scheduler job`.

Pull requests should include a concise change summary, the relevant `terraform plan` outcome, any required manual GCP steps, and linked issues when applicable. Include screenshots only for visible infrastructure effects such as load balancer or domain configuration changes.

## Security & Configuration Tips

Do not commit new secrets, credentials, or generated private keys. Secret values should live in Google Secret Manager and be referenced by Terraform. Be careful with `terraform.tfstate`, `terraform.tfstate.backup`, and `terraform.tfvars`; they may contain sensitive or environment-specific data.
