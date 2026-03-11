import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/afl/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/afl.db",
  },
});
