import { env } from "$env/dynamic/private";
import type {
  ScrapedMatch,
  ScrapedMatchAdvancedStats,
  ScrapedMatchStats,
  ScrapedPlayerAdvancedStat,
  ScrapedPlayerStat,
} from "$lib/afl/scraper";
import { scrapeMatchAdvancedStats, scrapeMatchStats } from "$lib/afl/scraper";
import type { SquiggleGame, SquiggleTip } from "$lib/afl/squiggle";
import { db } from "$lib/db/afl";
import type {
  PredictionFactors,
  PredictionGame,
  PredictionTeamBreakdown,
} from "$lib/afl/predictor";
import type {
  KaliUser,
  NewApiRequestLog,
  Player,
  Team,
} from "$lib/db/afl/schema";
import {
  apiKeys,
  apiRequestLog,
  fixtures,
  kaliUsers,
  matches,
  players,
  playerStats,
  playerStatsAdvanced,
  playerTeamAssignments,
  predictions,
  teams,
  tips,
} from "$lib/db/afl/schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { SampledGame } from "$lib/afl/legs-engine";
import { generateApiKey, hashApiKey, keyPrefix } from "$lib/api/key-crypto";
import { nextResetAt } from "$lib/api/quota-window";

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function upsertTeam(team: {
  id: string;
  name: string;
  shortName: string;
}) {
  await db.insert(teams).values(team).onConflictDoNothing();
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
    startDatetime: scraped.startDatetime,
    homeScore: scraped.homeScore,
    awayScore: scraped.awayScore,
    crowd: scraped.crowd,
    sourcedAt: new Date().toISOString(),
  };
  await db
    .insert(matches)
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
        // Only overwrite startDatetime if the new value is non-null (preserve existing if re-scraping via single match endpoint)
        startDatetime: sql`COALESCE(${matchValues.startDatetime}, ${matches.startDatetime})`,
        homeScore: matchValues.homeScore,
        awayScore: matchValues.awayScore,
        crowd: matchValues.crowd,
        sourcedAt: matchValues.sourcedAt,
      },
    });
}

// ─── Scrape + Persist (single match) ─────────────────────────────────────────

export async function scrapeAndPersistMatch(
  mid: number,
  startDatetime?: string | null,
) {
  const [data, advData] = await Promise.all([
    scrapeMatchStats(mid),
    scrapeMatchAdvancedStats(mid),
  ]);
  if (startDatetime != null) {
    data.match.startDatetime = startDatetime;
  }
  await persistScrapedMatch(data, advData);
  return {
    match: data.match,
    homeStatsCount: data.homeStats.length,
    awayStatsCount: data.awayStats.length,
  };
}

/**
 * Persist already-parsed match data. Separated from scraping so callers can
 * persist fixtures or a dry-run preview without hitting the network, and so the
 * parsing step (scrapeMatchStats / scrapeMatchAdvancedStats) carries no DB
 * coupling. mid and year are taken from the basic-stats match record.
 */
export async function persistScrapedMatch(
  data: ScrapedMatchStats,
  advData: ScrapedMatchAdvancedStats,
): Promise<void> {
  const { mid, year } = data.match;
  await upsertMatch(data.match);
  await batchUpsertPlayerStats(data.homeStats, mid, year);
  await batchUpsertPlayerStats(data.awayStats, mid, year);
  await batchUpsertPlayerAdvancedStats(advData.homeAdvStats, mid, year);
  await batchUpsertPlayerAdvancedStats(advData.awayAdvStats, mid, year);
}

// ─── Players ──────────────────────────────────────────────────────────────────

export async function getOrCreatePlayer(
  name: string,
  teamId: string,
  onlineId: string,
  year: number,
): Promise<number> {
  // Look up by onlineId — stable across team transfers and name abbreviations.
  const [existing] = await db
    .select({ id: players.id, currentTeamId: players.currentTeamId })
    .from(players)
    .where(eq(players.onlineId, onlineId));

  if (existing) {
    if (existing.currentTeamId !== teamId) {
      // Player has moved teams — close the current open assignment and open a new one.
      await db
        .update(playerTeamAssignments)
        .set({ endYear: year - 1 })
        .where(
          and(
            eq(playerTeamAssignments.playerId, existing.id),
            isNull(playerTeamAssignments.endYear),
          ),
        );
      await db
        .insert(playerTeamAssignments)
        .values({ playerId: existing.id, teamId, startYear: year })
        .onConflictDoNothing();
    }
    // Keep name and currentTeamId fresh without changing the row's identity.
    await db
      .update(players)
      .set({ name, currentTeamId: teamId })
      .where(eq(players.onlineId, onlineId));
    return existing.id;
  }

  const [result] = await db
    .insert(players)
    .values({ name, currentTeamId: teamId, onlineId })
    .onConflictDoNothing()
    .returning({ id: players.id });

  if (result) {
    // Record the initial team assignment for this new player.
    await db
      .insert(playerTeamAssignments)
      .values({ playerId: result.id, teamId, startYear: year })
      .onConflictDoNothing();
    return result.id;
  }

  // Race condition fallback
  const [fallback] = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.onlineId, onlineId));

  if (!fallback)
    throw new Error(
      `Failed to get or create player: ${name} (onlineId=${onlineId})`,
    );
  return fallback.id;
}

// ─── Player Stats ─────────────────────────────────────────────────────────────

export async function batchUpsertPlayerStats(
  stats: ScrapedPlayerStat[],
  matchId: number,
  year: number,
): Promise<void> {
  if (stats.length === 0) return;

  // Resolve all player IDs in parallel, then bulk-insert in one query
  const rows = await Promise.all(
    stats.map(async (stat) => {
      const playerId = await getOrCreatePlayer(
        stat.playerName,
        stat.teamId,
        stat.onlineId,
        year,
      );
      return {
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
    }),
  );

  await db
    .insert(playerStats)
    .values(rows)
    .onConflictDoUpdate({
      target: [playerStats.playerId, playerStats.matchId],
      set: {
        teamId: sql`excluded.team_id`,
        kicks: sql`excluded.kicks`,
        handballs: sql`excluded.handballs`,
        disposals: sql`excluded.disposals`,
        marks: sql`excluded.marks`,
        goals: sql`excluded.goals`,
        behinds: sql`excluded.behinds`,
        tackles: sql`excluded.tackles`,
        hitouts: sql`excluded.hitouts`,
        goalAssists: sql`excluded.goal_assists`,
        inside50s: sql`excluded.inside_50s`,
        clearances: sql`excluded.clearances`,
        clangers: sql`excluded.clangers`,
        rebound50s: sql`excluded.rebound_50s`,
        freesFor: sql`excluded.frees_for`,
        freesAgainst: sql`excluded.frees_against`,
        aflFantasyPts: sql`excluded.afl_fantasy_pts`,
        supercoachPts: sql`excluded.supercoach_pts`,
      },
    });
}

// ─── Player Advanced Stats ────────────────────────────────────────────────────

export async function batchUpsertPlayerAdvancedStats(
  stats: ScrapedPlayerAdvancedStat[],
  matchId: number,
  year: number,
): Promise<void> {
  if (stats.length === 0) return;

  const rows = await Promise.all(
    stats.map(async (stat) => {
      const playerId = await getOrCreatePlayer(
        stat.playerName,
        stat.teamId,
        stat.onlineId,
        year,
      );
      return {
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
    }),
  );

  await db
    .insert(playerStatsAdvanced)
    .values(rows)
    .onConflictDoUpdate({
      target: [playerStatsAdvanced.playerId, playerStatsAdvanced.matchId],
      set: {
        teamId: sql`excluded.team_id`,
        contestedPossessions: sql`excluded.contested_possessions`,
        uncontestedPossessions: sql`excluded.uncontested_possessions`,
        effectiveDisposals: sql`excluded.effective_disposals`,
        disposalEfficiencyPct: sql`excluded.disposal_efficiency_pct`,
        contestedMarks: sql`excluded.contested_marks`,
        goalAssists: sql`excluded.goal_assists`,
        marksInside50: sql`excluded.marks_inside_50`,
        onePercenters: sql`excluded.one_percenters`,
        bounces: sql`excluded.bounces`,
        centreClearances: sql`excluded.centre_clearances`,
        stoppageClearances: sql`excluded.stoppage_clearances`,
        scoreInvolvements: sql`excluded.score_involvements`,
        metresGained: sql`excluded.metres_gained`,
        turnovers: sql`excluded.turnovers`,
        intercepts: sql`excluded.intercepts`,
        tacklesInside50: sql`excluded.tackles_inside_50`,
        timeOnGroundPct: sql`excluded.time_on_ground_pct`,
      },
    });
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

export async function getPlayerAdvancedStatsPaginated(opts: {
  matchId?: number;
  playerId?: number;
  year?: number;
  round?: number;
  teamId?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  limit: number;
  offset: number;
}): Promise<{ data: PlayerAdvancedStatRow[]; total: number }> {
  const conditions = [
    opts.matchId !== undefined
      ? eq(playerStatsAdvanced.matchId, opts.matchId)
      : undefined,
    opts.playerId !== undefined
      ? eq(playerStatsAdvanced.playerId, opts.playerId)
      : undefined,
    opts.year !== undefined ? eq(matches.year, opts.year) : undefined,
    opts.round !== undefined ? eq(matches.round, opts.round) : undefined,
    opts.teamId !== undefined
      ? eq(playerStatsAdvanced.teamId, opts.teamId)
      : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(playerStatsAdvanced)
    .innerJoin(players, eq(playerStatsAdvanced.playerId, players.id))
    .innerJoin(matches, eq(playerStatsAdvanced.matchId, matches.id))
    .where(where);
  const total = totalRow?.total ?? 0;

  const sortColumn =
    PLAYER_ADVANCED_STAT_SORT_COLUMNS[opts.sortBy ?? "contested_possessions"] ??
    playerStatsAdvanced.contestedPossessions;
  const sortDir = opts.order === "asc" ? asc : desc;

  const data = await db
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
    .orderBy(sortDir(sortColumn))
    .limit(opts.limit)
    .offset(opts.offset);

  return { data, total };
}

export async function getAdvancedPlayerStatsForMatch(
  matchId: number,
): Promise<PlayerAdvancedStatRow[]> {
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
    .orderBy(desc(playerStatsAdvanced.contestedPossessions));
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
  startDatetime: string | null;
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

export async function getStoredRounds(): Promise<number[]> {
  const rows = await db
    .selectDistinct({ round: matches.round })
    .from(matches)
    .orderBy(desc(matches.round));
  return rows.map((r) => r.round);
}

export async function getStoredRoundsForYear(year: number): Promise<number[]> {
  const rows = await db
    .selectDistinct({ round: matches.round })
    .from(matches)
    .where(eq(matches.year, year))
    .orderBy(desc(matches.round));
  return rows.map((r) => r.round);
}

export async function getLatestStoredRound(): Promise<number | null> {
  const [row] = await db
    .select({ round: matches.round })
    .from(matches)
    .orderBy(desc(matches.round))
    .limit(1);
  return row?.round ?? null;
}

export async function getMatchesForRound(round: number): Promise<MatchRow[]> {
  const rows = await db
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
      startDatetime: matches.startDatetime,
      crowd: matches.crowd,
      sourcedAt: matches.sourcedAt,
    })
    .from(matches)
    .where(eq(matches.round, round));

  const allTeams = await db.select().from(teams);
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
    startDatetime: r.startDatetime,
    crowd: r.crowd,
    sourcedAt: r.sourcedAt,
  }));
}

