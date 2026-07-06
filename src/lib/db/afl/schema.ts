import {
  boolean,
  index,
  integer,
  jsonb,
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
  startDatetime: text("start_datetime"), // nullable; ISO-ish sortable "2016-03-24T19:20" AEST
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  crowd: integer("crowd"),
  sourcedAt: text("sourced_at").notNull(),
});

// ─── Fixtures (Squiggle) ──────────────────────────────────────────────────

export const fixtures = pgTable(
  "fixtures",
  {
    id: integer("id").primaryKey(), // Squiggle game ID
    round: integer("round").notNull(),
    year: integer("year").notNull(),
    date: text("date"), // nullable — "2026-03-15 19:25:00" AEST, null if TBC
    hteam: text("hteam"), // null for unconfirmed finals
    ateam: text("ateam"), // null for unconfirmed finals
    hteamid: integer("hteamid"), // null for unconfirmed finals
    ateamid: integer("ateamid"), // null for unconfirmed finals
    venue: text("venue"),
    hscore: integer("hscore"),
    ascore: integer("ascore"),
    complete: integer("complete").notNull().default(0), // 0–100
    winner: text("winner"),
    syncedAt: text("synced_at").notNull(),
  },
  (t) => [uniqueIndex("fixtures_year_round_id_idx").on(t.year, t.round, t.id)],
);

// ─── Tips (Squiggle Tipster Predictions) ───────────────────────────────────

export const tips = pgTable(
  "tips",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id").notNull(), // Squiggle game ID
    year: integer("year").notNull(),
    round: integer("round").notNull(),
    hteam: text("hteam").notNull(),
    ateam: text("ateam").notNull(),
    hconfidence: integer("hconfidence").notNull(), // % chance home team wins
    source: text("source").notNull(), // tipster name
    syncedAt: text("synced_at").notNull(),
  },
  (t) => [
    uniqueIndex("tips_game_source_idx").on(t.gameId, t.source, t.syncedAt),
  ],
);

// ─── Predictions (in-house model) ──────────────────────────────────────────

export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    fixtureId: integer("fixture_id")
      .notNull()
      .references(() => fixtures.id),
    year: integer("year").notNull(),
    round: integer("round").notNull(),
    homeTeamId: text("home_team_id")
      .notNull()
      .references(() => teams.id),
    awayTeamId: text("away_team_id")
      .notNull()
      .references(() => teams.id),
    // Probabilities stored as integer tenths-of-a-percent (723 = 72.3%)
    homeProbability: integer("home_probability").notNull(),
    awayProbability: integer("away_probability").notNull(),
    // Expected margin in points, home-positive (-18 = away by 18). Null on v1 rows.
    predictedMargin: integer("predicted_margin"),
    squiggleConsensus: integer("squiggle_consensus"), // null if no Squiggle tips
    homeBreakdown: jsonb("home_breakdown").notNull(), // v1: FactorBreakdown · v2: EloBreakdown
    awayBreakdown: jsonb("away_breakdown").notNull(),
    factors: jsonb("factors").notNull(), // top-3 PredictionFactor[]
    modelVersion: text("model_version").notNull(),
    actualWinner: text("actual_winner"), // "home" | "away" | "draw" | null
    // Actual margin in points, home-positive. Null until settled (and on rows settled pre-v2).
    actualMargin: integer("actual_margin"),
    computedAt: text("computed_at").notNull(),
    settledAt: text("settled_at"),
  },
  (t) => [
    uniqueIndex("predictions_fixture_version_idx").on(
      t.fixtureId,
      t.modelVersion,
    ),
  ],
);

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
    reason: text("reason"), // "trade" | "rookie" | "rookie-elevated" | "delisted" | "retirement"
  },
  (t) => [
    uniqueIndex("pta_player_team_start_idx").on(
      t.playerId,
      t.teamId,
      t.startYear,
    ),
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
  totalApiUsage: integer("total_api_usage").notNull().default(0), // lifetime analytics
  // Per-user daily quota bucket. All of a user's API keys draw from this.
  usage: integer("usage").notNull().default(0), // requests consumed in the current window
  limit: integer("limit").default(
    process.env.API_KEY_DEFAULT_LIMIT
      ? parseInt(process.env.API_KEY_DEFAULT_LIMIT)
      : 1000,
  ), // null = unlimited
  resetAt: text("reset_at"), // next 00:00 UTC boundary; null = uninitialised (lazily set on first request)
});

// ─── API Keys ─────────────────────────────────────────────────────────────────

// API keys are pure credentials — they gate nothing on their own. Quota is
// enforced per user (kali_users), so all of a user's keys share one bucket.
// Stored as a SHA-256 hash with a short non-secret prefix; the plaintext token
// is shown to the user exactly once at creation and is never retrievable.
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => kaliUsers.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(), // sha256(rawToken), looked up on every request
  keyPrefix: text("key_prefix").notNull(), // first 8 chars of the raw token, for UI identification
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
  lastUsedAt: text("last_used_at"),
  revoked: boolean("revoked").notNull().default(false),
  usage: integer("usage").notNull().default(0), // per-key visibility counter only — gates nothing
  totalUsage: integer("total_usage").notNull().default(0), // per-key lifetime, visibility only
});

// ─── API Request Log ──────────────────────────────────────────────────────────

// Structured per-request analytics for the public /api/afl/v1/* surface.
// Written fire-and-forget from hooks.server.ts after each response is produced.
// apiKeyId / userId are nullable so unauthenticated 401s are still logged.
export const apiRequestLog = pgTable(
  "api_request_log",
  {
    id: serial("id").primaryKey(),
    timestamp: text("timestamp").notNull(), // ISO 8601, matching repo convention
    apiKeyId: integer("api_key_id").references(() => apiKeys.id, {
      onDelete: "set null",
    }),
    userId: integer("user_id").references(() => kaliUsers.id, {
      onDelete: "set null",
    }),
    routeId: text("route_id").notNull(), // SvelteKit event.route.id (or pathname fallback)
    method: text("method").notNull(),
    status: integer("status").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    responseBytes: integer("response_bytes").notNull(),
    queryString: text("query_string"), // NULL when no params present
  },
  (table) => [
    index("api_request_log_timestamp_idx").on(table.timestamp),
    index("api_request_log_route_id_idx").on(table.routeId),
    index("api_request_log_user_id_idx").on(table.userId),
  ],
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type Team = typeof teams.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Fixture = typeof fixtures.$inferSelect;
export type Tip = typeof tips.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type Player = typeof players.$inferSelect;
export type PlayerTeamAssignment = typeof playerTeamAssignments.$inferSelect;
export type PlayerStat = typeof playerStats.$inferSelect;
export type PlayerStatAdvanced = typeof playerStatsAdvanced.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type NewFixture = typeof fixtures.$inferInsert;
export type NewTip = typeof tips.$inferInsert;
export type NewPrediction = typeof predictions.$inferInsert;
export type NewPlayer = typeof players.$inferInsert;
export type NewPlayerTeamAssignment = typeof playerTeamAssignments.$inferInsert;
export type NewPlayerStat = typeof playerStats.$inferInsert;
export type NewPlayerStatAdvanced = typeof playerStatsAdvanced.$inferInsert;
export type KaliUser = typeof kaliUsers.$inferSelect;
export type NewKaliUser = typeof kaliUsers.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type ApiRequestLog = typeof apiRequestLog.$inferSelect;
export type NewApiRequestLog = typeof apiRequestLog.$inferInsert;
