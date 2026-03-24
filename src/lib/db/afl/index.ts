// import { env } from '$env/dynamic/private';
// import postgres from 'postgres';
// import { drizzle } from 'drizzle-orm/postgres-js';
// import * as schema from './schema';

// // Cloud SQL URLs have no hostname (e.g. ://user:pass@/db) which breaks
// // Node's URL parser. Insert a dummy host so we can parse it.
// const url = new URL(env.DATABASE_URL.replace('@/', '@localhost/'));
// const socketPath = url.searchParams.get('host');

// const client = postgres({
// 	user: decodeURIComponent(url.username),
// 	pass: decodeURIComponent(url.password),
// 	database: url.pathname.replace(/^\//, ''),
// 	...(socketPath
// 		? { host: socketPath }
// 		: { host: url.hostname, ...(url.port && { port: Number(url.port) }) }),
// });

import { env } from "$env/dynamic/private";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// 1. Fail-fast validation
if (!env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. If deploying to Cloud Run, check Secret Manager mappings.",
  );
}

/**
 * 2. Driver Initialization
 * The 'postgres' library is smart. If you pass the connection string directly,
 * it handles most parsing. If you need to override the host for Unix sockets,
 * you can do it in the options object.
 */
const client = postgres(env.DATABASE_URL, {
  // Cloud Run is serverless and scales horizontally.
  // High 'max' values can quickly exhaust Cloud SQL connections.
  max: 1,

  // Standard for Cloud SQL Auth Proxy to prevent 'prepared statement' errors
  // during instance restarts or migrations.
  prepare: false,

  // If your URL string doesn't include the socket path,
  // you can explicitly set it here, but usually, it's better to keep
  // it in the connection string itself.
});

export const db = drizzle(client, { schema });
