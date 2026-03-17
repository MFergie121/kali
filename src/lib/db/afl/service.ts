import { randomBytes } from "node:crypto";
import type { ScrapedMatch, ScrapedPlayerStat } from "$lib/afl/scraper";
import { db } from "$lib/db/afl";
import { apiKeys, apiUsers, matches, players, playerStats, teams } from "$lib/db/afl/schema";
import type { ApiKey, ApiUser, Player, Team } from "$lib/db/afl/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function upsertTeam(team: {
  id: string;
  name: string;
  shortName: string;
}) {
  db.insert(teams).values(team).onConflictDoNothing().run();
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export async function upsertMatch(scraped: ScrapedMatch): Promise<void> {
  await upsertTeam(scraped.homeTeam);
  await upsertTeam(scraped.awayTeam);

  const matchValues = {
    id: scraped.mid,
    round: scraped.round,
    year: scraped.year,
    homeTeamId: scraped.homeTeam.id,
    awayTeamId: scraped.awayTeam.id,
    venue: scraped.venue,
    date: scraped.date,
    homeScore: scraped.homeScore,
    awayScore: scraped.awayScore,
    crowd: scraped.crowd,
    scrapedAt: new Date().toISOString(),
  };
  db.insert(matches)
    .values(matchValues)
    .onConflictDoUpdate({
      target: matches.id,
      set: {
        round: matchValues.round,
        year: matchValues.year,
        homeTeamId: matchValues.homeTeamId,
        awayTeamId: matchValues.awayTeamId,
        venue: matchValues.venue,
        date: matchValues.date,
        homeScore: matchValues.homeScore,
        awayScore: matchValues.awayScore,
        crowd: matchValues.crowd,
        scrapedAt: matchValues.scrapedAt,
      },
    })
    .run();
}

// ─── Players ──────────────────────────────────────────────────────────────────

export function getOrCreatePlayer(name: string, teamId: string): number {
  // Look up by (name, teamId) to match the unique index — avoids reusing
  // old player rows that have a stale teamId from a previous bad scrape.
  const existing = db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.name, name), eq(players.teamId, teamId)))
    .get();

  if (existing) return existing.id;

  const result = db
    .insert(players)
    .values({ name, teamId })
    .onConflictDoNothing()
    .returning({ id: players.id })
    .get();

  if (result) return result.id;

  // Race condition fallback
  const fallback = db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.name, name), eq(players.teamId, teamId)))
    .get();

  if (!fallback)
    throw new Error(
      `Failed to get or create player: ${name} (teamId=${teamId})`,
    );
  return fallback.id;
}

// ─── Player Stats ─────────────────────────────────────────────────────────────

