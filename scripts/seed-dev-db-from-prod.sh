#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

INSTANCE_CONNECTION_NAME="${INSTANCE_CONNECTION_NAME:-kali-490813:australia-southeast1:kali-afl-db}"
PROD_PROXY_PORT="${PROD_PROXY_PORT:-5436}"
LOCAL_DB_URL="${LOCAL_DB_URL:-postgresql://postgres:postgres@localhost:5435/kali-afl}"
PROD_DB_USER="${PROD_DB_USER:-kali-afl-user}"
PROD_DB_NAME="${PROD_DB_NAME:-kali-afl}"
DUMP_FILE="${DUMP_FILE:-tmp/prod-without-users-api-keys.dump}"
PROXY_LOG="${PROXY_LOG:-tmp/cloud-sql-proxy.log}"

proxy_pid=""
started_proxy="false"

cleanup() {
	if [[ -n "$proxy_pid" ]] && kill -0 "$proxy_pid" 2>/dev/null; then
		kill "$proxy_pid" >/dev/null 2>&1 || true
	fi
}

trap cleanup EXIT

require_command() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Error: $1 is not installed or is not on PATH." >&2
		exit 1
	fi
}

wait_for_port() {
	local host="$1"
	local port="$2"
	local label="$3"
	local attempts="${4:-30}"

	for _ in $(seq 1 "$attempts"); do
		if nc -z "$host" "$port" >/dev/null 2>&1; then
			return 0
		fi
		sleep 1
	done

	echo "Error: timed out waiting for $label on $host:$port." >&2
	if [[ "$label" == "Cloud SQL Auth Proxy" && -f "$PROXY_LOG" ]]; then
		echo "Recent Cloud SQL Auth Proxy output:" >&2
		tail -n 20 "$PROXY_LOG" >&2 || true
	fi
	exit 1
}

require_command docker
require_command cloud-sql-proxy
require_command nc
require_command node
require_command pg_dump
require_command pg_restore

mkdir -p "$(dirname "$DUMP_FILE")"

echo "Starting local PostgreSQL container..."
docker compose up -d db

echo "Waiting for local PostgreSQL on localhost:5435..."
wait_for_port localhost 5435 "local PostgreSQL"

if nc -z localhost "$PROD_PROXY_PORT" >/dev/null 2>&1; then
	echo "Using existing Cloud SQL Auth Proxy on localhost:$PROD_PROXY_PORT."
else
	echo "Starting Cloud SQL Auth Proxy for $INSTANCE_CONNECTION_NAME on localhost:$PROD_PROXY_PORT..."
	cloud-sql-proxy "$INSTANCE_CONNECTION_NAME" --port "$PROD_PROXY_PORT" >"$PROXY_LOG" 2>&1 &
	proxy_pid="$!"
	started_proxy="true"
	wait_for_port localhost "$PROD_PROXY_PORT" "Cloud SQL Auth Proxy"
fi

if [[ -n "${PROD_DATABASE_URL:-}" ]]; then
	prod_database_url="$PROD_DATABASE_URL"
else
	if [[ -z "${PROD_DB_PASSWORD:-}" ]]; then
		printf "Cloud SQL password for %s: " "$PROD_DB_USER"
		read -r -s PROD_DB_PASSWORD
		printf "\n"
	fi

	encoded_password="$(
		PROD_DB_PASSWORD="$PROD_DB_PASSWORD" node -e 'process.stdout.write(encodeURIComponent(process.env.PROD_DB_PASSWORD ?? ""))'
	)"
	prod_database_url="postgresql://${PROD_DB_USER}:${encoded_password}@localhost:${PROD_PROXY_PORT}/${PROD_DB_NAME}"
fi

echo "Dumping production data without kali_users and api_keys..."
pg_dump \
	"$prod_database_url" \
	--format=custom \
	--exclude-table=kali_users \
	--exclude-table=api_keys \
	--file="$DUMP_FILE"

echo "Restoring dump into local dev database..."
pg_restore \
	--clean \
	--if-exists \
	--no-owner \
	--no-acl \
	--dbname="$LOCAL_DB_URL" \
	"$DUMP_FILE"

echo "Done. Local dev database has been refreshed from production AFL data."

if [[ "$started_proxy" == "true" ]]; then
	echo "Stopped temporary Cloud SQL Auth Proxy."
fi
