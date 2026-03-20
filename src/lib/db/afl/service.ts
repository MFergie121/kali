import { randomBytes } from "node:crypto";
import type { ScrapedMatch, ScrapedPlayerStat, ScrapedPlayerAdvancedStat } from "$lib/afl/scraper";
import { db } from "$lib/db/afl";
import { apiKeys, kaliUsers, matches, players, playerStats, playerStatsAdvanced, teams } from "$lib/db/afl/schema";
import type { ApiKey, KaliUser, Player, Team } from "$lib/db/afl/schema";
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
    sourcedAt: new Date().toISOString(),
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
        sourcedAt: matchValues.sourcedAt,
      },
    })
    .run();
}

// ─── Players ──────────────────────────────────────────────────────────────────

export function getOrCreatePlayer(
  name: string,
  teamId: string,
  onlineId: string,
): number {
  // Look up by onlineId — stable across team transfers and name abbreviations.
  const existing = db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.onlineId, onlineId))
    .get();

  if (existing) {
    // Keep name and teamId fresh without changing the row's identity.
    db.update(players)
      .set({ name, teamId })
      .where(eq(players.onlineId, onlineId))
      .run();
    return existing.id;
  }

  const result = db
    .insert(players)
    .values({ name, teamId, onlineId })
    .onConflictDoNothing()
    .returning({ id: players.id })
    .get();

  if (result) return result.id;

  // Race condition fallback
  const fallback = db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.onlineId, onlineId))
    .get();

  if (!fallback)
    throw new Error(
      `Failed to get or create player: ${name} (onlineId=${onlineId})`,
    );
  return fallback.id;
}

// ─── Player Stats ─────────────────────────────────────────────────────────────