export async function getMatchesForRoundAndYear(
  round: number,
  year: number,
): Promise<MatchRow[]> {
  const rows = await db
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
      startDatetime: matches.startDatetime,
      crowd: matches.crowd,
      sourcedAt: matches.sourcedAt,
    })
    .from(matches)
    .where(and(eq(matches.round, round), eq(matches.year, year)))
    .orderBy(asc(matches.startDatetime), asc(matches.id));

  const allTeams = await db.select().from(teams);
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
    startDatetime: r.startDatetime,
    crowd: r.crowd,
    sourcedAt: r.sourcedAt,
  }));
}

export async function getPlayerStatsForMatch(
  matchId: number,
): Promise<PlayerStatRow[]> {
  return db
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
    .orderBy(desc(playerStats.disposals));
}

// ─── Optimized batch queries for better performance ─────────────────────────

export async function getPlayerStatsForRound(
  round: number,
  year: number,
): Promise<Map<number, PlayerStatRow[]>> {
  const allStats = await db
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
    .where(and(eq(matches.round, round), eq(matches.year, year)))
    .orderBy(playerStats.matchId, desc(playerStats.disposals));

  // Group by match ID for easy lookup
  const grouped = new Map<number, PlayerStatRow[]>();
  for (const stat of allStats) {
    if (!grouped.has(stat.matchId)) {
      grouped.set(stat.matchId, []);
    }
    grouped.get(stat.matchId)!.push(stat);
  }
  return grouped;
}

export async function getAdvancedPlayerStatsForRound(
  round: number,
  year: number,
): Promise<Map<number, PlayerAdvancedStatRow[]>> {
  const allStats = await db
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
    .where(and(eq(matches.round, round), eq(matches.year, year)))
    .orderBy(
      playerStatsAdvanced.matchId,
      desc(playerStatsAdvanced.contestedPossessions),
    );

  // Group by match ID for easy lookup
  const grouped = new Map<number, PlayerAdvancedStatRow[]>();
  for (const stat of allStats) {
    if (!grouped.has(stat.matchId)) {
      grouped.set(stat.matchId, []);
    }
    grouped.get(stat.matchId)!.push(stat);
  }
  return grouped;
}

// ─── Fixtures & Tips (Squiggle Data) ──────────────────────────────────────────

export async function upsertFixtures(games: SquiggleGame[]): Promise<void> {
  if (games.length === 0) return;
  const now = new Date().toISOString();
  const values = games.map((g) => ({
    id: g.id,
    round: g.round,
    year: g.year,
    date: g.date,
    hteam: g.hteam,
    ateam: g.ateam,
    hteamid: g.hteamid,
    ateamid: g.ateamid,
    venue: g.venue,
    hscore: g.hscore,
    ascore: g.ascore,
    complete: g.complete,
    winner: g.winner,
    syncedAt: now,
  }));
  await db
    .insert(fixtures)
    .values(values)
    .onConflictDoUpdate({
      target: fixtures.id,
      set: {
        round: sql`excluded.round`,
        date: sql`excluded.date`,
        hscore: sql`excluded.hscore`,
        ascore: sql`excluded.ascore`,
        complete: sql`excluded.complete`,
        winner: sql`excluded.winner`,
        venue: sql`excluded.venue`,
        syncedAt: sql`excluded.synced_at`,
      },
    });
}

export async function getFixturesForYear(year: number) {
  return db
    .select()
    .from(fixtures)
    .where(eq(fixtures.year, year))
    .orderBy(asc(fixtures.round), asc(fixtures.date));
}

export async function upsertTips(
  fetchedTips: SquiggleTip[],
  year: number,
  round: number,
): Promise<void> {
  if (fetchedTips.length === 0) return;
  const now = new Date().toISOString();
  const values = fetchedTips.map((t) => ({
    gameId: t.gameid,
    year,
    round,
    hteam: t.hteam,
    ateam: t.ateam,
    hconfidence: Math.round(parseFloat(String(t.hconfidence)) || 50),
    source: t.source,
    syncedAt: now,
  }));
  // Delete old tips for this round and sync with new ones
  await db.delete(tips).where(and(eq(tips.year, year), eq(tips.round, round)));
  if (values.length > 0) {
    await db.insert(tips).values(values);
  }
}

export async function getTipsForRound(year: number, round: number) {
  return db
    .select()
    .from(tips)
    .where(and(eq(tips.year, year), eq(tips.round, round)))
    .orderBy(asc(tips.gameId));
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

export async function getAllAdvancedPlayerStatsForYear(
  year: number,
): Promise<PlayerAdvancedStatYearRow[]> {
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
    .orderBy(matches.round, players.name);
}

export async function getAllPlayerStatsForYear(
  year: number,
): Promise<PlayerStatYearRow[]> {
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
    .orderBy(matches.round, players.name);
}

// ─── Public API — Teams ───────────────────────────────────────────────────────

export async function getAllTeams(): Promise<Team[]> {
  return db.select().from(teams).orderBy(asc(teams.name));
}

// ─── Public API — Matches (paginated) ────────────────────────────────────────

export async function getMatchesPaginated(opts: {
  year?: number;
  round?: number;
  teamId?: string;
  venue?: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  offset: number;
}): Promise<{ data: MatchRow[]; total: number }> {
  const conditions = [
    opts.year !== undefined ? eq(matches.year, opts.year) : undefined,
    opts.round !== undefined ? eq(matches.round, opts.round) : undefined,
    opts.teamId !== undefined
      ? or(
          eq(matches.homeTeamId, opts.teamId),
          eq(matches.awayTeamId, opts.teamId),
        )
      : undefined,
    opts.venue !== undefined ? eq(matches.venue, opts.venue) : undefined,
    opts.dateFrom !== undefined ? gte(matches.date, opts.dateFrom) : undefined,
    opts.dateTo !== undefined ? lte(matches.date, opts.dateTo) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(matches)
    .where(where);
  const total = totalRow?.total ?? 0;

  const rows = await db
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
      startDatetime: matches.startDatetime,
      crowd: matches.crowd,
      sourcedAt: matches.sourcedAt,
    })
    .from(matches)
    .where(where)
    .orderBy(desc(matches.year), desc(matches.round))
    .limit(opts.limit)
    .offset(opts.offset);

  const allTeams = await db.select().from(teams);
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
    startDatetime: r.startDatetime,
    crowd: r.crowd,
    sourcedAt: r.sourcedAt,
  }));

  return { data, total };
}

// ─── Public API — Players (paginated) ────────────────────────────────────────

