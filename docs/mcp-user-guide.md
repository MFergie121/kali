# kali AFL MCP server — user guide

Connect Claude to the kali AFL database and ask football questions in plain English.
Claude writes the SQL for you, runs it read-only against the database, and answers from
the results — you never write a query yourself.

This guide covers installing the server using the Claude Code CLI (`claude mcp add`).

---

## What you get

Once connected, Claude can answer questions like:

- "Which team had the highest average crowd in 2024?"
- "Show me Marcus Bontempelli's disposals per game this season."
- "Who are the top 10 goal-kickers across the last three rounds?"
- "Compare home vs away win rates for Geelong since 2016."

Under the hood Claude has three tools:

| Tool | What it does | Counts against quota? |
| --- | --- | --- |
| `list_tables` | Lists the AFL tables it can read | No |
| `describe_table` | Shows the columns of one table | No |
| `run_query` | Runs one read-only `SELECT` and returns rows | **Yes** |

Only `run_query` uses your quota, so browsing the schema is free.

---

## Before you start

You need two things:

1. **Claude Code** installed (the `claude` command in your terminal).
   Check with:
   ```bash
   claude --version
   ```
2. **A kali API key.** This is your personal access key — keep it secret, like a password.

### Getting your API key

1. Sign in to the kali web app.
2. Go to the **API Keys** page (under your account / admin area).
3. Click **Create key**.
4. **Copy the key immediately.** It is shown **once** and never again — if you lose it,
   you delete it and make a new one. The key looks something like `kali_ab12cd34...`.

> Your daily request quota is shared across **all** of your keys (it's per-user, not
> per-key), so you don't need a separate key for each device.

---

## Install the server

Run this in your terminal, replacing `<your-kali-api-key>` with your key:

```bash
claude mcp add --transport http kali-afl https://kali-afl-mcp-173366351243.australia-southeast1.run.app/mcp \
  --header "Authorization: Bearer <your-kali-api-key>"
```

- `kali-afl` — a local name for the connection (you can call it anything).
- `https://kali-afl-mcp-173366351243.australia-southeast1.run.app/mcp` — the address of the kali MCP server.
- `<your-kali-api-key>` — the key you copied above. Keep the word `Bearer ` in front of it.

By default this adds the server to your **current project** only. To use it in every
project on your machine, add `--scope user`:

```bash
claude mcp add --transport http kali-afl https://kali-afl-mcp-173366351243.australia-southeast1.run.app/mcp \
  --header "Authorization: Bearer <your-kali-api-key>" \
  --scope user
```

### Verify it worked

List your configured servers and check the connection status:

```bash
claude mcp list
```

You should see `kali-afl` marked as connected. You can also run `/mcp` inside an
interactive Claude session to see the server and its tools.

---

## Using it

Just ask Claude football questions in normal language. For example:

> *"Using the kali AFL data, which five players had the most disposals in 2024?"*

Claude will typically:

1. Call `list_tables` to see what's available,
2. Call `describe_table` on the relevant table(s) to learn the columns,
3. Write a `SELECT` and call `run_query`,
4. Answer you from the rows it gets back.

You don't have to mention the tools — Claude picks them automatically. Mentioning
"kali" or "AFL data" in your first question helps it choose this server.

### Tables you can ask about

`teams`, `matches`, `fixtures`, `tips`, `predictions`, `players`,
`player_team_assignments`, `player_stats`, `player_stats_advanced`.

(User accounts and API keys are **not** accessible — the server can only read AFL data.)

---

## Limits & quotas

- **Read-only.** Claude can only `SELECT`. It cannot change or delete any data.
- **Daily quota.** Each `run_query` counts against your personal daily limit. When you
  hit it, Claude will tell you the limit is exceeded and when it resets (midnight UTC).
  Schema lookups (`list_tables` / `describe_table`) are free.
- **Row cap.** A single query returns at most 1,000 rows. Ask Claude to aggregate or
  add filters if you need a summary of a larger set.
- **One statement at a time.** Each query is a single `SELECT` (or `WITH ... SELECT`).

---

## Troubleshooting

**`claude mcp list` shows it failed / not connected**
- Double-check the URL ends in `/mcp`.
- Confirm the header is exactly `Authorization: Bearer <key>` (the word `Bearer`, a
  space, then your key).

**Claude says "Unauthorized" (401)**
- Your API key is wrong, expired, or was deleted. Create a fresh key in the web app and
  re-add the server.

**Claude says the rate limit is exceeded (429)**
- You've used your daily quota. Wait for the reset (midnight UTC) or ask whoever runs
  kali to raise your limit.

**Claude says a query was rejected**
- The server only allows read-only `SELECT`s. Rephrase your question — you never need to
  ask for changes, only for information.

### Updating your key

If you rotate your key, remove the server and add it again with the new key:

```bash
claude mcp remove kali-afl
claude mcp add --transport http kali-afl https://kali-afl-mcp-173366351243.australia-southeast1.run.app/mcp \
  --header "Authorization: Bearer <your-new-key>"
```

### Removing the server

```bash
claude mcp remove kali-afl
```

---

## Claude Code only (for now)

This server currently works with **Claude Code** only.

It's a **remote** MCP server that uses the **HTTP transport**. Claude Desktop doesn't
support HTTP MCP servers — it only connects to local (stdio) servers launched from your
machine — so it can't reach this one. This guide will be updated if and when Desktop
support becomes available.
