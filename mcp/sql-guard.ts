// Query guard for model-authored SQL (Layer 2 of defence in depth).
//
// The read-only Postgres role is the REAL wall — even if every check here is
// bypassed, a SELECT-only role cannot mutate data. This guard exists to (a) give
// the model a fast, readable rejection instead of an opaque permission error, and
// (b) enforce the row cap. It is a heuristic (whole-word match on comment-stripped
// SQL), not a parser. If you want airtight validation, swap in a real Postgres
// parser such as libpg-query; the role guarantees safety in the meantime.

export const MAX_ROWS = Number(process.env.MCP_MAX_ROWS ?? 1000);

export class QueryRejected extends Error {}

// Statement types / keywords that must never appear in a read-only query.
const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|comment|copy|merge|call|do|vacuum|analyze|reindex|cluster|listen|notify|lock|set|reset|begin|commit|rollback|savepoint|prepare|execute|deallocate|refresh|attach|detach|pg_sleep|pg_read_file|pg_ls_dir|lo_import|lo_export)\b/i;

function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ") // block comments
    .replace(/--[^\n]*/g, " "); // line comments
}

/**
 * Validate model-authored SQL and return an execution-ready statement wrapped in
 * a hard row cap. Throws QueryRejected with a model-readable reason on failure.
 */
export function guardQuery(raw: string): string {
  const cleaned = stripComments(raw)
    .trim()
    .replace(/;+\s*$/, ""); // drop a single trailing semicolon

  if (!cleaned) throw new QueryRejected("Empty query.");

  // Reject multiple statements (e.g. `SELECT 1; DROP TABLE x`).
  if (cleaned.includes(";")) {
    throw new QueryRejected(
      "Multiple statements are not allowed — send a single SELECT.",
    );
  }

  // Must be a read. `WITH ... SELECT` is allowed.
  if (!/^\s*(select|with)\b/i.test(cleaned)) {
    throw new QueryRejected(
      "Only SELECT / WITH (read-only) queries are allowed.",
    );
  }

  const match = cleaned.match(FORBIDDEN);
  if (match) {
    throw new QueryRejected(
      `Disallowed keyword "${match[0]}". Only read-only SELECT queries are permitted.`,
    );
  }

  // Wrap in an outer LIMIT so the cap always holds, regardless of the inner
  // query. Subqueries, CTEs, and any inner LIMIT are respected; this can only
  // ever tighten the result size.
  return `SELECT * FROM (\n${cleaned}\n) AS _mcp_result LIMIT ${MAX_ROWS}`;
}
