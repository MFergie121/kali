import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/global-friends/schema.ts",
  out: "./drizzle/global-friends",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/global-friends.db",
  },
});