export function batchUpsertPlayerStats(
  stats: ScrapedPlayerStat[],
  matchId: number,
): void {
  for (const stat of stats) {
    const playerId = getOrCreatePlayer(stat.playerName, stat.teamId, stat.onlineId);

    const statValues = {
      playerId,
      matchId,
      teamId: stat.teamId,
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
          teamId: statValues.teamId,
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

// ─── Player Advanced Stats ────────────────────────────────────────────────────

export function batchUpsertPlayerAdvancedStats(
  stats: ScrapedPlayerAdvancedStat[],
  matchId: number,
): void {
  for (const stat of stats) {
    const playerId = getOrCreatePlayer(stat.playerName, stat.teamId, stat.onlineId);

    const statValues = {
      playerId,
      matchId,
      teamId: stat.teamId,
      contestedPossessions: stat.contestedPossessions,
      uncontestedPossessions: stat.uncontestedPossessions,
      effectiveDisposals: stat.effectiveDisposals,
      disposalEfficiencyPct: stat.disposalEfficiencyPct,
      contestedMarks: stat.contestedMarks,
      goalAssists: stat.goalAssists,
      marksInside50: stat.marksInside50,
      onePercenters: stat.onePercenters,
      bounces: stat.bounces,
      centreClearances: stat.centreClearances,
      stoppageClearances: stat.stoppageClearances,
      scoreInvolvements: stat.scoreInvolvements,
      metresGained: stat.metresGained,
      turnovers: stat.turnovers,
      intercepts: stat.intercepts,
      tacklesInside50: stat.tacklesInside50,
      timeOnGroundPct: stat.timeOnGroundPct,
    };
    db.insert(playerStatsAdvanced)
      .values(statValues)
      .onConflictDoUpdate({
        target: [playerStatsAdvanced.playerId, playerStatsAdvanced.matchId],
        set: {
          teamId: statValues.teamId,
          contestedPossessions: statValues.contestedPossessions,
          uncontestedPossessions: statValues.uncontestedPossessions,
          effectiveDisposals: statValues.effectiveDisposals,
          disposalEfficiencyPct: statValues.disposalEfficiencyPct,
          contestedMarks: statValues.contestedMarks,
          goalAssists: statValues.goalAssists,
          marksInside50: statValues.marksInside50,
          onePercenters: statValues.onePercenters,
          bounces: statValues.bounces,
          centreClearances: statValues.centreClearances,
          stoppageClearances: statValues.stoppageClearances,
          scoreInvolvements: statValues.scoreInvolvements,
          metresGained: statValues.metresGained,
          turnovers: statValues.turnovers,
          intercepts: statValues.intercepts,
          tacklesInside50: statValues.tacklesInside50,
          timeOnGroundPct: statValues.timeOnGroundPct,
        },
      })
      .run();
  }
}

export interface PlayerAdvancedStatRow {
  matchId: number;
  playerName: string;
  teamId: string | null;
  contestedPossessions: number;
  uncontestedPossessions: number;
  effectiveDisposals: number;
  disposalEfficiencyPct: number;
  contestedMarks: number;
  goalAssists: number;
  marksInside50: number;
  onePercenters: number;
  bounces: number;
  centreClearances: number;
  stoppageClearances: number;
  scoreInvolvements: number;
  metresGained: number;
  turnovers: number;
  intercepts: number;
  tacklesInside50: number;
  timeOnGroundPct: number;
}

export function getPlayerAdvancedStatsPaginated(opts: {
  matchId?: number;
  playerId?: number;
  year?: number;
  round?: number;
  limit: number;
  offset: number;
}): { data: PlayerAdvancedStatRow[]; total: number } {
  const conditions = [
    opts.matchId !== undefined ? eq(playerStatsAdvanced.matchId, opts.matchId) : undefined,
    opts.playerId !== undefined ? eq(playerStatsAdvanced.playerId, opts.playerId) : undefined,
    opts.year !== undefined ? eq(matches.year, opts.year) : undefined,
    opts.round !== undefined ? eq(matches.round, opts.round) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const totalRow = db
    .select({ total: sql<number>`count(*)` })
    .from(playerStatsAdvanced)
    .innerJoin(players, eq(playerStatsAdvanced.playerId, players.id))
    .innerJoin(matches, eq(playerStatsAdvanced.matchId, matches.id))
    .where(where)
    .get();
  const total = totalRow?.total ?? 0;

  const data = db
    .select({
      matchId: playerStatsAdvanced.matchId,
      playerName: players.name,
      teamId: playerStatsAdvanced.teamId,
      contestedPossessions: playerStatsAdvanced.contestedPossessions,
      uncontestedPossessions: playerStatsAdvanced.uncontestedPossessions,
      effectiveDisposals: playerStatsAdvanced.effectiveDisposals,
      disposalEfficiencyPct: playerStatsAdvanced.disposalEfficiencyPct,
      contestedMarks: playerStatsAdvanced.contestedMarks,
      goalAssists: playerStatsAdvanced.goalAssists,
      marksInside50: playerStatsAdvanced.marksInside50,
      onePercenters: playerStatsAdvanced.onePercenters,
      bounces: playerStatsAdvanced.bounces,
      centreClearances: playerStatsAdvanced.centreClearances,
      stoppageClearances: playerStatsAdvanced.stoppageClearances,
      scoreInvolvements: playerStatsAdvanced.scoreInvolvements,
      metresGained: playerStatsAdvanced.metresGained,
      turnovers: playerStatsAdvanced.turnovers,
      intercepts: playerStatsAdvanced.intercepts,
      tacklesInside50: playerStatsAdvanced.tacklesInside50,
      timeOnGroundPct: playerStatsAdvanced.timeOnGroundPct,
    })
    .from(playerStatsAdvanced)
    .innerJoin(players, eq(playerStatsAdvanced.playerId, players.id))
    .innerJoin(matches, eq(playerStatsAdvanced.matchId, matches.id))
    .where(where)
    .orderBy(desc(playerStatsAdvanced.contestedPossessions))
    .limit(opts.limit)
    .offset(opts.offset)
    .all();

  return { data, total };
}

export function getAdvancedPlayerStatsForMatch(matchId: number): PlayerAdvancedStatRow[] {
  return db
    .select({
      matchId: playerStatsAdvanced.matchId,
      playerName: players.name,
      teamId: playerStatsAdvanced.teamId,
      contestedPossessions: playerStatsAdvanced.contestedPossessions,
      uncontestedPossessions: playerStatsAdvanced.uncontestedPossessions,
      effectiveDisposals: playerStatsAdvanced.effectiveDisposals,
      disposalEfficiencyPct: playerStatsAdvanced.disposalEfficiencyPct,
      contestedMarks: playerStatsAdvanced.contestedMarks,
      goalAssists: playerStatsAdvanced.goalAssists,
      marksInside50: playerStatsAdvanced.marksInside50,
      onePercenters: playerStatsAdvanced.onePercenters,
      bounces: playerStatsAdvanced.bounces,
      centreClearances: playerStatsAdvanced.centreClearances,
      stoppageClearances: playerStatsAdvanced.stoppageClearances,
      scoreInvolvements: playerStatsAdvanced.scoreInvolvements,
      metresGained: playerStatsAdvanced.metresGained,
      turnovers: playerStatsAdvanced.turnovers,
      intercepts: playerStatsAdvanced.intercepts,
      tacklesInside50: playerStatsAdvanced.tacklesInside50,
      timeOnGroundPct: playerStatsAdvanced.timeOnGroundPct,
    })
    .from(playerStatsAdvanced)
    .innerJoin(players, eq(playerStatsAdvanced.playerId, players.id))
    .where(eq(playerStatsAdvanced.matchId, matchId))
    .orderBy(desc(playerStatsAdvanced.contestedPossessions))
    .all();
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
  sourcedAt: string;
}

export interface PlayerStatRow {
  matchId: number;
  playerName: string;
  teamId: string | null;
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
      sourcedAt: matches.sourcedAt,
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
    sourcedAt: r.sourcedAt,
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
      sourcedAt: matches.sourcedAt,
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
    sourcedAt: r.sourcedAt,
  }));
}

export function getPlayerStatsForMatch(matchId: number): PlayerStatRow[] {
  const rows = db
    .select({
      matchId: playerStats.matchId,
      playerName: players.name,
      teamId: playerStats.teamId,
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
  teamId: string | null;
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

export interface PlayerAdvancedStatYearRow {
  playerName: string;
  teamId: string | null;
  round: number;
  contestedPossessions: number;
  uncontestedPossessions: number;
  effectiveDisposals: number;
  disposalEfficiencyPct: number;
  contestedMarks: number;
  goalAssists: number;
  marksInside50: number;
  onePercenters: number;
  bounces: number;
  centreClearances: number;
  stoppageClearances: number;
  scoreInvolvements: number;
  metresGained: number;
  turnovers: number;
  intercepts: number;
  tacklesInside50: number;
  timeOnGroundPct: number;
}

export function getAllAdvancedPlayerStatsForYear(year: number): PlayerAdvancedStatYearRow[] {
  return db
    .select({
      playerName: players.name,
      teamId: playerStatsAdvanced.teamId,
      round: matches.round,
      contestedPossessions: playerStatsAdvanced.contestedPossessions,
      uncontestedPossessions: playerStatsAdvanced.uncontestedPossessions,
      effectiveDisposals: playerStatsAdvanced.effectiveDisposals,
      disposalEfficiencyPct: playerStatsAdvanced.disposalEfficiencyPct,
      contestedMarks: playerStatsAdvanced.contestedMarks,
      goalAssists: playerStatsAdvanced.goalAssists,
      marksInside50: playerStatsAdvanced.marksInside50,
      onePercenters: playerStatsAdvanced.onePercenters,
      bounces: playerStatsAdvanced.bounces,
      centreClearances: playerStatsAdvanced.centreClearances,
      stoppageClearances: playerStatsAdvanced.stoppageClearances,
      scoreInvolvements: playerStatsAdvanced.scoreInvolvements,
      metresGained: playerStatsAdvanced.metresGained,
      turnovers: playerStatsAdvanced.turnovers,
      intercepts: playerStatsAdvanced.intercepts,
      tacklesInside50: playerStatsAdvanced.tacklesInside50,
      timeOnGroundPct: playerStatsAdvanced.timeOnGroundPct,
    })
    .from(playerStatsAdvanced)
    .innerJoin(players, eq(playerStatsAdvanced.playerId, players.id))
    .innerJoin(matches, eq(playerStatsAdvanced.matchId, matches.id))
    .where(eq(matches.year, year))
    .orderBy(matches.round, players.name)
    .all();
}

export function getAllPlayerStatsForYear(year: number): PlayerStatYearRow[] {
  return db
    .select({
      playerName: players.name,
      teamId: playerStats.teamId,
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
      sourcedAt: matches.sourcedAt,
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
    sourcedAt: r.sourcedAt,
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
      teamId: playerStats.teamId,
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
    .select({ prefTheme: kaliUsers.prefTheme, prefFont: kaliUsers.prefFont, prefDarkMode: kaliUsers.prefDarkMode })
    .from(kaliUsers)
    .where(eq(kaliUsers.email, email))
    .get();
  return row ?? null;
}

export function upsertUserPreferences(email: string, prefs: Partial<UserPreferences>): void {
  db.update(kaliUsers).set(prefs).where(eq(kaliUsers.email, email)).run();
}

// ─── Kali Users ───────────────────────────────────────────────────────────────

export function getOrCreateUser(opts: {
  email: string;
  name: string;
  provider: string;
}): KaliUser {
  const now = new Date().toISOString();
  db.insert(kaliUsers)
    .values({ email: opts.email, name: opts.name, provider: opts.provider, createdAt: now, lastActiveAt: now })
    .onConflictDoUpdate({
      target: kaliUsers.email,
      set: { name: opts.name, provider: opts.provider, lastActiveAt: now },
    })
    .run();
  return db.select().from(kaliUsers).where(eq(kaliUsers.email, opts.email)).get()!;
}

export function listUsers(): KaliUser[] {
  return db.select().from(kaliUsers).orderBy(desc(kaliUsers.createdAt)).all();
}

export function setApiLimit(keyId: number, limit: number | null): void {
  db.update(apiKeys).set({ limit }).where(eq(apiKeys.id, keyId)).run();
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
      usage: apiKeys.usage,
      limit: apiKeys.limit,
      userName: kaliUsers.name,
      userEmail: kaliUsers.email,
    })
    .from(apiKeys)
    .innerJoin(kaliUsers, eq(apiKeys.userId, kaliUsers.id))
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
      usage: apiKeys.usage,
      limit: apiKeys.limit,
    })
    .from(apiKeys)
    .where(eq(apiKeys.key, key))
    .get();

  if (!row || row.revoked) return { valid: false };

  if (row.limit !== null && row.usage >= row.limit) {
    return { valid: false, rateLimited: true };
  }

  const now = new Date().toISOString();
  db.update(apiKeys)
    .set({ lastUsedAt: now, usage: row.usage + 1 })
    .where(eq(apiKeys.id, row.keyId))
    .run();
  db.update(kaliUsers)
    .set({ lastActiveAt: now })
    .where(eq(kaliUsers.id, row.userId))
    .run();

  return { valid: true };
}
