import { env } from "$env/dynamic/private";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let dbInstance: ReturnType<typeof drizzle> | null = null;

function createDb() {
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  // Cloud SQL URLs have no hostname (e.g. ://user:pass@/db) which breaks
  // Node's URL parser. Insert a dummy host so we can parse it.
  const url = new URL(databaseUrl.replace("@/", "@localhost/"));
  const socketPath = url.searchParams.get("host");

  const client = postgres({
    user: decodeURIComponent(url.username),
    pass: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ...(socketPath
      ? { host: socketPath }
      : { host: url.hostname, ...(url.port && { port: Number(url.port) }) }),
  });

  return drizzle(client);
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    if (!dbInstance) {
      dbInstance = createDb();
    }

    return Reflect.get(dbInstance as object, prop, receiver);
  },
});