export async function getPlayersPaginated(opts: {
  teamId?: string;
  name?: string;
  year?: number;
  limit: number;
  offset: number;
}): Promise<{ data: Player[]; total: number }> {
  const conditions = [
    opts.teamId !== undefined
      ? eq(players.currentTeamId, opts.teamId)
      : undefined,
    opts.name !== undefined ? ilike(players.name, `%${opts.name}%`) : undefined,
    opts.year !== undefined
      ? sql`${players.id} IN (SELECT DISTINCT ps.player_id FROM player_stats ps INNER JOIN matches m ON ps.match_id = m.id WHERE m.year = ${opts.year})`
      : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(players)
    .where(where);
  const total = totalRow?.total ?? 0;

  const data = await db
    .select()
    .from(players)
    .where(where)
    .orderBy(asc(players.name))
    .limit(opts.limit)
    .offset(opts.offset);

  return { data, total };
}

// ─── Public API — Player Stats (paginated) ───────────────────────────────────

export async function getPlayerStatsPaginated(opts: {
  matchId?: number;
  playerId?: number;
  year?: number;
  round?: number;
  teamId?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  limit: number;
  offset: number;
}): Promise<{ data: PlayerStatRow[]; total: number }> {
  const conditions = [
    opts.matchId !== undefined
      ? eq(playerStats.matchId, opts.matchId)
      : undefined,
    opts.playerId !== undefined
      ? eq(playerStats.playerId, opts.playerId)
      : undefined,
    opts.year !== undefined ? eq(matches.year, opts.year) : undefined,
    opts.round !== undefined ? eq(matches.round, opts.round) : undefined,
    opts.teamId !== undefined ? eq(playerStats.teamId, opts.teamId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(where);
  const total = totalRow?.total ?? 0;

  const sortColumn =
    PLAYER_STAT_SORT_COLUMNS[opts.sortBy ?? "disposals"] ??
    playerStats.disposals;
  const sortDir = opts.order === "asc" ? asc : desc;

  const data = await db
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
    .orderBy(sortDir(sortColumn))
    .limit(opts.limit)
    .offset(opts.offset);

  return { data, total };
}

// ─── User Preferences ─────────────────────────────────────────────────────────

export interface UserPreferences {
  prefTheme: string;
  prefFont: string;
  prefDarkMode: string;
}

export async function getUserPreferences(
  email: string,
): Promise<UserPreferences | null> {
  const [row] = await db
    .select({
      prefTheme: kaliUsers.prefTheme,
      prefFont: kaliUsers.prefFont,
      prefDarkMode: kaliUsers.prefDarkMode,
    })
    .from(kaliUsers)
    .where(eq(kaliUsers.email, email));
  return row ?? null;
}

export async function upsertUserPreferences(
  email: string,
  prefs: Partial<UserPreferences>,
): Promise<void> {
  await db.update(kaliUsers).set(prefs).where(eq(kaliUsers.email, email));
}

// ─── Kali Users ───────────────────────────────────────────────────────────────

export async function getOrCreateUser(opts: {
  email: string;
  name: string;
  provider: string;
}): Promise<KaliUser> {
  const now = new Date().toISOString();
  await db
    .insert(kaliUsers)
    .values({
      email: opts.email,
      name: opts.name,
      provider: opts.provider,
      createdAt: now,
      lastActiveAt: now,
    })
    .onConflictDoUpdate({
      target: kaliUsers.email,
      set: { name: opts.name, provider: opts.provider, lastActiveAt: now },
    });
  const [user] = await db
    .select()
    .from(kaliUsers)
    .where(eq(kaliUsers.email, opts.email));
  return user!;
}

export async function listUsers(): Promise<KaliUser[]> {
  return db.select().from(kaliUsers).orderBy(desc(kaliUsers.createdAt));
}

export async function getUserByEmail(email: string): Promise<KaliUser | null> {
  const [user] = await db
    .select()
    .from(kaliUsers)
    .where(eq(kaliUsers.email, email));
  return user ?? null;
}

/** Set a user's daily quota ceiling. `null` means unlimited. */
export async function setUserLimit(
  userId: number,
  limit: number | null,
): Promise<void> {
  await db.update(kaliUsers).set({ limit }).where(eq(kaliUsers.id, userId));
}

/**
 * Force a single user's quota window open again: zero the counter and advance
 * the boundary to the next 00:00 UTC. Used by the admin force-reset tool to
 * unblock someone before their window rolls over on its own.
 */
export async function forceResetUserQuota(userId: number): Promise<void> {
  await db
    .update(kaliUsers)
    .set({ usage: 0, resetAt: nextResetAt() })
    .where(eq(kaliUsers.id, userId));
}

/**
 * Lazily reset ONE user's quota window iff it has expired (or was never
 * initialised). No-op when the window is still active, so it's idempotent and
 * cheap to call on every page view. Used by the web UI so a signed-in user
 * always sees the true current-window figures even if they haven't hit the API
 * since the boundary rolled over. Sets `usage = 0` (a page view does not consume
 * a request, unlike the API path which resets to 1).
 */
export async function lazyResetUserQuota(userId: number): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(kaliUsers)
    .set({ usage: 0, resetAt: nextResetAt() })
    .where(
      and(
        eq(kaliUsers.id, userId),
        or(isNull(kaliUsers.resetAt), lte(kaliUsers.resetAt, now)),
      ),
    );
}

/**
 * Lazily reset EVERY user whose window has expired, in one statement. Returns
 * the number of users reset. Backs the admin "reset expired quotas" button so an
 * admin can roll everyone's window forward without waiting for each user to make
 * an API call.
 */
export async function lazyResetAllExpiredQuotas(): Promise<number> {
  const now = new Date().toISOString();
  const reset = await db
    .update(kaliUsers)
    .set({ usage: 0, resetAt: nextResetAt() })
    .where(or(isNull(kaliUsers.resetAt), lte(kaliUsers.resetAt, now)))
    .returning({ id: kaliUsers.id });
  return reset.length;
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

/**
 * Mint a new API key for a user. The raw token is returned exactly once; only
 * its SHA-256 hash and a non-secret 8-char prefix are persisted. Keys carry no
 * per-key limit — quota is enforced against the owning user.
 */
export async function createApiKey(
  userId: number,
  name: string,
): Promise<string> {
  const raw = generateApiKey();
  const now = new Date().toISOString();

  await db.insert(apiKeys).values({
    userId,
    keyHash: hashApiKey(raw),
    keyPrefix: keyPrefix(raw),
    name,
    createdAt: now,
  });
  return raw;
}

// A key row joined with its owning user's shared quota bucket. Per-key
// `keyUsage` / `totalUsage` are visibility-only; `usage` / `limit` / `resetAt`
// are the user-level figures that actually gate access.
export interface ApiKeyView {
  id: number;
  userId: number;
  keyPrefix: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
  keyUsage: number;
  totalUsage: number;
  usage: number;
  limit: number | null;
  resetAt: string | null;
}

const apiKeyViewColumns = {
  id: apiKeys.id,
  userId: apiKeys.userId,
  keyPrefix: apiKeys.keyPrefix,
  name: apiKeys.name,
  createdAt: apiKeys.createdAt,
  lastUsedAt: apiKeys.lastUsedAt,
  revoked: apiKeys.revoked,
  keyUsage: apiKeys.usage,
  totalUsage: apiKeys.totalUsage,
  usage: kaliUsers.usage,
  limit: kaliUsers.limit,
  resetAt: kaliUsers.resetAt,
};

export async function listApiKeysForUser(
  userId: number,
): Promise<ApiKeyView[]> {
  return db
    .select(apiKeyViewColumns)
    .from(apiKeys)
    .innerJoin(kaliUsers, eq(apiKeys.userId, kaliUsers.id))
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function listAllApiKeys(): Promise<
  (ApiKeyView & { userName: string; userEmail: string })[]
> {
  return db
    .select({
      ...apiKeyViewColumns,
      userName: kaliUsers.name,
      userEmail: kaliUsers.email,
    })
    .from(apiKeys)
    .innerJoin(kaliUsers, eq(apiKeys.userId, kaliUsers.id))
    .orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(id: number): Promise<void> {
  await db.update(apiKeys).set({ revoked: true }).where(eq(apiKeys.id, id));
}

export interface ValidateApiKeyResult {
  valid: boolean;
  rateLimited?: boolean;
  apiKeyId?: number;
  userId?: number;
  limit?: number | null;
  remaining?: number;
  resetAt?: string;
}

/**
 * Resolve a raw bearer token to its owning user and, in a single atomic
 * statement, apply the lazy calendar-aligned window reset and the
 * check-and-increment against the per-user quota. The read and write cannot
 * interleave, so two concurrent requests can neither both pass the boundary
 * (TOCTOU) nor lose an increment.
 *
 * Zero rows returned means the user is over their limit (429). A `null` /
 * uninitialised `reset_at` is treated as an expired window so it self-heals on
 * the first request. Per-key counters are bumped off the latency path by hooks.
 */
export async function validateApiKey(
  rawKey: string,
): Promise<ValidateApiKeyResult> {
  const hash = hashApiKey(rawKey);
  const now = new Date().toISOString();
  const next = nextResetAt(new Date(now));

  // First resolve the key → its id + owning user, independent of quota state,
  // so we can tell "no such key" (401) apart from "over limit" (429).
  const [key] = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.revoked, false)));

  if (!key) return { valid: false };

  // Atomic lazy-reset + check-increment on the user row. Postgres evaluates the
  // SET CASE arms and the WHERE guard against the same pre-update row, so the
  // "window expired" test is consistent across all three.
  const rows = await db.execute<{
    usage: number;
    limit: number | null;
    reset_at: string | null;
  }>(sql`
    UPDATE ${kaliUsers} SET
      usage = CASE WHEN ${kaliUsers.resetAt} IS NULL OR ${now} >= ${kaliUsers.resetAt}
                   THEN 1 ELSE ${kaliUsers.usage} + 1 END,
      reset_at = CASE WHEN ${kaliUsers.resetAt} IS NULL OR ${now} >= ${kaliUsers.resetAt}
                      THEN ${next} ELSE ${kaliUsers.resetAt} END,
      total_api_usage = ${kaliUsers.totalApiUsage} + 1,
      last_active_at = ${now}
    WHERE ${kaliUsers.id} = ${key.userId}
      AND (${kaliUsers.limit} IS NULL
           OR ${kaliUsers.usage} < ${kaliUsers.limit}
           OR ${kaliUsers.resetAt} IS NULL
           OR ${now} >= ${kaliUsers.resetAt})
    RETURNING ${kaliUsers.usage} AS usage, ${kaliUsers.limit} AS limit, ${kaliUsers.resetAt} AS reset_at
  `);

  const row = rows[0];
  if (!row) {
    // User exists but is over their limit within the current window. Fetch the
    // figures (one extra read, only on the blocked path) so the 429 can carry
    // accurate X-RateLimit-* / Retry-After headers.
    const [u] = await db
      .select({
        usage: kaliUsers.usage,
        limit: kaliUsers.limit,
        resetAt: kaliUsers.resetAt,
      })
      .from(kaliUsers)
      .where(eq(kaliUsers.id, key.userId));
    return {
      valid: false,
      rateLimited: true,
      userId: key.userId,
      limit: u?.limit ?? null,
      remaining: 0,
      resetAt: u?.resetAt ?? next,
    };
  }

  const limit = row.limit;
  return {
    valid: true,
    apiKeyId: key.id,
    userId: key.userId,
    limit,
    remaining: limit === null ? undefined : Math.max(0, limit - row.usage),
    resetAt: row.reset_at ?? next,
  };
}

/**
 * Off-latency-path bump of a key's visibility counters after a request. Never
 * gates anything; failures are swallowed by the caller (hooks).
 */
export async function bumpKeyUsage(apiKeyId: number): Promise<void> {
  await db
    .update(apiKeys)
    .set({
      usage: sql`${apiKeys.usage} + 1`,
      totalUsage: sql`${apiKeys.totalUsage} + 1`,
      lastUsedAt: new Date().toISOString(),
    })
    .where(eq(apiKeys.id, apiKeyId));
}

/**
 * Refund one unit of a user's quota (and lifetime counter) after a 5xx, clamped
 * so usage never goes below 0. Off the latency path; called from hooks.
 */
export async function refundUserQuota(userId: number): Promise<void> {
  await db
    .update(kaliUsers)
    .set({
      usage: sql`GREATEST(${kaliUsers.usage} - 1, 0)`,
      totalApiUsage: sql`GREATEST(${kaliUsers.totalApiUsage} - 1, 0)`,
    })
    .where(eq(kaliUsers.id, userId));
}

// ─── API Request Analytics ────────────────────────────────────────────────────

/**
 * Fire-and-forget insert of a single API request log row. Never throws into the
 * caller — an analytics outage must not be able to take down the public API.
 */
export async function recordApiRequest(row: NewApiRequestLog): Promise<void> {
  try {
    await db.insert(apiRequestLog).values(row);
  } catch (err) {
    console.error("[analytics] failed to record api request", err);
  }
}

/**
 * Build the `timestamp >= since` filter, or undefined for all-time (since = null).
 * Stored timestamps are ISO text, so we compare against an ISO string.
 */
function sinceFilter(since: Date | null) {
  return since ? gte(apiRequestLog.timestamp, since.toISOString()) : undefined;
}

export type TopEndpoint = {
  routeId: string;
  count: number;
  errorPct: number;
  p50LatencyMs: number;
};

/**
 * Per-endpoint request count, error rate (status >= 400), and median latency
 * over the selected window, busiest first.
 */
export async function getTopEndpoints({
  since,
}: {
  since: Date | null;
}): Promise<TopEndpoint[]> {
  const rows = await db
    .select({
      routeId: apiRequestLog.routeId,
      count: count(),
      errors: sql<number>`count(*) filter (where ${apiRequestLog.status} >= 400)`,
      p50: sql<number>`percentile_cont(0.5) within group (order by ${apiRequestLog.latencyMs})`,
    })
    .from(apiRequestLog)
    .where(sinceFilter(since))
    .groupBy(apiRequestLog.routeId)
    .orderBy(desc(count()));

  return rows.map((r) => ({
    routeId: r.routeId,
    count: Number(r.count),
    errorPct:
      Number(r.count) > 0
        ? Math.round((Number(r.errors) / Number(r.count)) * 1000) / 10
        : 0,
    p50LatencyMs: Math.round(Number(r.p50) ?? 0),
  }));
}

/**
 * Known v1 routes (from the filesystem enumerator) that received zero requests
 * in the selected window — candidates for deprecation.
 */
export async function getZeroTrafficRoutes({
  since,
  knownRoutes,
}: {
  since: Date | null;
  knownRoutes: string[];
}): Promise<string[]> {
  const rows = await db
    .selectDistinct({ routeId: apiRequestLog.routeId })
    .from(apiRequestLog)
    .where(sinceFilter(since));

  const hit = new Set(rows.map((r) => r.routeId));
  return knownRoutes.filter((route) => !hit.has(route));
}

export type RecentError = {
  id: number;
  timestamp: string;
  routeId: string;
  status: number;
  queryString: string | null;
  userName: string | null;
  userEmail: string | null;
};

/**
 * The most recent server-side failures (status >= 500), newest first.
 */
export async function getRecentErrors({
  limit = 50,
}: {
  limit?: number;
}): Promise<RecentError[]> {
  return db
    .select({
      id: apiRequestLog.id,
      timestamp: apiRequestLog.timestamp,
      routeId: apiRequestLog.routeId,
      status: apiRequestLog.status,
      queryString: apiRequestLog.queryString,
      userName: kaliUsers.name,
      userEmail: kaliUsers.email,
    })
    .from(apiRequestLog)
    .leftJoin(kaliUsers, eq(apiRequestLog.userId, kaliUsers.id))
    .where(gte(apiRequestLog.status, 500))
    .orderBy(desc(apiRequestLog.timestamp))
    .limit(limit);
}

export type PerUserTotal = {
  userId: number;
  userName: string | null;
  userEmail: string | null;
  count: number;
  errorPct: number;
};

/**
 * Top users by request count over the window, with their personal error rate.
 * Unauthenticated traffic (null user) is excluded.
 */
export async function getPerUserTotals({
  since,
}: {
  since: Date | null;
}): Promise<PerUserTotal[]> {
  const rows = await db
    .select({
      userId: apiRequestLog.userId,
      userName: kaliUsers.name,
      userEmail: kaliUsers.email,
      count: count(),
      errors: sql<number>`count(*) filter (where ${apiRequestLog.status} >= 400)`,
    })
    .from(apiRequestLog)
    .leftJoin(kaliUsers, eq(apiRequestLog.userId, kaliUsers.id))
    .where(and(isNotNull(apiRequestLog.userId), sinceFilter(since)))
    .groupBy(apiRequestLog.userId, kaliUsers.name, kaliUsers.email)
    .orderBy(desc(count()));

  return rows.map((r) => ({
    userId: r.userId as number,
    userName: r.userName,
    userEmail: r.userEmail,
    count: Number(r.count),
    errorPct:
      Number(r.count) > 0
        ? Math.round((Number(r.errors) / Number(r.count)) * 1000) / 10
        : 0,
  }));
}

// ─── Sort Column Mappings ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PLAYER_STAT_SORT_COLUMNS: Record<string, any> = {
  kicks: playerStats.kicks,
  handballs: playerStats.handballs,
  disposals: playerStats.disposals,
  marks: playerStats.marks,
  goals: playerStats.goals,
  behinds: playerStats.behinds,
  tackles: playerStats.tackles,
  hitouts: playerStats.hitouts,
  goal_assists: playerStats.goalAssists,
  inside_50s: playerStats.inside50s,
  clearances: playerStats.clearances,
  clangers: playerStats.clangers,
  rebound_50s: playerStats.rebound50s,
  frees_for: playerStats.freesFor,
  frees_against: playerStats.freesAgainst,
  afl_fantasy_pts: playerStats.aflFantasyPts,
  supercoach_pts: playerStats.supercoachPts,
};

export const VALID_PLAYER_STAT_SORT_KEYS = Object.keys(
  PLAYER_STAT_SORT_COLUMNS,
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PLAYER_ADVANCED_STAT_SORT_COLUMNS: Record<string, any> = {
  contested_possessions: playerStatsAdvanced.contestedPossessions,
  uncontested_possessions: playerStatsAdvanced.uncontestedPossessions,
  effective_disposals: playerStatsAdvanced.effectiveDisposals,
  disposal_efficiency_pct: playerStatsAdvanced.disposalEfficiencyPct,
  contested_marks: playerStatsAdvanced.contestedMarks,
  goal_assists: playerStatsAdvanced.goalAssists,
  marks_inside_50: playerStatsAdvanced.marksInside50,
  one_percenters: playerStatsAdvanced.onePercenters,
  bounces: playerStatsAdvanced.bounces,
  centre_clearances: playerStatsAdvanced.centreClearances,
  stoppage_clearances: playerStatsAdvanced.stoppageClearances,
  score_involvements: playerStatsAdvanced.scoreInvolvements,
  metres_gained: playerStatsAdvanced.metresGained,
  turnovers: playerStatsAdvanced.turnovers,
  intercepts: playerStatsAdvanced.intercepts,
  tackles_inside_50: playerStatsAdvanced.tacklesInside50,
  time_on_ground_pct: playerStatsAdvanced.timeOnGroundPct,
};

export const VALID_PLAYER_ADVANCED_STAT_SORT_KEYS = Object.keys(
  PLAYER_ADVANCED_STAT_SORT_COLUMNS,
);

// Combined sort keys for leaderboards (basic stats)
export const VALID_LEADERBOARD_STATS = VALID_PLAYER_STAT_SORT_KEYS;

// ─── Single Resource Lookups ──────────────────────────────────────────────────

export async function getTeamById(id: string): Promise<Team | null> {
  const [row] = await db.select().from(teams).where(eq(teams.id, id));
  return row ?? null;
}

export async function getPlayerById(id: number): Promise<Player | null> {
  const [row] = await db.select().from(players).where(eq(players.id, id));
  return row ?? null;
}

export async function getMatchById(id: number): Promise<MatchRow | null> {
  const rows = await db
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
      startDatetime: matches.startDatetime,
      crowd: matches.crowd,
      sourcedAt: matches.sourcedAt,
    })
    .from(matches)
    .where(eq(matches.id, id));

  if (rows.length === 0) return null;

  const allTeams = await db.select().from(teams);
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));
  const r = rows[0];

  return {
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
    startDatetime: r.startDatetime,
    crowd: r.crowd,
    sourcedAt: r.sourcedAt,
  };
}

