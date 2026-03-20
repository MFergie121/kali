import { sql } from "drizzle-orm";
import { doublePrecision, integer, pgTable, serial, text } from "drizzle-orm/pg-core";

// ─── Friends ──────────────────────────────────────────────────────────────────

export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  socialLink: text("social_link"),
  email: text("email"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

// ─── Friend Locations ─────────────────────────────────────────────────────────

export const friendLocations = pgTable("friend_locations", {
  id: serial("id").primaryKey(),
  friendId: integer("friend_id")
    .notNull()
    .references(() => friends.id, { onDelete: "cascade" }),
  description: text("description"), // e.g. "lives here", "holiday home"
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Friend = typeof friends.$inferSelect;
export type FriendLocation = typeof friendLocations.$inferSelect;
export type NewFriend = typeof friends.$inferInsert;
export type NewFriendLocation = typeof friendLocations.$inferInsert;
