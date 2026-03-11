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
			.references(() => teams.id)
	},
	(t) => [uniqueIndex('players_name_team_idx').on(t.name, t.teamId)]
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type Team = typeof teams.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Player = typeof players.$inferSelect;
export type PlayerStat = typeof playerStats.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type NewPlayer = typeof players.$inferInsert;
export type NewPlayerStat = typeof playerStats.$inferInsert;