// ─── Player Team Assignments (paginated) ──────────────────────────────────────

export interface PlayerTeamAssignmentRow {
  id: number;
  playerName: string;
  playerId: number;
  teamId: string;
  teamName: string;
  startYear: number;
  endYear: number | null;
  reason: string | null;
}

export async function getPlayerTeamAssignmentsPaginated(opts: {
  playerId?: number;
  teamId?: string;
  year?: number;
  reason?: string;
  limit: number;
  offset: number;
}): Promise<{ data: PlayerTeamAssignmentRow[]; total: number }> {
  const conditions = [
    opts.playerId !== undefined
      ? eq(playerTeamAssignments.playerId, opts.playerId)
      : undefined,
    opts.teamId !== undefined
      ? eq(playerTeamAssignments.teamId, opts.teamId)
      : undefined,
    opts.reason !== undefined
      ? eq(playerTeamAssignments.reason, opts.reason)
      : undefined,
    opts.year !== undefined
      ? and(
          lte(playerTeamAssignments.startYear, opts.year),
          or(
            isNull(playerTeamAssignments.endYear),
            gte(playerTeamAssignments.endYear, opts.year),
          ),
        )
      : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(playerTeamAssignments)
    .innerJoin(players, eq(playerTeamAssignments.playerId, players.id))
    .innerJoin(teams, eq(playerTeamAssignments.teamId, teams.id))
    .where(where);
  const total = totalRow?.total ?? 0;

  const data = await db
    .select({
      id: playerTeamAssignments.id,
      playerName: players.name,
      playerId: playerTeamAssignments.playerId,
      teamId: playerTeamAssignments.teamId,
      teamName: teams.name,
      startYear: playerTeamAssignments.startYear,
      endYear: playerTeamAssignments.endYear,
      reason: playerTeamAssignments.reason,
    })
    .from(playerTeamAssignments)
    .innerJoin(players, eq(playerTeamAssignments.playerId, players.id))
    .innerJoin(teams, eq(playerTeamAssignments.teamId, teams.id))
    .where(where)
    .orderBy(desc(playerTeamAssignments.startYear))
    .limit(opts.limit)
    .offset(opts.offset);

  return { data, total };
}

// ─── Player Career Stats ──────────────────────────────────────────────────────

export interface AggregatedPlayerStats {
  playerId: number;
  playerName: string;
  currentTeamId: string;
  gamesPlayed: number;
  totals: {
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
  };
  averages: {
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
  };
}

async function aggregatePlayerStats(
  playerId: number,
  year?: number,
): Promise<AggregatedPlayerStats | null> {
  const player = await getPlayerById(playerId);
  if (!player) return null;

  const conditions = [eq(playerStats.playerId, playerId)];
  if (year !== undefined) {
    conditions.push(eq(matches.year, year));
  }

  const [row] = await db
    .select({
      gamesPlayed: count(),
      kicks: sql<number>`COALESCE(SUM(${playerStats.kicks}), 0)`,
      handballs: sql<number>`COALESCE(SUM(${playerStats.handballs}), 0)`,
      disposals: sql<number>`COALESCE(SUM(${playerStats.disposals}), 0)`,
      marks: sql<number>`COALESCE(SUM(${playerStats.marks}), 0)`,
      goals: sql<number>`COALESCE(SUM(${playerStats.goals}), 0)`,
      behinds: sql<number>`COALESCE(SUM(${playerStats.behinds}), 0)`,
      tackles: sql<number>`COALESCE(SUM(${playerStats.tackles}), 0)`,
      hitouts: sql<number>`COALESCE(SUM(${playerStats.hitouts}), 0)`,
      goalAssists: sql<number>`COALESCE(SUM(${playerStats.goalAssists}), 0)`,
      inside50s: sql<number>`COALESCE(SUM(${playerStats.inside50s}), 0)`,
      clearances: sql<number>`COALESCE(SUM(${playerStats.clearances}), 0)`,
      clangers: sql<number>`COALESCE(SUM(${playerStats.clangers}), 0)`,
      rebound50s: sql<number>`COALESCE(SUM(${playerStats.rebound50s}), 0)`,
      freesFor: sql<number>`COALESCE(SUM(${playerStats.freesFor}), 0)`,
      freesAgainst: sql<number>`COALESCE(SUM(${playerStats.freesAgainst}), 0)`,
      aflFantasyPts: sql<number>`COALESCE(SUM(${playerStats.aflFantasyPts}), 0)`,
      supercoachPts: sql<number>`COALESCE(SUM(${playerStats.supercoachPts}), 0)`,
    })
    .from(playerStats)
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(and(...conditions));

  const gp = row?.gamesPlayed ?? 0;
  const avg = (val: number) =>
    gp > 0 ? Math.round((val / gp) * 100) / 100 : 0;

  const totals = {
    kicks: row?.kicks ?? 0,
    handballs: row?.handballs ?? 0,
    disposals: row?.disposals ?? 0,
    marks: row?.marks ?? 0,
    goals: row?.goals ?? 0,
    behinds: row?.behinds ?? 0,
    tackles: row?.tackles ?? 0,
    hitouts: row?.hitouts ?? 0,
    goalAssists: row?.goalAssists ?? 0,
    inside50s: row?.inside50s ?? 0,
    clearances: row?.clearances ?? 0,
    clangers: row?.clangers ?? 0,
    rebound50s: row?.rebound50s ?? 0,
    freesFor: row?.freesFor ?? 0,
    freesAgainst: row?.freesAgainst ?? 0,
    aflFantasyPts: row?.aflFantasyPts ?? 0,
    supercoachPts: row?.supercoachPts ?? 0,
  };

  const averages = {
    kicks: avg(totals.kicks),
    handballs: avg(totals.handballs),
    disposals: avg(totals.disposals),
    marks: avg(totals.marks),
    goals: avg(totals.goals),
    behinds: avg(totals.behinds),
    tackles: avg(totals.tackles),
    hitouts: avg(totals.hitouts),
    goalAssists: avg(totals.goalAssists),
    inside50s: avg(totals.inside50s),
    clearances: avg(totals.clearances),
    clangers: avg(totals.clangers),
    rebound50s: avg(totals.rebound50s),
    freesFor: avg(totals.freesFor),
    freesAgainst: avg(totals.freesAgainst),
    aflFantasyPts: avg(totals.aflFantasyPts),
    supercoachPts: avg(totals.supercoachPts),
  };

  return {
    playerId,
    playerName: player.name,
    currentTeamId: player.currentTeamId,
    gamesPlayed: gp,
    totals,
    averages,
  };
}

export async function getPlayerCareerStats(
  playerId: number,
): Promise<AggregatedPlayerStats | null> {
  return aggregatePlayerStats(playerId);
}

export async function getPlayerSeasonStats(
  playerId: number,
  year: number,
): Promise<AggregatedPlayerStats | null> {
  return aggregatePlayerStats(playerId, year);
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardRow {
  playerId: number;
  playerName: string;
  teamId: string | null;
  value: number;
}

export async function getLeaderboard(opts: {
  stat: string;
  year?: number;
  round?: number;
  teamId?: string;
  limit: number;
  offset: number;
}): Promise<{ data: LeaderboardRow[]; total: number }> {
  const column = PLAYER_STAT_SORT_COLUMNS[opts.stat];
  if (!column) throw new Error(`Invalid stat: ${opts.stat}`);

  const conditions = [
    opts.year !== undefined ? eq(matches.year, opts.year) : undefined,
    opts.round !== undefined ? eq(matches.round, opts.round) : undefined,
    opts.teamId !== undefined ? eq(playerStats.teamId, opts.teamId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(where);
  const total = totalRow?.total ?? 0;

  const data = await db
    .select({
      playerId: playerStats.playerId,
      playerName: players.name,
      teamId: playerStats.teamId,
      value: column,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(where)
    .orderBy(desc(column))
    .limit(opts.limit)
    .offset(opts.offset);

  return { data, total };
}

// ─── Team Stats (aggregated per match) ────────────────────────────────────────

export interface TeamMatchStatsRow {
  matchId: number;
  round: number;
  year: number;
  opponent: string;
  opponentShortName: string;
  isHome: boolean;
  teamScore: number | null;
  opponentScore: number | null;
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

export async function getTeamStatsPaginated(opts: {
  teamId: string;
  year?: number;
  round?: number;
  limit: number;
  offset: number;
}): Promise<{ data: TeamMatchStatsRow[]; total: number }> {
  const matchConditions = [
    or(
      eq(matches.homeTeamId, opts.teamId),
      eq(matches.awayTeamId, opts.teamId),
    ),
    opts.year !== undefined ? eq(matches.year, opts.year) : undefined,
    opts.round !== undefined ? eq(matches.round, opts.round) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const matchWhere = and(...matchConditions);

  const [totalRow] = await db
    .select({ total: count() })
    .from(matches)
    .where(matchWhere);
  const total = totalRow?.total ?? 0;

  const matchRows = await db
    .select()
    .from(matches)
    .where(matchWhere)
    .orderBy(desc(matches.year), desc(matches.round))
    .limit(opts.limit)
    .offset(opts.offset);

  const allTeams = await db.select().from(teams);
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  const data: TeamMatchStatsRow[] = [];
  for (const m of matchRows) {
    const isHome = m.homeTeamId === opts.teamId;
    const opponentId = isHome ? m.awayTeamId : m.homeTeamId;

    const [agg] = await db
      .select({
        kicks: sql<number>`COALESCE(SUM(${playerStats.kicks}), 0)`,
        handballs: sql<number>`COALESCE(SUM(${playerStats.handballs}), 0)`,
        disposals: sql<number>`COALESCE(SUM(${playerStats.disposals}), 0)`,
        marks: sql<number>`COALESCE(SUM(${playerStats.marks}), 0)`,
        goals: sql<number>`COALESCE(SUM(${playerStats.goals}), 0)`,
        behinds: sql<number>`COALESCE(SUM(${playerStats.behinds}), 0)`,
        tackles: sql<number>`COALESCE(SUM(${playerStats.tackles}), 0)`,
        hitouts: sql<number>`COALESCE(SUM(${playerStats.hitouts}), 0)`,
        goalAssists: sql<number>`COALESCE(SUM(${playerStats.goalAssists}), 0)`,
        inside50s: sql<number>`COALESCE(SUM(${playerStats.inside50s}), 0)`,
        clearances: sql<number>`COALESCE(SUM(${playerStats.clearances}), 0)`,
        clangers: sql<number>`COALESCE(SUM(${playerStats.clangers}), 0)`,
        rebound50s: sql<number>`COALESCE(SUM(${playerStats.rebound50s}), 0)`,
        freesFor: sql<number>`COALESCE(SUM(${playerStats.freesFor}), 0)`,
        freesAgainst: sql<number>`COALESCE(SUM(${playerStats.freesAgainst}), 0)`,
        aflFantasyPts: sql<number>`COALESCE(SUM(${playerStats.aflFantasyPts}), 0)`,
        supercoachPts: sql<number>`COALESCE(SUM(${playerStats.supercoachPts}), 0)`,
      })
      .from(playerStats)
      .where(
        and(eq(playerStats.matchId, m.id), eq(playerStats.teamId, opts.teamId)),
      );

    data.push({
      matchId: m.id,
      round: m.round,
      year: m.year,
      opponent: teamMap.get(opponentId)?.name ?? opponentId,
      opponentShortName: teamMap.get(opponentId)?.shortName ?? opponentId,
      isHome,
      teamScore: isHome ? m.homeScore : m.awayScore,
      opponentScore: isHome ? m.awayScore : m.homeScore,
      kicks: agg?.kicks ?? 0,
      handballs: agg?.handballs ?? 0,
      disposals: agg?.disposals ?? 0,
      marks: agg?.marks ?? 0,
      goals: agg?.goals ?? 0,
      behinds: agg?.behinds ?? 0,
      tackles: agg?.tackles ?? 0,
      hitouts: agg?.hitouts ?? 0,
      goalAssists: agg?.goalAssists ?? 0,
      inside50s: agg?.inside50s ?? 0,
      clearances: agg?.clearances ?? 0,
      clangers: agg?.clangers ?? 0,
      rebound50s: agg?.rebound50s ?? 0,
      freesFor: agg?.freesFor ?? 0,
      freesAgainst: agg?.freesAgainst ?? 0,
      aflFantasyPts: agg?.aflFantasyPts ?? 0,
      supercoachPts: agg?.supercoachPts ?? 0,
    });
  }

  return { data, total };
}

// ─── Head-to-Head ─────────────────────────────────────────────────────────────

export async function getHeadToHead(opts: {
  teamA: string;
  teamB: string;
  year?: number;
  venue?: string;
  limit: number;
  offset: number;
}): Promise<{ data: MatchRow[]; total: number }> {
  const h2hCondition = or(
    and(eq(matches.homeTeamId, opts.teamA), eq(matches.awayTeamId, opts.teamB)),
    and(eq(matches.homeTeamId, opts.teamB), eq(matches.awayTeamId, opts.teamA)),
  );

  const conditions = [
    h2hCondition,
    opts.year !== undefined ? eq(matches.year, opts.year) : undefined,
    opts.venue !== undefined ? eq(matches.venue, opts.venue) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = and(...conditions);

  const [totalRow] = await db
    .select({ total: count() })
    .from(matches)
    .where(where);
  const total = totalRow?.total ?? 0;

  const rows = await db
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
      startDatetime: matches.startDatetime,
      crowd: matches.crowd,
      sourcedAt: matches.sourcedAt,
    })
    .from(matches)
    .where(where)
    .orderBy(desc(matches.year), desc(matches.round))
    .limit(opts.limit)
    .offset(opts.offset);

  const allTeams = await db.select().from(teams);
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
    startDatetime: r.startDatetime,
    crowd: r.crowd,
    sourcedAt: r.sourcedAt,
  }));

  return { data, total };
}

// ─── Venues ───────────────────────────────────────────────────────────────────

export interface VenueRow {
  venue: string;
  matchCount: number;
}

export async function getAllVenues(): Promise<VenueRow[]> {
  return db
    .select({
      venue: matches.venue,
      matchCount: count(),
    })
    .from(matches)
    .groupBy(matches.venue)
    .orderBy(desc(count()));
}

// ─── Standings ────────────────────────────────────────────────────────────────

export interface StandingRow {
  teamId: string;
  teamName: string;
  teamShortName: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  percentage: number;
  premiershipsPoints: number;
}

export async function getStandings(year: number): Promise<StandingRow[]> {
  const yearMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.year, year));

  const allTeams = await db.select().from(teams);
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  const standings = new Map<
    string,
    {
      played: number;
      wins: number;
      losses: number;
      draws: number;
      pointsFor: number;
      pointsAgainst: number;
    }
  >();

  for (const m of yearMatches) {
    if (m.homeScore === null || m.awayScore === null) continue;

    for (const side of ["home", "away"] as const) {
      const teamId = side === "home" ? m.homeTeamId : m.awayTeamId;
      const pf = side === "home" ? m.homeScore : m.awayScore;
      const pa = side === "home" ? m.awayScore : m.homeScore;

      const s = standings.get(teamId) ?? {
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      };
      s.played++;
      s.pointsFor += pf;
      s.pointsAgainst += pa;
      if (pf > pa) s.wins++;
      else if (pf < pa) s.losses++;
      else s.draws++;
      standings.set(teamId, s);
    }
  }

  const rows: StandingRow[] = [];
  for (const [teamId, s] of standings) {
    const team = teamMap.get(teamId);
    rows.push({
      teamId,
      teamName: team?.name ?? teamId,
      teamShortName: team?.shortName ?? teamId,
      played: s.played,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      pointsFor: s.pointsFor,
      pointsAgainst: s.pointsAgainst,
      percentage:
        s.pointsAgainst > 0
          ? Math.round((s.pointsFor / s.pointsAgainst) * 10000) / 100
          : 0,
      premiershipsPoints: s.wins * 4 + s.draws * 2,
    });
  }

  rows.sort(
    (a, b) =>
      b.premiershipsPoints - a.premiershipsPoints ||
      b.percentage - a.percentage,
  );
  return rows;
}

// ─── Predictions ──────────────────────────────────────────────────────────────

export interface PredictionRow {
  id: number;
  fixtureId: number;
  year: number;
  round: number;
  homeTeamId: string;
  homeTeam: string;
  homeShortName: string;
  awayTeamId: string;
  awayTeam: string;
  awayShortName: string;
  venue: string | null;
  date: string | null;
  homeProbability: number;
  awayProbability: number;
  /** Home-positive points; null on v1 rows. */
  predictedMargin: number | null;
  squiggleConsensus: number | null;
  // jsonb payloads are typed for the current model; rows with modelVersion
  // "v1" carry the legacy factor-score shape instead.
  homeBreakdown: PredictionTeamBreakdown;
  awayBreakdown: PredictionTeamBreakdown;
  factors: PredictionFactors;
  modelVersion: string;
  actualWinner: string | null;
  /** Home-positive points; null until settled with scores. */
  actualMargin: number | null;
  computedAt: string;
  settledAt: string | null;
}

function shapePredictionRow(
  r: {
    id: number;
    fixtureId: number;
    year: number;
    round: number;
    homeTeamId: string;
    awayTeamId: string;
    homeProbability: number;
    awayProbability: number;
    predictedMargin: number | null;
    squiggleConsensus: number | null;
    homeBreakdown: unknown;
    awayBreakdown: unknown;
    factors: unknown;
    modelVersion: string;
    actualWinner: string | null;
    actualMargin: number | null;
    computedAt: string;
    settledAt: string | null;
    venue: string | null;
    date: string | null;
  },
  teamMap: Map<string, Team>,
): PredictionRow {
  return {
    id: r.id,
    fixtureId: r.fixtureId,
    year: r.year,
    round: r.round,
    homeTeamId: r.homeTeamId,
    homeTeam: teamMap.get(r.homeTeamId)?.name ?? r.homeTeamId,
    homeShortName: teamMap.get(r.homeTeamId)?.shortName ?? r.homeTeamId,
    awayTeamId: r.awayTeamId,
    awayTeam: teamMap.get(r.awayTeamId)?.name ?? r.awayTeamId,
    awayShortName: teamMap.get(r.awayTeamId)?.shortName ?? r.awayTeamId,
    venue: r.venue,
    date: r.date,
    homeProbability: r.homeProbability / 10,
    awayProbability: r.awayProbability / 10,
    predictedMargin: r.predictedMargin,
    squiggleConsensus: r.squiggleConsensus,
    homeBreakdown: r.homeBreakdown as PredictionTeamBreakdown,
    awayBreakdown: r.awayBreakdown as PredictionTeamBreakdown,
    factors: r.factors as PredictionFactors,
    modelVersion: r.modelVersion,
    actualWinner: r.actualWinner,
    actualMargin: r.actualMargin,
    computedAt: r.computedAt,
    settledAt: r.settledAt,
  };
}

export async function upsertPredictions(
  predicted: PredictionGame[],
  year: number,
  round: number,
  modelVersion: string,
): Promise<void> {
  if (predicted.length === 0) return;
  const now = new Date().toISOString();

  const values = predicted.map((p) => ({
    fixtureId: p.fixtureId,
    year,
    round,
    homeTeamId: p.homeTeamId,
    awayTeamId: p.awayTeamId,
    homeProbability: Math.round(p.homeProbability * 10),
    awayProbability: Math.round(p.awayProbability * 10),
    predictedMargin: p.predictedMargin,
    squiggleConsensus: p.squiggleConsensus,
    homeBreakdown: p.homeBreakdown,
    awayBreakdown: p.awayBreakdown,
    factors: p.factors,
    modelVersion,
    computedAt: now,
  }));

  await db
    .insert(predictions)
    .values(values)
    .onConflictDoUpdate({
      target: [predictions.fixtureId, predictions.modelVersion],
      set: {
        homeProbability: sql`excluded.home_probability`,
        awayProbability: sql`excluded.away_probability`,
        predictedMargin: sql`excluded.predicted_margin`,
        squiggleConsensus: sql`excluded.squiggle_consensus`,
        homeBreakdown: sql`excluded.home_breakdown`,
        awayBreakdown: sql`excluded.away_breakdown`,
        factors: sql`excluded.factors`,
        homeTeamId: sql`excluded.home_team_id`,
        awayTeamId: sql`excluded.away_team_id`,
        year: sql`excluded.year`,
        round: sql`excluded.round`,
        computedAt: sql`excluded.computed_at`,
      },
    });
}

const PREDICTION_SELECT = {
  id: predictions.id,
  fixtureId: predictions.fixtureId,
  year: predictions.year,
  round: predictions.round,
  homeTeamId: predictions.homeTeamId,
  awayTeamId: predictions.awayTeamId,
  homeProbability: predictions.homeProbability,
  awayProbability: predictions.awayProbability,
  predictedMargin: predictions.predictedMargin,
  squiggleConsensus: predictions.squiggleConsensus,
  homeBreakdown: predictions.homeBreakdown,
  awayBreakdown: predictions.awayBreakdown,
  factors: predictions.factors,
  modelVersion: predictions.modelVersion,
  actualWinner: predictions.actualWinner,
  actualMargin: predictions.actualMargin,
  computedAt: predictions.computedAt,
  settledAt: predictions.settledAt,
  venue: fixtures.venue,
  date: fixtures.date,
} as const;

export async function getPredictionsPaginated(opts: {
  year?: number;
  round?: number;
  fixtureId?: number;
  teamId?: string;
  modelVersion?: string;
  settled?: boolean;
  limit: number;
  offset: number;
}): Promise<{ data: PredictionRow[]; total: number }> {
  const conditions = [
    opts.year !== undefined ? eq(predictions.year, opts.year) : undefined,
    opts.round !== undefined ? eq(predictions.round, opts.round) : undefined,
    opts.fixtureId !== undefined
      ? eq(predictions.fixtureId, opts.fixtureId)
      : undefined,
    opts.teamId !== undefined
      ? or(
          eq(predictions.homeTeamId, opts.teamId),
          eq(predictions.awayTeamId, opts.teamId),
        )
      : undefined,
    opts.modelVersion !== undefined
      ? eq(predictions.modelVersion, opts.modelVersion)
      : undefined,
    opts.settled === true
      ? isNotNull(predictions.actualWinner)
      : opts.settled === false
        ? isNull(predictions.actualWinner)
        : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(predictions)
    .where(where);
  const total = totalRow?.total ?? 0;

  const rows = await db
    .select(PREDICTION_SELECT)
    .from(predictions)
    .leftJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
    .where(where)
    // Newest season/round first, but chronological by first bounce within a
    // round. `fixtures.date` is text ("YYYY-MM-DD HH:MM:SS") so it sorts
    // lexicographically; TBC fixtures are null and land last (Postgres
    // defaults to NULLS LAST on ASC).
    .orderBy(
      desc(predictions.year),
      desc(predictions.round),
      asc(fixtures.date),
      asc(predictions.fixtureId),
    )
    .limit(opts.limit)
    .offset(opts.offset);

  const allTeams = await db.select().from(teams);
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  return { data: rows.map((r) => shapePredictionRow(r, teamMap)), total };
}

export async function getPredictionById(
  id: number,
): Promise<PredictionRow | null> {
  const rows = await db
    .select(PREDICTION_SELECT)
    .from(predictions)
    .leftJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
    .where(eq(predictions.id, id));
  if (rows.length === 0) return null;

  const allTeams = await db.select().from(teams);
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));
  return shapePredictionRow(rows[0], teamMap);
}

export async function getPredictionsForRound(
  year: number,
  round: number,
  modelVersion: string,
): Promise<PredictionRow[]> {
  const rows = await db
    .select(PREDICTION_SELECT)
    .from(predictions)
    .leftJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
    .where(
      and(
        eq(predictions.year, year),
        eq(predictions.round, round),
        eq(predictions.modelVersion, modelVersion),
      ),
    )
    // Chronological by first bounce. `fixtures.date` is text
    // ("YYYY-MM-DD HH:MM:SS") so it sorts lexicographically; TBC fixtures have
    // a null date and land last under Postgres' default NULLS LAST.
    .orderBy(asc(fixtures.date), asc(predictions.fixtureId));

  const allTeams = await db.select().from(teams);
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));
  return rows.map((r) => shapePredictionRow(r, teamMap));
}

