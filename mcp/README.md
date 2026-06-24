# kali-afl MCP server

A remote [Model Context Protocol](https://modelcontextprotocol.io) server that lets an
LLM answer AFL questions by writing read-only SQL against the kali Postgres database.
Authenticated with the same API keys as the REST API, metered by the same per-user
daily quota.

## How it works

```
MCP client (Claude Desktop / Code)
        │  POST /mcp   Authorization: Bearer <kali API key>
        ▼
  server.ts  ── stateless: fresh McpServer + transport per request
        │
        ├── resolveApiKey (writable conn)         → 401 if invalid
        │
        └── tools
             ├── list_tables      (free)   schema-docs.ts
             ├── describe_table   (free)   schema-docs.ts
             └── run_query        (metered)
                    ├── consumeUserQuota (writable conn)  → 429 if over limit
                    ├── guardQuery        (sql-guard.ts)  → reject non-SELECT
                    └── runReadOnly       (READ-ONLY conn) → execute, cap rows
```

The two connections are the heart of the safety model:

- **Writable** (`DATABASE_URL`) — used only by trusted server code (auth + quota).
- **Read-only** (`MCP_READONLY_DATABASE_URL`) — used **only** for model-authored SQL.
  This role is the real wall; the SQL guard is a friendly pre-check on top of it.

## Files

| File | Responsibility |
| --- | --- |
| `server.ts` | HTTP + MCP wiring, the three tools, stateless transport |
| `auth.ts` | `resolveApiKey` (free) + `consumeUserQuota` (atomic, mirrors `service.ts`) |
| `db.ts` | The two Postgres connections + `runReadOnly` |
| `sql-guard.ts` | Single-statement / SELECT-only / row-cap validation |
| `schema-docs.ts` | Human-readable table + column docs (drives answer accuracy) |

## Environment variables

| Var | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Writable connection for auth + quota |
| `MCP_READONLY_DATABASE_URL` | prod | Read-only role for model SQL. Falls back to `DATABASE_URL` locally (with a warning) |
| `PORT` / `MCP_PORT` | no | Listen port (default 8788) |
| `MCP_MAX_ROWS` | no | Hard row cap on `run_query` (default 1000) |
| `MCP_STATEMENT_TIMEOUT_MS` | no | Per-query timeout on the read-only conn (default 5000) |

## The read-only role (v1)

Create a SELECT-only role granted access to the AFL data tables **only** — never
`kali_users`, `api_keys`, or `api_request_log` (they hold emails + key hashes):

```sql
CREATE ROLE afl_mcp_readonly LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE kali TO afl_mcp_readonly;
GRANT USAGE ON SCHEMA public TO afl_mcp_readonly;

GRANT SELECT ON
  teams, matches, fixtures, tips, predictions,
  players, player_team_assignments, player_stats, player_stats_advanced
TO afl_mcp_readonly;

-- Explicitly NOT granted: kali_users, api_keys, api_request_log.
```

Then point `MCP_READONLY_DATABASE_URL` at that role.

## Run it locally

```bash
# from repo root
npm run mcp:dev      # tsx watch, reads .env
# or
npm run mcp:start    # one-off
npm run mcp:check    # type-check just the MCP server
```

Smoke-test without an MCP client:

```bash
# initialize handshake (needs a valid key)
curl -s localhost:8788/mcp \
  -H 'Authorization: Bearer <your-key>' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

## Connect an MCP client

For an HTTP MCP server, point the client at the URL and pass the key as a bearer
header. Example client config:

```json
{
  "mcpServers": {
    "kali-afl": {
      "type": "http",
      "url": "https://<mcp-service-url>/mcp",
      "headers": { "Authorization": "Bearer <your-kali-api-key>" }
    }
  }
}
```

## Notes / known limits (v1)

- **Stateless mode** keeps each request independent (no cross-request server→client
  streaming). Fine for request/response tools; that's all we use.
- **The guard is a heuristic**, not a SQL parser. The read-only role is the real
  guarantee. Swap in `libpg-query` for airtight validation later.
- **`information_schema` / `pg_catalog`** remain readable by the role (schema, not
  data). Harmless and occasionally useful to the model.
