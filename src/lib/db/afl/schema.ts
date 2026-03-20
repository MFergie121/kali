import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ─── Teams ───────────────────────────────────────────────────────────────────

export const teams = sqliteTable('teams', {
	id: text('id').primaryKey(), // slug e.g. "sydney-swans"
	name: text('name').notNull(),
	shortName: text('short_name').notNull()
});

// ─── Matches ─────────────────────────────────────────────────────────────────

export const matches = sqliteTable('matches', {
	id: integer('id').primaryKey(), // footywire match id (mid)
	round: integer('round').notNull(),
	year: integer('year').notNull(),
	homeTeamId: text('home_team_id')
		.notNull()
		.references(() => teams.id),
	awayTeamId: text('away_team_id')
		.notNull()
		.references(() => teams.id),
	venue: text('venue').notNull(),
	date: text('date').notNull(),
	homeScore: integer('home_score'),
	awayScore: integer('away_score'),
	crowd: integer('crowd'),
	scrapedAt: text('scraped_at').notNull()
});

// ─── Players ─────────────────────────────────────────────────────────────────

export const players = sqliteTable(
	'players',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		teamId: text('team_id')
			.notNull()
			.references(() => teams.id),
		footywireId: text('footywire_id')
	},
	(t) => [uniqueIndex('players_footywire_idx').on(t.footywireId)]
);

// ─── Player Stats ─────────────────────────────────────────────────────────────

export const playerStats = sqliteTable(
	'player_stats',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		playerId: integer('player_id')
			.notNull()
			.references(() => players.id),
		matchId: integer('match_id')
			.notNull()
			.references(() => matches.id),
		teamId: text('team_id').references(() => teams.id),
		kicks: integer('kicks').notNull().default(0),
		handballs: integer('handballs').notNull().default(0),
		disposals: integer('disposals').notNull().default(0),
		marks: integer('marks').notNull().default(0),
		goals: integer('goals').notNull().default(0),
		behinds: integer('behinds').notNull().default(0),
		tackles: integer('tackles').notNull().default(0),
		hitouts: integer('hitouts').notNull().default(0),
		goalAssists: integer('goal_assists').notNull().default(0),
		inside50s: integer('inside_50s').notNull().default(0),
		clearances: integer('clearances').notNull().default(0),
		clangers: integer('clangers').notNull().default(0),
		rebound50s: integer('rebound_50s').notNull().default(0),
		freesFor: integer('frees_for').notNull().default(0),
		freesAgainst: integer('frees_against').notNull().default(0),
		aflFantasyPts: integer('afl_fantasy_pts').notNull().default(0),
		supercoachPts: integer('supercoach_pts').notNull().default(0)
	},
	(t) => [uniqueIndex('player_stats_player_match_idx').on(t.playerId, t.matchId)]
);

// ─── Player Advanced Stats ────────────────────────────────────────────────────
// Source: ft_match_statistics?mid=xxx&advv=Y
// Column order (17 td.statdata cells): CP UP ED DE% CM GA MI5 1% BO CCL SCL SI MG TO ITC T5 TOG%

export const playerStatsAdvanced = sqliteTable(
	'player_stats_advanced',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		playerId: integer('player_id')
			.notNull()
			.references(() => players.id),
		matchId: integer('match_id')
			.notNull()
			.references(() => matches.id),
		teamId: text('team_id').references(() => teams.id),
		contestedPossessions: integer('contested_possessions').notNull().default(0),
		uncontestedPossessions: integer('uncontested_possessions').notNull().default(0),
		effectiveDisposals: integer('effective_disposals').notNull().default(0),
		disposalEfficiencyPct: integer('disposal_efficiency_pct').notNull().default(0),
		contestedMarks: integer('contested_marks').notNull().default(0),
		goalAssists: integer('goal_assists').notNull().default(0),
		marksInside50: integer('marks_inside_50').notNull().default(0),
		onePercenters: integer('one_percenters').notNull().default(0),
		bounces: integer('bounces').notNull().default(0),
		centreClearances: integer('centre_clearances').notNull().default(0),
		stoppageClearances: integer('stoppage_clearances').notNull().default(0),
		scoreInvolvements: integer('score_involvements').notNull().default(0),
		metresGained: integer('metres_gained').notNull().default(0),
		turnovers: integer('turnovers').notNull().default(0),
		intercepts: integer('intercepts').notNull().default(0),
		tacklesInside50: integer('tackles_inside_50').notNull().default(0),
		timeOnGroundPct: integer('time_on_ground_pct').notNull().default(0)
	},
	(t) => [uniqueIndex('player_stats_adv_player_match_idx').on(t.playerId, t.matchId)]
);

// ─── API Users ────────────────────────────────────────────────────────────────

export const apiUsers = sqliteTable('api_users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	provider: text('provider').notNull(), // 'github' | 'google'
	createdAt: text('created_at').notNull(),
	lastActiveAt: text('last_active_at'),
	apiUsage: integer('api_usage').notNull().default(0),
	apiLimit: integer('api_limit'),
	prefTheme: text('pref_theme').notNull().default('serika'),
	prefFont: text('pref_font').notNull().default('ibm-plex-mono'),
	prefDarkMode: text('pref_dark_mode').notNull().default('system')
});

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeys = sqliteTable('api_keys', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => apiUsers.id, { onDelete: 'cascade' }),
	key: text('key').notNull().unique(),
	name: text('name').notNull(),
	createdAt: text('created_at').notNull(),
	lastUsedAt: text('last_used_at'),
	revoked: integer('revoked').notNull().default(0)
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Team = typeof teams.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Player = typeof players.$inferSelect;
export type PlayerStat = typeof playerStats.$inferSelect;
export type PlayerStatAdvanced = typeof playerStatsAdvanced.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type NewPlayer = typeof players.$inferInsert;
export type NewPlayerStat = typeof playerStats.$inferInsert;
export type NewPlayerStatAdvanced = typeof playerStatsAdvanced.$inferInsert;
export type ApiUser = typeof apiUsers.$inferSelect;
export type NewApiUser = typeof apiUsers.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
