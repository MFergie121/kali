import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ─── Friends ──────────────────────────────────────────────────────────────────

export const friends = sqliteTable("friends", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  socialLink: text("social_link"),
  email: text("email"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

// ─── Friend Locations ─────────────────────────────────────────────────────────

export const friendLocations = sqliteTable("friend_locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  friendId: integer("friend_id")
    .notNull()
    .references(() => friends.id, { onDelete: "cascade" }),
  description: text("description"), // e.g. "lives here", "holiday home"
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Friend = typeof friends.$inferSelect;
export type FriendLocation = typeof friendLocations.$inferSelect;
export type NewFriend = typeof friends.$inferInsert;
export type NewFriendLocation = typeof friendLocations.$inferInsert;
