// import { env } from "$env/dynamic/private";
// import { drizzle } from "drizzle-orm/postgres-js";
// import postgres from "postgres";

// // Cloud SQL URLs have no hostname (e.g. ://user:pass@/db) which breaks
// // Node's URL parser. Insert a dummy host so we can parse it.
// // Fall back to a placeholder during build-time analysis when env vars are absent.
// const rawUrl = env.DATABASE_URL ?? "postgres://build:build@localhost/build";
// const url = new URL(rawUrl.replace("@/", "@localhost/"));
// const socketPath = url.searchParams.get("host");

// const client = postgres({
//   user: decodeURIComponent(url.username),
//   pass: decodeURIComponent(url.password),
//   database: url.pathname.replace(/^\//, ""),
//   ...(socketPath
//     ? { host: socketPath }
//     : { host: url.hostname, ...(url.port && { port: Number(url.port) }) }),
// });

// export const db = drizzle(client);

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Get database connection string from environment variable
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/assurance";

// Create postgres client
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client, { schema });