/**
 * Lean per-game rows for season-level model grading (page scoreboard):
 * probabilities, margins, outcomes, and the tipster-consensus benchmark.
 */
export interface SeasonPredictionRow {
  round: number;
  homeProbability: number;
  predictedMargin: number | null;
  squiggleConsensus: number | null;
  actualWinner: string | null;
  actualMargin: number | null;
}

export async function getSeasonPredictionRows(
  year: number,
  modelVersion: string,
): Promise<SeasonPredictionRow[]> {
  const rows = await db
    .select({
      round: predictions.round,
      homeProbability: predictions.homeProbability,
      predictedMargin: predictions.predictedMargin,
      squiggleConsensus: predictions.squiggleConsensus,
      actualWinner: predictions.actualWinner,
      actualMargin: predictions.actualMargin,
    })
    .from(predictions)
    .where(
      and(eq(predictions.year, year), eq(predictions.modelVersion, modelVersion)),
    )
    .orderBy(asc(predictions.round), asc(predictions.fixtureId));
  return rows.map((r) => ({ ...r, homeProbability: r.homeProbability / 10 }));
}

/**
 * Populate `actualWinner` / `settledAt` for any prediction whose fixture has
 * completed. Idempotent — only updates rows where actualWinner is still null.
 */
export async function updatePredictionOutcomes(year: number): Promise<number> {
  const completed = await db
    .select({
      id: fixtures.id,
      hscore: fixtures.hscore,
      ascore: fixtures.ascore,
      complete: fixtures.complete,
      winner: fixtures.winner,
      hteam: fixtures.hteam,
    })
    .from(fixtures)
    .where(and(eq(fixtures.year, year), eq(fixtures.complete, 100)));

  if (completed.length === 0) return 0;

  const now = new Date().toISOString();
  let updated = 0;

  for (const f of completed) {
    let outcome: "home" | "away" | "draw" | null = null;
    if (f.hscore != null && f.ascore != null) {
      if (f.hscore > f.ascore) outcome = "home";
      else if (f.ascore > f.hscore) outcome = "away";
      else outcome = "draw";
    } else if (f.winner && f.hteam) {
      outcome = f.winner === f.hteam ? "home" : "away";
    }
    if (!outcome) continue;

    const actualMargin =
      f.hscore != null && f.ascore != null ? f.hscore - f.ascore : null;
    // When scores are known, also repair older settled rows missing a margin.
    const settleWhere =
      actualMargin != null
        ? or(isNull(predictions.actualWinner), isNull(predictions.actualMargin))
        : isNull(predictions.actualWinner);

    const result = await db
      .update(predictions)
      .set({ actualWinner: outcome, actualMargin, settledAt: now })
      .where(and(eq(predictions.fixtureId, f.id), settleWhere))
      .returning({ id: predictions.id });
    updated += result.length;
  }

  return updated;
}

