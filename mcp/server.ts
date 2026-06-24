// kali-afl MCP server — remote, Streamable HTTP, API-key authenticated.
//
// Shape (the lessons, in order):
//   1. Transport: Streamable HTTP at POST /mcp.
//   2. Stateless: a fresh McpServer + transport PER request, so nothing is held in
//      memory between requests and the service scales cleanly across Cloud Run
//      instances. (sessionIdGenerator: undefined puts the transport in stateless mode.)
//   3. Auth at the HTTP layer: resolve the bearer key → user (free). 401 if absent.
//   4. Three tools: list_tables / describe_table (free) and run_query (metered).
//   5. Trust boundary: run_query meters quota, guards the SQL, then runs it on the
//      read-only connection. Errors the model can fix are returned as tool results
//      (isError: true), not protocol errors, so the model can self-correct.

import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { resolveApiKey, consumeUserQuota, type ResolvedKey } from "./auth.js";
import { listTablesText, describeTableText } from "./schema-docs.js";
import { guardQuery, QueryRejected, MAX_ROWS } from "./sql-guard.js";
import { runReadOnly } from "./db.js";

const PORT = Number(process.env.PORT ?? process.env.MCP_PORT ?? 8788);

function text(body: string, isError = false) {
  return { content: [{ type: "text" as const, text: body }], isError };
}

/** Build an MCP server whose tools are bound to the authenticated user. */
function buildServer(user: ResolvedKey): McpServer {
  const server = new McpServer({ name: "kali-afl-mcp", version: "0.1.0" });

  server.registerTool(
    "list_tables",
    {
      description:
        "List the AFL data tables you can query, each with a one-line purpose. " +
        "Call this first, then describe_table for columns, then run_query.",
      inputSchema: {},
    },
    async () => text(listTablesText()),
  );

  server.registerTool(
    "describe_table",
    {
      description:
        "Show columns, types, and human-readable descriptions for one AFL table. " +
        "Always describe a table before writing SQL against it — column names are not guessable.",
      inputSchema: { table: z.string().describe("Table name, e.g. 'player_stats'") },
    },
    async ({ table }) => {
      const doc = describeTableText(table);
      if (!doc) {
        return text(`Unknown table "${table}". Call list_tables to see valid names.`, true);
      }
      return text(doc);
    },
  );

  server.registerTool(
    "run_query",
    {
      description:
        `Run ONE read-only PostgreSQL SELECT (or WITH ... SELECT) against the AFL ` +
        `database and return up to ${MAX_ROWS} rows as JSON. No INSERT/UPDATE/DELETE/DDL. ` +
        `Call describe_table first so column names are correct.`,
      inputSchema: { sql: z.string().describe("A single read-only SELECT statement.") },
    },
    async ({ sql }) => {
      // run_query is the only metered tool: consume quota up front.
      const quota = await consumeUserQuota(user.userId);
      if (!quota.ok) {
        return text(`Rate limit exceeded. Your quota resets at ${quota.resetAt}.`, true);
      }

      let guarded: string;
      try {
        guarded = guardQuery(sql);
      } catch (e) {
        if (e instanceof QueryRejected) return text(`Query rejected: ${e.message}`, true);
        throw e;
      }

      try {
        const rows = await runReadOnly(guarded);
        const json = JSON.stringify(rows, (_k, v) =>
          typeof v === "bigint" ? v.toString() : v,
        );
        const remaining = quota.remaining === null ? "unlimited" : String(quota.remaining);
        return text(`${rows.length} row(s). Quota remaining: ${remaining}.\n${json}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // A SQL error is the model's to fix — hand it back as a tool result.
        return text(`SQL error: ${msg}. Call describe_table to check column names.`, true);
      }
    },
  );

  return server;
}

function unauthorized(res: http.ServerResponse) {
  res.writeHead(401, {
    "Content-Type": "application/json",
    "WWW-Authenticate": "Bearer",
  });
  res.end(
    JSON.stringify({
      error: "Unauthorized: provide a valid kali API key as 'Authorization: Bearer <key>'.",
    }),
  );
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : undefined;
}

const httpServer = http.createServer(async (req, res) => {
  const path = (req.url ?? "").split("?")[0];

  if (req.method === "GET" && path === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (path !== "/mcp") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. POST MCP requests to /mcp." }));
    return;
  }

  // Stateless transport ⇒ only POST is meaningful (no long-lived SSE GET stream).
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json", Allow: "POST" });
    res.end(JSON.stringify({ error: "Method not allowed. Use POST." }));
    return;
  }

  // ── Auth (HTTP layer) ──
  const authHeader = req.headers["authorization"];
  const key =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
  if (!key) return unauthorized(res);

  let user: ResolvedKey | null;
  try {
    user = await resolveApiKey(key);
  } catch (e) {
    console.error("[mcp] auth error", e);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal error during authentication." }));
    return;
  }
  if (!user) return unauthorized(res);

  let body: unknown;
  try {
    body = await readBody(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON body." }));
    return;
  }

  // ── Stateless MCP: fresh server + transport per request ──
  const server = buildServer(user);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (e) {
    console.error("[mcp] request error", e);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error." }));
    }
  }
});

httpServer.listen(PORT, () => {
  console.log(`[mcp] kali-afl MCP server listening on :${PORT} (POST /mcp)`);
});
