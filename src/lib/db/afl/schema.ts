import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";


// ─── Teams ───────────────────────────────────────────────────────────────────

export const teams = pgTable("teams", {
  id: text("id").primaryKey(), // slug e.g. "sydney-swans"
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
});

// ─── Matches ─────────────────────────────────────────────────────────────────

export const matches = pgTable("matches", {
  id: integer("id").primaryKey(), // footywire match id (mid)
  round: integer("round").notNull(),
  year: integer("year").notNull(),
  homeTeamId: text("home_team_id")
    .notNull()
    .references(() => teams.id),
  awayTeamId: text("away_team_id")
    .notNull()
    .references(() => teams.id),
  venue: text("venue").notNull(),
  date: text("date").notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  crowd: integer("crowd"),
  sourcedAt: text("sourced_at").notNull(),
});

// ─── Players ─────────────────────────────────────────────────────────────────

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    currentTeamId: text("current_team_id")
      .notNull()
      .references(() => teams.id),
    onlineId: text("online_id"),
  },
  (t) => [uniqueIndex("players_online_id_idx").on(t.onlineId)],
);

// ─── Player Team Assignments ──────────────────────────────────────────────────

export const playerTeamAssignments = pgTable(
  "player_team_assignments",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    startYear: integer("start_year").notNull(),
    endYear: integer("end_year"), // null = currently at this club
    reason: text("reason"),       // "trade" | "rookie" | "rookie-elevated" | "delisted" | "retirement"
  },
  (t) => [
    uniqueIndex("pta_player_team_start_idx").on(t.playerId, t.teamId, t.startYear),
  ],
);

// ─── Player Stats ─────────────────────────────────────────────────────────────

export const playerStats = pgTable(
  "player_stats",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id),
    teamId: text("team_id").references(() => teams.id),
    kicks: integer("kicks").notNull().default(0),
    handballs: integer("handballs").notNull().default(0),
    disposals: integer("disposals").notNull().default(0),
    marks: integer("marks").notNull().default(0),
    goals: integer("goals").notNull().default(0),
    behinds: integer("behinds").notNull().default(0),
    tackles: integer("tackles").notNull().default(0),
    hitouts: integer("hitouts").notNull().default(0),
    goalAssists: integer("goal_assists").notNull().default(0),
    inside50s: integer("inside_50s").notNull().default(0),
    clearances: integer("clearances").notNull().default(0),
    clangers: integer("clangers").notNull().default(0),
    rebound50s: integer("rebound_50s").notNull().default(0),
    freesFor: integer("frees_for").notNull().default(0),
    freesAgainst: integer("frees_against").notNull().default(0),
    aflFantasyPts: integer("afl_fantasy_pts").notNull().default(0),
    supercoachPts: integer("supercoach_pts").notNull().default(0),
  },
  (t) => [
    uniqueIndex("player_stats_player_match_idx").on(t.playerId, t.matchId),
  ],
);

// ─── Player Advanced Stats ────────────────────────────────────────────────────
// Source: ft_match_statistics?mid=xxx&advv=Y
// Column order (17 td.statdata cells): CP UP ED DE% CM GA MI5 1% BO CCL SCL SI MG TO ITC T5 TOG%

export const playerStatsAdvanced = pgTable(
  "player_stats_advanced",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id),
    teamId: text("team_id").references(() => teams.id),
    contestedPossessions: integer("contested_possessions").notNull().default(0),
    uncontestedPossessions: integer("uncontested_possessions")
      .notNull()
      .default(0),
    effectiveDisposals: integer("effective_disposals").notNull().default(0),
    disposalEfficiencyPct: integer("disposal_efficiency_pct")
      .notNull()
      .default(0),
    contestedMarks: integer("contested_marks").notNull().default(0),
    goalAssists: integer("goal_assists").notNull().default(0),
    marksInside50: integer("marks_inside_50").notNull().default(0),
    onePercenters: integer("one_percenters").notNull().default(0),
    bounces: integer("bounces").notNull().default(0),
    centreClearances: integer("centre_clearances").notNull().default(0),
    stoppageClearances: integer("stoppage_clearances").notNull().default(0),
    scoreInvolvements: integer("score_involvements").notNull().default(0),
    metresGained: integer("metres_gained").notNull().default(0),
    turnovers: integer("turnovers").notNull().default(0),
    intercepts: integer("intercepts").notNull().default(0),
    tacklesInside50: integer("tackles_inside_50").notNull().default(0),
    timeOnGroundPct: integer("time_on_ground_pct").notNull().default(0),
  },
  (t) => [
    uniqueIndex("player_stats_adv_player_match_idx").on(t.playerId, t.matchId),
  ],
);

// ─── Kali Users ───────────────────────────────────────────────────────────────

export const kaliUsers = pgTable("kali_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // 'github' | 'google'
  createdAt: text("created_at").notNull(),
  lastActiveAt: text("last_active_at"),
  prefTheme: text("pref_theme").notNull().default("serika"),
  prefFont: text("pref_font").notNull().default("ibm-plex-mono"),
  prefDarkMode: text("pref_dark_mode").notNull().default("system"),
});

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => kaliUsers.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
  lastUsedAt: text("last_used_at"),
  revoked: boolean("revoked").notNull().default(false),
  usage: integer("usage").notNull().default(0),
  limit: integer("limit"),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Team = typeof teams.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Player = typeof players.$inferSelect;
export type PlayerTeamAssignment = typeof playerTeamAssignments.$inferSelect;
export type PlayerStat = typeof playerStats.$inferSelect;
export type PlayerStatAdvanced = typeof playerStatsAdvanced.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type NewPlayer = typeof players.$inferInsert;
export type NewPlayerTeamAssignment = typeof playerTeamAssignments.$inferInsert;
export type NewPlayerStat = typeof playerStats.$inferInsert;
export type NewPlayerStatAdvanced = typeof playerStatsAdvanced.$inferInsert;
export type KaliUser = typeof kaliUsers.$inferSelect;
export type NewKaliUser = typeof kaliUsers.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