// ─── Data stats (public landing / in-app overview) ──────────────────────────────

export interface DataStats {
  totalMatches: number;
  totalPlayers: number;
  totalStatRecords: number;
  seasonsCount: number;
  venuesCount: number;
}

// These counts only change when a scrape runs, so a short in-memory cache keeps
// the public landing page fast for anonymous traffic without going stale in any
// way that matters. Self-heals on expiry — no invalidation hook needed.
const DATA_STATS_TTL_MS = 60 * 60 * 1000; // 1 hour
let dataStatsCache: { value: DataStats; expires: number } | null = null;

export async function getDataStats(): Promise<DataStats> {
  if (dataStatsCache && dataStatsCache.expires > Date.now()) {
    return dataStatsCache.value;
  }

  const [[{ c: totalMatches }], [{ c: totalPlayers }], [{ c: totalStatRecords }]] =
    await Promise.all([
      db.select({ c: count() }).from(matches),
      db.select({ c: count() }).from(players),
      db.select({ c: count() }).from(playerStats),
    ]);

  const [{ c: seasonsCount }] = await db
    .select({ c: sql<number>`count(distinct ${matches.year})` })
    .from(matches);
  const [{ c: venuesCount }] = await db
    .select({ c: sql<number>`count(distinct ${matches.venue})` })
    .from(matches);

  const value: DataStats = {
    totalMatches,
    totalPlayers,
    totalStatRecords,
    seasonsCount: Number(seasonsCount),
    venuesCount: Number(venuesCount),
  };

  dataStatsCache = { value, expires: Date.now() + DATA_STATS_TTL_MS };
  return value;
}