export function batchUpsertPlayerStats(
  stats: ScrapedPlayerStat[],
  matchId: number,
): void {
  for (const stat of stats) {
    const playerId = getOrCreatePlayer(stat.playerName, stat.teamId);

    const statValues = {
      playerId,
      matchId,
      kicks: stat.kicks,
      handballs: stat.handballs,
      disposals: stat.disposals,
      marks: stat.marks,
      goals: stat.goals,
      behinds: stat.behinds,
      tackles: stat.tackles,
      hitouts: stat.hitouts,
      goalAssists: stat.goalAssists,
      inside50s: stat.inside50s,
      clearances: stat.clearances,
      clangers: stat.clangers,
      rebound50s: stat.rebound50s,
      freesFor: stat.freesFor,
      freesAgainst: stat.freesAgainst,
      aflFantasyPts: stat.aflFantasyPts,
      supercoachPts: stat.supercoachPts,
    };
    db.insert(playerStats)
      .values(statValues)
      .onConflictDoUpdate({
        target: [playerStats.playerId, playerStats.matchId],
        set: {
          kicks: statValues.kicks,
          handballs: statValues.handballs,
          disposals: statValues.disposals,
          marks: statValues.marks,
          goals: statValues.goals,
          behinds: statValues.behinds,
          tackles: statValues.tackles,
          hitouts: statValues.hitouts,
          goalAssists: statValues.goalAssists,
          inside50s: statValues.inside50s,
          clearances: statValues.clearances,
          clangers: statValues.clangers,
          rebound50s: statValues.rebound50s,
          freesFor: statValues.freesFor,
          freesAgainst: statValues.freesAgainst,
          aflFantasyPts: statValues.aflFantasyPts,
          supercoachPts: statValues.supercoachPts,
        },
      })
      .run();
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface MatchRow {
  id: number;
  round: number;
  year: number;
  homeTeam: string;
  homeShortName: string;
  awayTeam: string;
  awayShortName: string;
  homeScore: number | null;
  awayScore: number | null;
  venue: string;
  date: string;
  crowd: number | null;
  scrapedAt: string;
}

export interface PlayerStatRow {
  matchId: number;
  playerName: string;
  teamId: string;
  kicks: number;
  handballs: number;
  disposals: number;
  marks: number;
  goals: number;
  behinds: number;
  tackles: number;
  hitouts: number;
  goalAssists: number;
  inside50s: number;
  clearances: number;
  clangers: number;
  rebound50s: number;
  freesFor: number;
  freesAgainst: number;
  aflFantasyPts: number;
  supercoachPts: number;
}

export function getStoredRounds(): number[] {
  const rows = db
    .selectDistinct({ round: matches.round })
    .from(matches)
    .orderBy(desc(matches.round))
    .all();
  return rows.map((r) => r.round);
}

export function getStoredRoundsForYear(year: number): number[] {
  const rows = db
    .selectDistinct({ round: matches.round })
    .from(matches)
    .where(eq(matches.year, year))
    .orderBy(desc(matches.round))
    .all();
  return rows.map((r) => r.round);
}

export function getLatestStoredRound(): number | null {
  const row = db
    .select({ round: matches.round })
    .from(matches)
    .orderBy(desc(matches.round))
    .limit(1)
    .get();
  return row?.round ?? null;
}

export function getMatchesForRound(round: number): MatchRow[] {
  const rows = db
    .select({
      id: matches.id,
      round: matches.round,
      year: matches.year,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      venue: matches.venue,
      date: matches.date,
      crowd: matches.crowd,
      scrapedAt: matches.scrapedAt,
    })
    .from(matches)
    .where(eq(matches.round, round))
    .all();

  // Fetch team names separately (SQLite joins via Drizzle are more readable this way)
  const allTeams = db.select().from(teams).all();
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  return rows.map((r) => ({
    id: r.id,
    round: r.round,
    year: r.year,
    homeTeam: teamMap.get(r.homeTeamId)?.name ?? r.homeTeamId,
    homeShortName: teamMap.get(r.homeTeamId)?.shortName ?? r.homeTeamId,
    awayTeam: teamMap.get(r.awayTeamId)?.name ?? r.awayTeamId,
    awayShortName: teamMap.get(r.awayTeamId)?.shortName ?? r.awayTeamId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    venue: r.venue,
    date: r.date,
    crowd: r.crowd,
    scrapedAt: r.scrapedAt,
  }));
}

export function getMatchesForRoundAndYear(
  round: number,
  year: number,
): MatchRow[] {
  const rows = db
    .select({
      id: matches.id,
      round: matches.round,
      year: matches.year,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      venue: matches.venue,
      date: matches.date,
      crowd: matches.crowd,
      scrapedAt: matches.scrapedAt,
    })
    .from(matches)
    .where(and(eq(matches.round, round), eq(matches.year, year)))
    .all();

  const allTeams = db.select().from(teams).all();
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  return rows.map((r) => ({
    id: r.id,
    round: r.round,
    year: r.year,
    homeTeam: teamMap.get(r.homeTeamId)?.name ?? r.homeTeamId,
    homeShortName: teamMap.get(r.homeTeamId)?.shortName ?? r.homeTeamId,
    awayTeam: teamMap.get(r.awayTeamId)?.name ?? r.awayTeamId,
    awayShortName: teamMap.get(r.awayTeamId)?.shortName ?? r.awayTeamId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    venue: r.venue,
    date: r.date,
    crowd: r.crowd,
    scrapedAt: r.scrapedAt,
  }));
}

export function getPlayerStatsForMatch(matchId: number): PlayerStatRow[] {
  const rows = db
    .select({
      matchId: playerStats.matchId,
      playerName: players.name,
      teamId: players.teamId,
      kicks: playerStats.kicks,
      handballs: playerStats.handballs,
      disposals: playerStats.disposals,
      marks: playerStats.marks,
      goals: playerStats.goals,
      behinds: playerStats.behinds,
      tackles: playerStats.tackles,
      hitouts: playerStats.hitouts,
      goalAssists: playerStats.goalAssists,
      inside50s: playerStats.inside50s,
      clearances: playerStats.clearances,
      clangers: playerStats.clangers,
      rebound50s: playerStats.rebound50s,
      freesFor: playerStats.freesFor,
      freesAgainst: playerStats.freesAgainst,
      aflFantasyPts: playerStats.aflFantasyPts,
      supercoachPts: playerStats.supercoachPts,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .where(eq(playerStats.matchId, matchId))
    .orderBy(desc(playerStats.disposals))
    .all();

  return rows;
}

// ─── Year-wide pivot query ────────────────────────────────────────────────────

export interface PlayerStatYearRow {
  playerName: string;
  teamId: string;
  round: number;
  kicks: number;
  handballs: number;
  disposals: number;
  marks: number;
  goals: number;
  behinds: number;
  tackles: number;
  hitouts: number;
  goalAssists: number;
  inside50s: number;
  clearances: number;
  clangers: number;
  rebound50s: number;
  freesFor: number;
  freesAgainst: number;
  aflFantasyPts: number;
  supercoachPts: number;
}

export function getAllPlayerStatsForYear(year: number): PlayerStatYearRow[] {
  return db
    .select({
      playerName: players.name,
      teamId: players.teamId,
      round: matches.round,
      kicks: playerStats.kicks,
      handballs: playerStats.handballs,
      disposals: playerStats.disposals,
      marks: playerStats.marks,
      goals: playerStats.goals,
      behinds: playerStats.behinds,
      tackles: playerStats.tackles,
      hitouts: playerStats.hitouts,
      goalAssists: playerStats.goalAssists,
      inside50s: playerStats.inside50s,
      clearances: playerStats.clearances,
      clangers: playerStats.clangers,
      rebound50s: playerStats.rebound50s,
      freesFor: playerStats.freesFor,
      freesAgainst: playerStats.freesAgainst,
      aflFantasyPts: playerStats.aflFantasyPts,
      supercoachPts: playerStats.supercoachPts,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(eq(matches.year, year))
    .orderBy(matches.round, players.name)
    .all();
}

// ─── Public API — Teams ───────────────────────────────────────────────────────

export function getAllTeams(): Team[] {
  return db.select().from(teams).orderBy(asc(teams.name)).all();
}

// ─── Public API — Matches (paginated) ────────────────────────────────────────

export function getMatchesPaginated(opts: {
  year?: number;
  round?: number;
  limit: number;
  offset: number;
}): { data: MatchRow[]; total: number } {
  const conditions = [
    opts.year !== undefined ? eq(matches.year, opts.year) : undefined,
    opts.round !== undefined ? eq(matches.round, opts.round) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const totalRow = db
    .select({ total: sql<number>`count(*)` })
    .from(matches)
    .where(where)
    .get();
  const total = totalRow?.total ?? 0;

  const rows = db
    .select({
      id: matches.id,
      round: matches.round,
      year: matches.year,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      venue: matches.venue,
      date: matches.date,
      crowd: matches.crowd,
      scrapedAt: matches.scrapedAt,
    })
    .from(matches)
    .where(where)
    .orderBy(desc(matches.year), desc(matches.round))
    .limit(opts.limit)
    .offset(opts.offset)
    .all();

  const allTeams = db.select().from(teams).all();
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  const data: MatchRow[] = rows.map((r) => ({
    id: r.id,
    round: r.round,
    year: r.year,
    homeTeam: teamMap.get(r.homeTeamId)?.name ?? r.homeTeamId,
    homeShortName: teamMap.get(r.homeTeamId)?.shortName ?? r.homeTeamId,
    awayTeam: teamMap.get(r.awayTeamId)?.name ?? r.awayTeamId,
    awayShortName: teamMap.get(r.awayTeamId)?.shortName ?? r.awayTeamId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    venue: r.venue,
    date: r.date,
    crowd: r.crowd,
    scrapedAt: r.scrapedAt,
  }));

  return { data, total };
}

// ─── Public API — Players (paginated) ────────────────────────────────────────

export function getPlayersPaginated(opts: {
  teamId?: string;
  limit: number;
  offset: number;
}): { data: Player[]; total: number } {
  const where = opts.teamId !== undefined ? eq(players.teamId, opts.teamId) : undefined;

  const totalRow = db
    .select({ total: sql<number>`count(*)` })
    .from(players)
    .where(where)
    .get();
  const total = totalRow?.total ?? 0;

  const data = db
    .select()
    .from(players)
    .where(where)
    .orderBy(asc(players.name))
    .limit(opts.limit)
    .offset(opts.offset)
    .all();

  return { data, total };
}

// ─── Public API — Player Stats (paginated) ───────────────────────────────────

export function getPlayerStatsPaginated(opts: {
  matchId?: number;
  playerId?: number;
  year?: number;
  round?: number;
  limit: number;
  offset: number;
}): { data: PlayerStatRow[]; total: number } {
  const conditions = [
    opts.matchId !== undefined ? eq(playerStats.matchId, opts.matchId) : undefined,
    opts.playerId !== undefined ? eq(playerStats.playerId, opts.playerId) : undefined,
    opts.year !== undefined ? eq(matches.year, opts.year) : undefined,
    opts.round !== undefined ? eq(matches.round, opts.round) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const totalRow = db
    .select({ total: sql<number>`count(*)` })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(where)
    .get();
  const total = totalRow?.total ?? 0;

  const data = db
    .select({
      matchId: playerStats.matchId,
      playerName: players.name,
      teamId: players.teamId,
      kicks: playerStats.kicks,
      handballs: playerStats.handballs,
      disposals: playerStats.disposals,
      marks: playerStats.marks,
      goals: playerStats.goals,
      behinds: playerStats.behinds,
      tackles: playerStats.tackles,
      hitouts: playerStats.hitouts,
      goalAssists: playerStats.goalAssists,
      inside50s: playerStats.inside50s,
      clearances: playerStats.clearances,
      clangers: playerStats.clangers,
      rebound50s: playerStats.rebound50s,
      freesFor: playerStats.freesFor,
      freesAgainst: playerStats.freesAgainst,
      aflFantasyPts: playerStats.aflFantasyPts,
      supercoachPts: playerStats.supercoachPts,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(where)
    .orderBy(desc(playerStats.disposals))
    .limit(opts.limit)
    .offset(opts.offset)
    .all();

  return { data, total };
}

// ─── User Preferences ─────────────────────────────────────────────────────────

export interface UserPreferences {
  prefTheme: string;
  prefFont: string;
  prefDarkMode: string;
}

export function getUserPreferences(email: string): UserPreferences | null {
  const row = db
    .select({ prefTheme: apiUsers.prefTheme, prefFont: apiUsers.prefFont, prefDarkMode: apiUsers.prefDarkMode })
    .from(apiUsers)
    .where(eq(apiUsers.email, email))
    .get();
  return row ?? null;
}

export function upsertUserPreferences(email: string, prefs: Partial<UserPreferences>): void {
  db.update(apiUsers).set(prefs).where(eq(apiUsers.email, email)).run();
}

// ─── API Users ────────────────────────────────────────────────────────────────

export function getOrCreateUser(opts: {
  email: string;
  name: string;
  provider: string;
}): ApiUser {
  const now = new Date().toISOString();
  db.insert(apiUsers)
    .values({ email: opts.email, name: opts.name, provider: opts.provider, createdAt: now, lastActiveAt: now })
    .onConflictDoUpdate({
      target: apiUsers.email,
      set: { name: opts.name, provider: opts.provider, lastActiveAt: now },
    })
    .run();
  return db.select().from(apiUsers).where(eq(apiUsers.email, opts.email)).get()!;
}

export function listUsers(): ApiUser[] {
  return db.select().from(apiUsers).orderBy(desc(apiUsers.createdAt)).all();
}

export function setApiLimit(userId: number, limit: number | null): void {
  db.update(apiUsers).set({ apiLimit: limit }).where(eq(apiUsers.id, userId)).run();
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export function createApiKey(userId: number, name: string): string {
  const key = randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  db.insert(apiKeys).values({ userId, key, name, createdAt: now }).run();
  return key;
}

export function listApiKeysForUser(userId: number): ApiKey[] {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt))
    .all();
}

export function listAllApiKeys(): (ApiKey & { userName: string; userEmail: string })[] {
  return db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      key: apiKeys.key,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revoked: apiKeys.revoked,
      userName: apiUsers.name,
      userEmail: apiUsers.email,
    })
    .from(apiKeys)
    .innerJoin(apiUsers, eq(apiKeys.userId, apiUsers.id))
    .orderBy(desc(apiKeys.createdAt))
    .all();
}

export function revokeApiKey(id: number): void {
  db.update(apiKeys).set({ revoked: 1 }).where(eq(apiKeys.id, id)).run();
}

export function validateApiKey(key: string): { valid: boolean; rateLimited?: boolean } {
  const row = db
    .select({
      keyId: apiKeys.id,
      revoked: apiKeys.revoked,
      userId: apiKeys.userId,
      apiUsage: apiUsers.apiUsage,
      apiLimit: apiUsers.apiLimit,
    })
    .from(apiKeys)
    .innerJoin(apiUsers, eq(apiKeys.userId, apiUsers.id))
    .where(eq(apiKeys.key, key))
    .get();

  if (!row || row.revoked) return { valid: false };

  if (row.apiLimit !== null && row.apiUsage >= row.apiLimit) {
    return { valid: false, rateLimited: true };
  }

  const now = new Date().toISOString();
  db.update(apiKeys).set({ lastUsedAt: now }).where(eq(apiKeys.id, row.keyId)).run();
  db.update(apiUsers)
    .set({ lastActiveAt: now, apiUsage: row.apiUsage + 1 })
    .where(eq(apiUsers.id, row.userId))
    .run();

  return { valid: true };
}
