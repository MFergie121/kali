// Auth + quota for the MCP server.
//
// Reuses the project's PURE credential/quota modules (key-crypto, quota-window),
// which have no SvelteKit/DB imports and so are safe to pull into a plain Node
// process. The quota UPDATE mirrors validateApiKey in
// src/lib/db/afl/service.ts — that function can't be imported here (it transitively
// pulls in `$env/dynamic/private`), so the atomic UPDATE is duplicated and must be
// kept in sync by hand if the quota rules ever change.

import { and, eq, sql } from "drizzle-orm";
import { appDb } from "./db.js";
import { apiKeys, kaliUsers } from "../src/lib/db/afl/schema.js";
import { hashApiKey } from "../src/lib/api/key-crypto.js";
import { nextResetAt } from "../src/lib/api/quota-window.js";

export interface ResolvedKey {
  apiKeyId: number;
  userId: number;
}

/**
 * Resolve a bearer token to its owning user. No quota effect — this is the free
 * path used to authenticate every MCP request. Returns null for missing/revoked
 * keys (the caller maps that to 401).
 */
export async function resolveApiKey(
  rawKey: string,
): Promise<ResolvedKey | null> {
  const hash = hashApiKey(rawKey);
  const [key] = await appDb
    .select({ apiKeyId: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.revoked, false)));
  return key ?? null;
}

export interface QuotaResult {
  ok: boolean;
  limit: number | null;
  remaining: number | null;
  resetAt: string;
}

/**
 * Atomic lazy-reset + check-increment of the user's shared daily quota. The
 * SET arms and the WHERE guard are evaluated by Postgres against the same
 * pre-update row, so two concurrent calls can neither both pass the boundary
 * (TOCTOU) nor lose an increment. Zero rows returned ⇒ over limit (429).
 *
 * Only run_query calls this; list_tables / describe_table are free.
 */
export async function consumeUserQuota(userId: number): Promise<QuotaResult> {
  const now = new Date().toISOString();
  const next = nextResetAt(new Date(now));

  const rows = await appDb.execute<{
    usage: number;
    limit: number | null;
    reset_at: string | null;
  }>(sql`
    UPDATE ${kaliUsers} SET
      usage = CASE WHEN ${kaliUsers.resetAt} IS NULL OR ${now} >= ${kaliUsers.resetAt}
                   THEN 1 ELSE ${kaliUsers.usage} + 1 END,
      reset_at = CASE WHEN ${kaliUsers.resetAt} IS NULL OR ${now} >= ${kaliUsers.resetAt}
                      THEN ${next} ELSE ${kaliUsers.resetAt} END,
      total_api_usage = ${kaliUsers.totalApiUsage} + 1,
      last_active_at = ${now}
    WHERE ${kaliUsers.id} = ${userId}
      AND (${kaliUsers.limit} IS NULL
           OR ${kaliUsers.usage} < ${kaliUsers.limit}
           OR ${kaliUsers.resetAt} IS NULL
           OR ${now} >= ${kaliUsers.resetAt})
    RETURNING ${kaliUsers.usage} AS usage, ${kaliUsers.limit} AS limit, ${kaliUsers.resetAt} AS reset_at
  `);

  const row = rows[0];
  if (!row) {
    // Over limit within the current window. One extra read for accurate figures.
    const [u] = await appDb
      .select({ limit: kaliUsers.limit, resetAt: kaliUsers.resetAt })
      .from(kaliUsers)
      .where(eq(kaliUsers.id, userId));
    return {
      ok: false,
      limit: u?.limit ?? null,
      remaining: 0,
      resetAt: u?.resetAt ?? next,
    };
  }

  const limit = row.limit;
  return {
    ok: true,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - row.usage),
    resetAt: row.reset_at ?? next,
  };
}