// ─── Legs (player stat predictions) ─────────────────────────────────────────────
//
// Batched queries feeding the pure prediction engine (src/lib/afl/legs-engine.ts).
// Every player-history read uses a window function to cap rows per player, so a
// whole day's fixtures cost a handful of round trips rather than one per player.

/** Row shape returned by the sampled-game window queries (pre team-name mapping). */
interface RawSampledGame {
  playerId: number;
  matchId: number;
  year: number;
  round: number;
  opponentTeamId: string | null;
  isHome: boolean | null;
  date: string | null;
  tackles: number;
  marks: number;
  goals: number;
  disposals: number;
  kicks: number;
  handballs: number;
  clearances: number;
  fantasyPoints: number;
}

// The eight projected stats + game context, selected from player_stats joined to
// matches. opponentShortName is filled in afterwards from the teams table.
const SAMPLED_GAME_COLUMNS = sql`
  ps.player_id AS "playerId",
  ps.match_id  AS "matchId",
  m.year       AS "year",
  m.round      AS "round",
  CASE WHEN ps.team_id = m.home_team_id THEN m.away_team_id
       WHEN ps.team_id = m.away_team_id THEN m.home_team_id
       ELSE NULL END AS "opponentTeamId",
  (ps.team_id = m.home_team_id) AS "isHome",
  m.date       AS "date",
  ps.tackles   AS "tackles",
  ps.marks     AS "marks",
  ps.goals     AS "goals",
  ps.disposals AS "disposals",
  ps.kicks     AS "kicks",
  ps.handballs AS "handballs",
  ps.clearances AS "clearances",
  ps.afl_fantasy_pts AS "fantasyPoints"
`;

