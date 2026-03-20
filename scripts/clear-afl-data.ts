/**
 * Clears all scraped AFL data from the database.
 * Preserves users and API keys.
 *
 * Usage: npx tsx scripts/clear-afl-data.ts
 */

import Database from "better-sqlite3";
import { join } from "node:path";

const db = new Database(join(process.cwd(), "data", "afl.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

const tables = [
  "player_stats_advanced",
  "player_stats",
  "players",
  "matches",
  "teams",
];

const clear = db.transaction(() => {
  for (const table of tables) {
    const result = db.prepare(`DELETE FROM ${table}`).run();
    console.log(`  ${table}: ${result.changes} rows deleted`);
  }
});

console.log("Clearing AFL data...");
clear();
console.log("Done.");

db.pragma("foreign_keys = ON");
db.close();
