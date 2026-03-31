import { randomBytes } from "node:crypto";
import type { ScrapedMatch, ScrapedPlayerStat, ScrapedPlayerAdvancedStat } from "$lib/afl/scraper";
import { scrapeMatchStats, scrapeMatchAdvancedStats } from "$lib/afl/scraper";
import type { SquiggleGame, SquiggleTip } from "$lib/afl/squiggle";
import { db } from "$lib/db/afl";
import { apiKeys, fixtures, kaliUsers, matches, players, playerStats, playerStatsAdvanced, playerTeamAssignments, teams, tips } from "$lib/db/afl/schema";
import type { ApiKey, KaliUser, Player, Team } from "$lib/db/afl/schema";
import { and, asc, count, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";

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
  await db.insert(matches)
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

export async function scrapeAndPersistMatch(mid: number, startDatetime?: string | null) {
  const [data, advData] = await Promise.all([
    scrapeMatchStats(mid),
    scrapeMatchAdvancedStats(mid),
  ]);
  if (startDatetime != null) {
    data.match.startDatetime = startDatetime;
  }
  await upsertMatch(data.match);
  await batchUpsertPlayerStats(data.homeStats, mid, data.match.year);
  await batchUpsertPlayerStats(data.awayStats, mid, data.match.year);
  await batchUpsertPlayerAdvancedStats(advData.homeAdvStats, mid, data.match.year);
  await batchUpsertPlayerAdvancedStats(advData.awayAdvStats, mid, data.match.year);
  return {
    match: data.match,
    homeStatsCount: data.homeStats.length,
    awayStatsCount: data.awayStats.length,
  };
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
      await db.update(playerTeamAssignments)
        .set({ endYear: year - 1 })
        .where(and(
          eq(playerTeamAssignments.playerId, existing.id),
          isNull(playerTeamAssignments.endYear),
        ));
      await db.insert(playerTeamAssignments)
        .values({ playerId: existing.id, teamId, startYear: year })
        .onConflictDoNothing();
    }
    // Keep name and currentTeamId fresh without changing the row's identity.
    await db.update(players)
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
    await db.insert(playerTeamAssignments)
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
      const playerId = await getOrCreatePlayer(stat.playerName, stat.teamId, stat.onlineId, year);
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

  await db.insert(playerStats)
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
      const playerId = await getOrCreatePlayer(stat.playerName, stat.teamId, stat.onlineId, year);
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

  await db.insert(playerStatsAdvanced)
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
  order?: 'asc' | 'desc';
  limit: number;
  offset: number;
}): Promise<{ data: PlayerAdvancedStatRow[]; total: number }> {
  const conditions = [
    opts.matchId !== undefined ? eq(playerStatsAdvanced.matchId, opts.matchId) : undefined,
    opts.playerId !== undefined ? eq(playerStatsAdvanced.playerId, opts.playerId) : undefined,
    opts.year !== undefined ? eq(matches.year, opts.year) : undefined,
    opts.round !== undefined ? eq(matches.round, opts.round) : undefined,
    opts.teamId !== undefined ? eq(playerStatsAdvanced.teamId, opts.teamId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(playerStatsAdvanced)
    .innerJoin(players, eq(playerStatsAdvanced.playerId, players.id))
    .innerJoin(matches, eq(playerStatsAdvanced.matchId, matches.id))
    .where(where);
  const total = totalRow?.total ?? 0;

  const sortColumn = PLAYER_ADVANCED_STAT_SORT_COLUMNS[opts.sortBy ?? 'contested_possessions'] ?? playerStatsAdvanced.contestedPossessions;
  const sortDir = opts.order === 'asc' ? asc : desc;

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

export async function getAdvancedPlayerStatsForMatch(matchId: number): Promise<PlayerAdvancedStatRow[]> {
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
    .orderBy(asc(matches.startDatetime));

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

export async function getPlayerStatsForMatch(matchId: number): Promise<PlayerStatRow[]> {
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
    .orderBy(playerStatsAdvanced.matchId, desc(playerStatsAdvanced.contestedPossessions));

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
    hconfidence: t.hconfidence,
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

export async function getAllAdvancedPlayerStatsForYear(year: number): Promise<PlayerAdvancedStatYearRow[]> {
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

export async function getAllPlayerStatsForYear(year: number): Promise<PlayerStatYearRow[]> {
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
    opts.teamId !== undefined ? or(eq(matches.homeTeamId, opts.teamId), eq(matches.awayTeamId, opts.teamId)) : undefined,
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
    opts.teamId !== undefined ? eq(players.currentTeamId, opts.teamId) : undefined,
    opts.name !== undefined ? ilike(players.name, `%${opts.name}%`) : undefined,
    opts.year !== undefined ? sql`${players.id} IN (SELECT DISTINCT ps.player_id FROM player_stats ps INNER JOIN matches m ON ps.match_id = m.id WHERE m.year = ${opts.year})` : undefined,
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
  order?: 'asc' | 'desc';
  limit: number;
  offset: number;
}): Promise<{ data: PlayerStatRow[]; total: number }> {
  const conditions = [
    opts.matchId !== undefined ? eq(playerStats.matchId, opts.matchId) : undefined,
    opts.playerId !== undefined ? eq(playerStats.playerId, opts.playerId) : undefined,
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

  const sortColumn = PLAYER_STAT_SORT_COLUMNS[opts.sortBy ?? 'disposals'] ?? playerStats.disposals;
  const sortDir = opts.order === 'asc' ? asc : desc;

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

export async function getUserPreferences(email: string): Promise<UserPreferences | null> {
  const [row] = await db
    .select({ prefTheme: kaliUsers.prefTheme, prefFont: kaliUsers.prefFont, prefDarkMode: kaliUsers.prefDarkMode })
    .from(kaliUsers)
    .where(eq(kaliUsers.email, email));
  return row ?? null;
}

export async function upsertUserPreferences(email: string, prefs: Partial<UserPreferences>): Promise<void> {
  await db.update(kaliUsers).set(prefs).where(eq(kaliUsers.email, email));
}

// ─── Kali Users ───────────────────────────────────────────────────────────────

export async function getOrCreateUser(opts: {
  email: string;
  name: string;
  provider: string;
}): Promise<KaliUser> {
  const now = new Date().toISOString();
  await db.insert(kaliUsers)
    .values({ email: opts.email, name: opts.name, provider: opts.provider, createdAt: now, lastActiveAt: now })
    .onConflictDoUpdate({
      target: kaliUsers.email,
      set: { name: opts.name, provider: opts.provider, lastActiveAt: now },
    });
  const [user] = await db.select().from(kaliUsers).where(eq(kaliUsers.email, opts.email));
  return user!;
}

export async function listUsers(): Promise<KaliUser[]> {
  return db.select().from(kaliUsers).orderBy(desc(kaliUsers.createdAt));
}

export async function getUserByEmail(email: string): Promise<KaliUser | null> {
  const [user] = await db.select().from(kaliUsers).where(eq(kaliUsers.email, email));
  return user ?? null;
}

export async function setApiLimit(keyId: number, limit: number | null): Promise<void> {
  await db.update(apiKeys).set({ limit }).where(eq(apiKeys.id, keyId));
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export async function createApiKey(userId: number, name: string): Promise<string> {
  const key = randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  await db.insert(apiKeys).values({ userId, key, name, createdAt: now });
  return key;
}

export async function listApiKeysForUser(userId: number): Promise<ApiKey[]> {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function listAllApiKeys(): Promise<(ApiKey & { userName: string; userEmail: string })[]> {
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
    .orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(id: number): Promise<void> {
  await db.update(apiKeys).set({ revoked: true }).where(eq(apiKeys.id, id));
}

export async function validateApiKey(key: string): Promise<{ valid: boolean; rateLimited?: boolean }> {
  const [row] = await db
    .select({
      keyId: apiKeys.id,
      revoked: apiKeys.revoked,
      userId: apiKeys.userId,
      usage: apiKeys.usage,
      limit: apiKeys.limit,
    })
    .from(apiKeys)
    .where(eq(apiKeys.key, key));

  if (!row || row.revoked) return { valid: false };

  if (row.limit !== null && row.usage >= row.limit) {
    return { valid: false, rateLimited: true };
  }

  const now = new Date().toISOString();
  await db.update(apiKeys)
    .set({ lastUsedAt: now, usage: row.usage + 1 })
    .where(eq(apiKeys.id, row.keyId));
  await db.update(kaliUsers)
    .set({ lastActiveAt: now })
    .where(eq(kaliUsers.id, row.userId));

  return { valid: true };
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

export const VALID_PLAYER_STAT_SORT_KEYS = Object.keys(PLAYER_STAT_SORT_COLUMNS);

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

export const VALID_PLAYER_ADVANCED_STAT_SORT_KEYS = Object.keys(PLAYER_ADVANCED_STAT_SORT_COLUMNS);

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
    opts.playerId !== undefined ? eq(playerTeamAssignments.playerId, opts.playerId) : undefined,
    opts.teamId !== undefined ? eq(playerTeamAssignments.teamId, opts.teamId) : undefined,
    opts.reason !== undefined ? eq(playerTeamAssignments.reason, opts.reason) : undefined,
    opts.year !== undefined ? and(
      lte(playerTeamAssignments.startYear, opts.year),
      or(isNull(playerTeamAssignments.endYear), gte(playerTeamAssignments.endYear, opts.year)),
    ) : undefined,
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

async function aggregatePlayerStats(playerId: number, year?: number): Promise<AggregatedPlayerStats | null> {
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
  const avg = (val: number) => gp > 0 ? Math.round((val / gp) * 100) / 100 : 0;

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

export async function getPlayerCareerStats(playerId: number): Promise<AggregatedPlayerStats | null> {
  return aggregatePlayerStats(playerId);
}

export async function getPlayerSeasonStats(playerId: number, year: number): Promise<AggregatedPlayerStats | null> {
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
    or(eq(matches.homeTeamId, opts.teamId), eq(matches.awayTeamId, opts.teamId)),
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
      .where(and(eq(playerStats.matchId, m.id), eq(playerStats.teamId, opts.teamId)));

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

  const standings = new Map<string, {
    played: number; wins: number; losses: number; draws: number;
    pointsFor: number; pointsAgainst: number;
  }>();

  for (const m of yearMatches) {
    if (m.homeScore === null || m.awayScore === null) continue;

    for (const side of ['home', 'away'] as const) {
      const teamId = side === 'home' ? m.homeTeamId : m.awayTeamId;
      const pf = side === 'home' ? m.homeScore : m.awayScore;
      const pa = side === 'home' ? m.awayScore : m.homeScore;

      const s = standings.get(teamId) ?? { played: 0, wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0 };
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
      percentage: s.pointsAgainst > 0 ? Math.round((s.pointsFor / s.pointsAgainst) * 10000) / 100 : 0,
      premiershipsPoints: s.wins * 4 + s.draws * 2,
    });
  }

  rows.sort((a, b) => b.premiershipsPoints - a.premiershipsPoints || b.percentage - a.percentage);
  return rows;
}
