/**
 * Clears all scraped AFL data from the database.
 * Preserves users and API keys.
 *
 * Usage: DATABASE_URL=postgresql://... npx tsx scripts/clear-afl-data.ts
 *    or: npx tsx --env-file=.env scripts/clear-afl-data.ts
 */

import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

const tables = [
  "api_request_log",
  "predictions",
  "tips",
  "fixtures",
  "player_stats_advanced",
  "player_stats",
  "player_team_assignments",
  "players",
  "matches",
  "teams",
];

console.log("Clearing AFL data...");

await sql`TRUNCATE ${sql(tables)} RESTART IDENTITY CASCADE`;

for (const table of tables) {
  console.log(`  ${table}: cleared`);
}

await sql.end();
console.log("Done.");