function toSampledGame(
  r: RawSampledGame,
  teamMap: Map<string, Team>,
): SampledGame {
  return {
    matchId: r.matchId,
    year: r.year,
    round: r.round,
    opponentTeamId: r.opponentTeamId,
    opponentShortName: r.opponentTeamId
      ? (teamMap.get(r.opponentTeamId)?.shortName ?? r.opponentTeamId)
      : null,
    isHome: r.isHome,
    date: r.date,
    tackles: r.tackles,
    marks: r.marks,
    goals: r.goals,
    disposals: r.disposals,
    kicks: r.kicks,
    handballs: r.handballs,
    clearances: r.clearances,
    fantasyPoints: r.fantasyPoints,
  };
}

function groupSampledGames(
  rows: RawSampledGame[],
  teamMap: Map<string, Team>,
): Map<number, SampledGame[]> {
  const grouped = new Map<number, SampledGame[]>();
  for (const r of rows) {
    let list = grouped.get(r.playerId);
    if (!list) {
      list = [];
      grouped.set(r.playerId, list);
    }
    list.push(toSampledGame(r, teamMap));
  }
  return grouped;
}

/**
 * The most recent `limit` completed games for each player, newest first
 * (ordered by year then round, ignoring season boundaries). Serves both the
 * recent-form blend (first 4) and the showcase baseline (all 10). One query for
 * the whole set via a per-player ROW_NUMBER window.
 */
export async function getRecentGamesForPlayers(
  playerIds: number[],
  limit: number,
): Promise<Map<number, SampledGame[]>> {
  if (playerIds.length === 0) return new Map();
  const idList = sql.join(
    playerIds.map((id) => sql`${id}`),
    sql`, `,
  );
  const rows = (await db.execute(sql`
    SELECT * FROM (
      SELECT ${SAMPLED_GAME_COLUMNS},
        ROW_NUMBER() OVER (
          PARTITION BY ps.player_id ORDER BY m.year DESC, m.round DESC
        ) AS rn
      FROM player_stats ps
      JOIN matches m ON ps.match_id = m.id
      WHERE ps.player_id IN (${idList})
        AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
    ) t
    WHERE t.rn <= ${limit}
    ORDER BY t."playerId", t.rn
  `)) as unknown as RawSampledGame[];

  const allTeams = await getAllTeams();
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));
  return groupSampledGames(rows, teamMap);
}

/**
 * The most recent `limit` completed games each player has played against one
 * specific opponent, newest first. Called once per fixture side (all of a
 * team's players share the same upcoming opponent).
 */
export async function getHeadToHeadGamesForPlayers(
  playerIds: number[],
  opponentTeamId: string,
  limit: number,
): Promise<Map<number, SampledGame[]>> {
  if (playerIds.length === 0) return new Map();
  const idList = sql.join(
    playerIds.map((id) => sql`${id}`),
    sql`, `,
  );
  const rows = (await db.execute(sql`
    SELECT * FROM (
      SELECT ${SAMPLED_GAME_COLUMNS},
        ROW_NUMBER() OVER (
          PARTITION BY ps.player_id ORDER BY m.year DESC, m.round DESC
        ) AS rn
      FROM player_stats ps
      JOIN matches m ON ps.match_id = m.id
      WHERE ps.player_id IN (${idList})
        AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
        AND (
          (ps.team_id = m.home_team_id AND m.away_team_id = ${opponentTeamId})
          OR (ps.team_id = m.away_team_id AND m.home_team_id = ${opponentTeamId})
        )
    ) t
    WHERE t.rn <= ${limit}
    ORDER BY t."playerId", t.rn
  `)) as unknown as RawSampledGame[];

  const allTeams = await getAllTeams();
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));
  return groupSampledGames(rows, teamMap);
}

/** Career game counts for a set of players (used to gate the showcase). */
export async function getCareerGameCounts(
  playerIds: number[],
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (playerIds.length === 0) return result;
  const rows = await db
    .select({ playerId: playerStats.playerId, games: count() })
    .from(playerStats)
    .where(inArray(playerStats.playerId, playerIds))
    .groupBy(playerStats.playerId);
  for (const r of rows) result.set(r.playerId, r.games);
  return result;
}

export interface LineupPlayer {
  playerId: number;
  playerName: string;
}

/**
 * The likely lineup for each team: the players who appeared in that team's most
 * recent completed match (the best available proxy — the schema has no
 * announced-lineup data). Batched across teams via a per-team ROW_NUMBER window.
 */
export async function getLatestLineupForTeams(
  teamIds: string[],
): Promise<Map<string, LineupPlayer[]>> {
  const result = new Map<string, LineupPlayer[]>();
  if (teamIds.length === 0) return result;
  const values = sql.join(
    teamIds.map((id) => sql`(${id})`),
    sql`, `,
  );
  const rows = (await db.execute(sql`
    WITH latest AS (
      SELECT team_id, match_id FROM (
        SELECT tm.id AS team_id, m.id AS match_id,
          ROW_NUMBER() OVER (
            PARTITION BY tm.id ORDER BY m.year DESC, m.round DESC
          ) AS rn
        FROM (VALUES ${values}) AS tm(id)
        JOIN matches m ON (m.home_team_id = tm.id OR m.away_team_id = tm.id)
        WHERE m.home_score IS NOT NULL AND m.away_score IS NOT NULL
      ) x WHERE x.rn = 1
    )
    SELECT l.team_id AS "teamId",
           ps.player_id AS "playerId",
           p.name AS "playerName"
    FROM latest l
    JOIN player_stats ps ON ps.match_id = l.match_id AND ps.team_id = l.team_id
    JOIN players p ON p.id = ps.player_id
    ORDER BY l.team_id, ps.disposals DESC
  `)) as unknown as {
    teamId: string;
    playerId: number;
    playerName: string;
  }[];

  for (const r of rows) {
    let list = result.get(r.teamId);
    if (!list) {
      list = [];
      result.set(r.teamId, list);
    }
    list.push({ playerId: r.playerId, playerName: r.playerName });
  }
  return result;
}

/** Raw stored home-win probabilities (per-mille) for a set of fixtures, by model version. */
export async function getModelHomeProbabilities(
  fixtureIds: number[],
  modelVersion: string,
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (fixtureIds.length === 0) return result;
  const rows = await db
    .select({
      fixtureId: predictions.fixtureId,
      homeProbability: predictions.homeProbability,
    })
    .from(predictions)
    .where(
      and(
        inArray(predictions.fixtureId, fixtureIds),
        eq(predictions.modelVersion, modelVersion),
      ),
    );
  for (const r of rows) result.set(r.fixtureId, r.homeProbability);
  return result;
}

export interface LegsSearchIndex {
  players: { id: number; name: string; teamId: string }[];
  teams: { id: string; name: string; shortName: string }[];
}

/**
 * Lightweight client-side autocomplete index: every team, plus players who have
 * played in the last two seasons (the practically searchable set — anyone with
 * a plausible upcoming fixture).
 */
export async function getLegsSearchIndex(
  currentYear: number,
): Promise<LegsSearchIndex> {
  const [playerRows, teamRows] = await Promise.all([
    db
      .selectDistinct({
        id: players.id,
        name: players.name,
        teamId: players.currentTeamId,
      })
      .from(players)
      .innerJoin(playerStats, eq(playerStats.playerId, players.id))
      .innerJoin(matches, eq(playerStats.matchId, matches.id))
      .where(gte(matches.year, currentYear - 1))
      .orderBy(asc(players.name)),
    db
      .select({
        id: teams.id,
        name: teams.name,
        shortName: teams.shortName,
      })
      .from(teams)
      .orderBy(asc(teams.name)),
  ]);
  return { players: playerRows, teams: teamRows };
}
