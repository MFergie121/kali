import { db } from "$lib/db/afl";
import { matches, players, playerStats, teams } from "$lib/db/afl/schema";
import {
  getAllAdvancedPlayerStatsForYear,
  getAllPlayerStatsForYear,
} from "$lib/db/afl/service";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

const FIRST_YEAR = 2000;

export interface PlayerGameRow {
  round: number;
  matchId: number;
  date: string;
  opponentName: string;
  opponentShort: string;
  isHome: boolean;
  teamScore: number | null;
  oppScore: number | null;
  result: "W" | "L" | "D" | null;
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

export const load: PageServerLoad = async ({ url }) => {
  const currentYear = new Date().getFullYear();
  const allYears = Array.from(
    { length: currentYear - FIRST_YEAR + 1 },
    (_, i) => FIRST_YEAR + i,
  );

  const selectedYear = Math.min(
    Math.max(
      parseInt(url.searchParams.get("year") ?? "") || currentYear,
      FIRST_YEAR,
    ),
    currentYear,
  );

  const [rows, advRows] = await Promise.all([
    getAllPlayerStatsForYear(selectedYear),
    getAllAdvancedPlayerStatsForYear(selectedYear),
  ]);

  if (rows.length === 0) {
    return {
      rows,
      advRows,
      allYears,
      selectedYear,
      leaderboards: [],
      streaks: [],
      allPlayers: [],
      playerGames: {},
      yearTeams: [],
    };
  }

  // Query player stats with full match context for the games tab
  const statsWithContext = await db
    .select({
      playerId: playerStats.playerId,
      playerName: players.name,
      playerTeamId: players.currentTeamId,
      matchId: playerStats.matchId,
      round: matches.round,
      date: matches.date,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
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
    .where(eq(matches.year, selectedYear));

  const allTeamsData = await db.select().from(teams).orderBy(teams.name);
  const teamMap = new Map(allTeamsData.map((t) => [t.id, t]));

  // Teams that have players with stats this year
  const teamsWithStats = new Set(rows.map(r => r.teamId).filter(Boolean));
  const yearTeams = allTeamsData.filter(t => teamsWithStats.has(t.id));

  // Build playerGames
  const playerGamesMap = new Map<number, PlayerGameRow[]>();
  const playerNameById = new Map<number, string>();
  const playerTeamById = new Map<number, string>();

  for (const r of statsWithContext) {
    playerNameById.set(r.playerId, r.playerName);
    playerTeamById.set(r.playerId, r.playerTeamId);

    const isHome = r.homeTeamId === r.playerTeamId;
    const oppId = isHome ? r.awayTeamId : r.homeTeamId;
    const teamScore = isHome ? r.homeScore : r.awayScore;
    const oppScore = isHome ? r.awayScore : r.homeScore;
    const margin =
      teamScore != null && oppScore != null ? teamScore - oppScore : null;
    const result: "W" | "L" | "D" | null =
      margin == null ? null : margin > 0 ? "W" : margin < 0 ? "L" : "D";

    if (!playerGamesMap.has(r.playerId)) playerGamesMap.set(r.playerId, []);
    playerGamesMap.get(r.playerId)!.push({
      round: r.round,
      matchId: r.matchId,
      date: r.date,
      opponentName: teamMap.get(oppId)?.name ?? oppId,
      opponentShort: teamMap.get(oppId)?.shortName ?? oppId,
      isHome,
      teamScore,
      oppScore,
      result,
      kicks: r.kicks,
      handballs: r.handballs,
      disposals: r.disposals,
      marks: r.marks,
      goals: r.goals,
      behinds: r.behinds,
      tackles: r.tackles,
      hitouts: r.hitouts,
      goalAssists: r.goalAssists,
      inside50s: r.inside50s,
      clearances: r.clearances,
      clangers: r.clangers,
      rebound50s: r.rebound50s,
      freesFor: r.freesFor,
      freesAgainst: r.freesAgainst,
      aflFantasyPts: r.aflFantasyPts,
      supercoachPts: r.supercoachPts,
    });
  }

  for (const games of playerGamesMap.values())
    games.sort((a, b) => a.round - b.round);

  const allPlayers = [...playerGamesMap.entries()]
    .map(([id]) => ({
      id,
      name: playerNameById.get(id) ?? "",
      teamName: teamMap.get(playerTeamById.get(id) ?? "")?.name ?? "",
    }))
    .sort((a, b) => {
      const gA = playerGamesMap.get(a.id)!;
      const gB = playerGamesMap.get(b.id)!;
      const avgA =
        gA.length > 0 ? gA.reduce((s, g) => s + g.disposals, 0) / gA.length : 0;
      const avgB =
        gB.length > 0 ? gB.reduce((s, g) => s + g.disposals, 0) / gB.length : 0;
      return avgB - avgA;
    });

  // Leaderboards
  const statKeys = [
    { key: "disposals" as const, label: "Disposals" },
    { key: "goals" as const, label: "Goals" },
    { key: "kicks" as const, label: "Kicks" },
    { key: "aflFantasyPts" as const, label: "AFL Fantasy" },
    { key: "tackles" as const, label: "Tackles" },
  ];
  const leaderboards = statKeys.map(({ key, label }) => {
    const acc = new Map<string, { total: number; count: number }>();
    for (const r of statsWithContext) {
      const val = r[key];
      const ex = acc.get(r.playerName) ?? { total: 0, count: 0 };
      acc.set(r.playerName, { total: ex.total + val, count: ex.count + 1 });
    }
    const top5 = [...acc.entries()]
      .map(([playerName, { total, count }]) => ({
        playerName,
        avg: count > 0 ? total / count : 0,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
    return { stat: key, label, top5 };
  });

  // Streaks
  const streaks: {
    type: string;
    playerName: string;
    value: number;
    label: string;
  }[] = [];

  // Goal streak
  const playerRoundGoals = new Map<string, Map<number, number>>();
  for (const r of statsWithContext) {
    if (!playerRoundGoals.has(r.playerName))
      playerRoundGoals.set(r.playerName, new Map());
    playerRoundGoals.get(r.playerName)!.set(r.round, r.goals);
  }
  let bestGoalStreak = { playerName: "", value: 0 };
  for (const [name, roundMap] of playerRoundGoals) {
    const rounds = [...roundMap.keys()].sort((a, b) => a - b);
    let max = 0,
      cur = 0;
    for (const r of rounds) {
      if ((roundMap.get(r) ?? 0) > 0) {
        cur++;
        if (cur > max) max = cur;
      } else cur = 0;
    }
    if (max > bestGoalStreak.value)
      bestGoalStreak = { playerName: name, value: max };
  }
  if (bestGoalStreak.value > 0) {
    streaks.push({
      type: "goal-streak",
      playerName: bestGoalStreak.playerName,
      value: bestGoalStreak.value,
      label: `goals in ${bestGoalStreak.value} consecutive round${bestGoalStreak.value !== 1 ? "s" : ""}`,
    });
  }

  // Disposal machine
  const disposalMachine = new Map<string, number>();
  for (const r of statsWithContext) {
    if (r.disposals >= 30)
      disposalMachine.set(
        r.playerName,
        (disposalMachine.get(r.playerName) ?? 0) + 1,
      );
  }
  const bestDisposalMachine = [...disposalMachine.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (bestDisposalMachine) {
    streaks.push({
      type: "disposal-machine",
      playerName: bestDisposalMachine[0],
      value: bestDisposalMachine[1],
      label: `rounds with 30+ disposals`,
    });
  }

  // Hot form (last 3 rounds)
  const allRoundsSorted = [
    ...new Set(statsWithContext.map((r) => r.round)),
  ].sort((a, b) => a - b);
  const last3 = allRoundsSorted.slice(-3);
  if (last3.length > 0) {
    const hotAcc = new Map<string, { total: number; count: number }>();
    for (const r of statsWithContext) {
      if (last3.includes(r.round)) {
        const ex = hotAcc.get(r.playerName) ?? { total: 0, count: 0 };
        hotAcc.set(r.playerName, {
          total: ex.total + r.disposals,
          count: ex.count + 1,
        });
      }
    }
    const topHot = [...hotAcc.entries()]
      .map(([name, { total, count }]) => ({
        name,
        avg: count > 0 ? total / count : 0,
      }))
      .sort((a, b) => b.avg - a.avg)[0];
    if (topHot)
      streaks.push({
        type: "hot-form",
        playerName: topHot.name,
        value: Math.round(topHot.avg * 10) / 10,
        label: `avg disposals over last ${last3.length} rounds`,
      });
  }

  // Fantasy standout
  const fantasyAcc = new Map<string, { total: number; count: number }>();
  for (const r of statsWithContext) {
    const ex = fantasyAcc.get(r.playerName) ?? { total: 0, count: 0 };
    fantasyAcc.set(r.playerName, {
      total: ex.total + r.aflFantasyPts,
      count: ex.count + 1,
    });
  }
  const topFantasy = [...fantasyAcc.entries()]
    .map(([name, { total, count }]) => ({
      name,
      avg: count > 0 ? total / count : 0,
    }))
    .sort((a, b) => b.avg - a.avg)[0];
  if (topFantasy)
    streaks.push({
      type: "fantasy-standout",
      playerName: topFantasy.name,
      value: Math.round(topFantasy.avg * 10) / 10,
      label: `AFL Fantasy avg`,
    });

  const playerGames: Record<number, PlayerGameRow[]> =
    Object.fromEntries(playerGamesMap);

  return {
    rows,
    advRows,
    allYears,
    selectedYear,
    leaderboards,
    streaks,
    allPlayers,
    playerGames,
    yearTeams,
  };
};
