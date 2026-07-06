/**
 * One-off backfill for the per-user quota / hashed-keys migration (issue #6).
 *
 * Run this AFTER the additive columns exist (key_hash, key_prefix on api_keys;
 * usage, limit, reset_at on kali_users) and BEFORE the plaintext `key` column is
 * dropped. It is idempotent — re-running only touches rows still missing values.
 *
 * Migration order (db:push, per CLAUDE.md — no file-based migrations):
 *   1. Push additive nullable columns.
 *   2. Run this script.                      <-- you are here
 *   3. Push: drop api_keys.key + api_keys.limit, add the unique index on
 *      key_hash, set the new columns NOT NULL.
 *
 * Usage: npx tsx --env-file=.env scripts/hash-api-keys.ts
 *   (prod: start cloud-sql-proxy and point DATABASE_URL at localhost first)
 */

import { createHash } from "node:crypto";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const DEFAULT_LIMIT = process.env.API_KEY_DEFAULT_LIMIT
  ? parseInt(process.env.API_KEY_DEFAULT_LIMIT)
  : 1000;

/** Next 00:00 UTC boundary strictly after `now` — must match quota-window.ts. */
function nextResetAt(now = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString();
}

const sql = postgres(process.env.DATABASE_URL);

// ─── Keys: backfill key_hash + key_prefix from the plaintext `key` ───────────
const keys = await sql<{ id: number; key: string }>`
  SELECT id, key FROM api_keys WHERE key_hash IS NULL
`;
console.log(`Hashing ${keys.length} API key(s)...`);
for (const { id, key } of keys) {
  const keyHash = createHash("sha256").update(key).digest("hex");
  const keyPrefix = key.slice(0, 8);
  await sql`
    UPDATE api_keys SET key_hash = ${keyHash}, key_prefix = ${keyPrefix}
    WHERE id = ${id}
  `;
}

// ─── Users: initialise the per-user quota bucket ─────────────────────────────
const reset = nextResetAt();
const users = await sql`
  UPDATE kali_users SET
    usage = COALESCE(usage, 0),
    "limit" = COALESCE("limit", ${DEFAULT_LIMIT}),
    reset_at = COALESCE(reset_at, ${reset})
  WHERE reset_at IS NULL OR "limit" IS NULL
  RETURNING id
`;
console.log(`Initialised quota bucket for ${users.length} user(s).`);

await sql.end();
console.log("Done.");
