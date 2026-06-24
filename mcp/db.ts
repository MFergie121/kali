// Database layer for the MCP server.
//
// This is deliberately SEPARATE from src/lib/db/afl/index.ts: that module imports
// `$env/dynamic/private`, a SvelteKit/Vite virtual module that does not exist in a
// plain Node process. So the MCP server reads process.env directly and parses the
// DSN with the same Cloud SQL logic.
//
// There are TWO connections, and the split is the core safety idea:
//   - `appDb`     — writable. Used ONLY by the server's own trusted code
//                   (auth + quota accounting). Never runs model-authored SQL.
//   - read-only   — used EXCLUSIVELY by run_query for model-authored SQL. Point
//                   MCP_READONLY_DATABASE_URL at a Postgres role with SELECT-only
//                   grants. The role, not our code, is the real wall.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const STATEMENT_TIMEOUT_MS = Number(process.env.MCP_STATEMENT_TIMEOUT_MS ?? 5000);

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/**
 * Parse a Postgres DSN into postgres-js client options. Mirrors the parsing in
 * src/lib/db/afl/index.ts: Cloud SQL URLs have no hostname (`://user:pass@/db`),
 * which breaks Node's URL parser, so we insert a dummy host before parsing and
 * switch to a Unix socket when a `host=` query param is present.
 */
function optionsFromDsn(dsn: string) {
  const url = new URL(dsn.replace("@/", "@localhost/"));
  const socketPath = url.searchParams.get("host");
  return {
    user: decodeURIComponent(url.username),
    pass: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ...(socketPath
      ? { host: socketPath }
      : { host: url.hostname, ...(url.port && { port: Number(url.port) }) }),
  };
}

// ── Writable connection (trusted server code only) ──
const appClient = postgres(optionsFromDsn(requireEnv("DATABASE_URL")));
export const appDb = drizzle(appClient);

// ── Read-only connection (model-authored SQL only) ──
const readonlyDsn = process.env.MCP_READONLY_DATABASE_URL;
if (!readonlyDsn) {
  console.warn(
    "[mcp] MCP_READONLY_DATABASE_URL not set — falling back to DATABASE_URL. " +
      "run_query is then NOT sandboxed by a read-only role; only the query guard " +
      "protects you. Create a SELECT-only role before deploying anywhere shared.",
  );
}
const readonlyClient = postgres({
  ...optionsFromDsn(readonlyDsn ?? requireEnv("DATABASE_URL")),
  max: 5,
  // Layer 3 safety: kill any statement that runs longer than the timeout (ms).
  connection: { statement_timeout: STATEMENT_TIMEOUT_MS },
});

/**
 * Execute already-guarded SQL on the read-only connection. `.unsafe` runs a raw
 * query string — safe here ONLY because `sql` has passed guardQuery AND this
 * connection is a SELECT-only role.
 */
export async function runReadOnly(
  sql: string,
): Promise<Record<string, unknown>[]> {
  const rows = await readonlyClient.unsafe(sql);
  return rows as unknown as Record<string, unknown>[];
}
