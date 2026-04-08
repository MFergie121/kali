import { getUpcomingRound } from "$lib/afl/squiggle";
import { db } from "$lib/db/afl";
import type { Team } from "$lib/db/afl/schema";
import {
  matches,
  players,
  playerStats,
  playerStatsAdvanced,
} from "$lib/db/afl/schema";
import {
  getAllTeams,
  getFixturesForYear,
  getTipsForRound,
} from "$lib/db/afl/service";
import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

// ─── Constants ──────────────────────────────────────────────────────────────────

const MAX_ROUND = 28;

const WEIGHTS: Record<string, number> = {
  form: 0.2,
  scoring: 0.2,
  stats: 0.2,
  venue: 0.1,
  h2h: 0.1,
  squiggle: 0.2,
};

const STAT_KEYS = [
  "disposals",
  "inside50s",
  "clearances",
  "tackles",
  "contestedPossessions",
  "turnovers",
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────────

interface FactorBreakdown {
  form: number;
  scoring: number;
  stats: number;
  venue: number;
  h2h: number;
  squiggle: number;
}

export interface PredictionFactor {
  label: string;
  team: "home" | "away";
  impact: number;
}

export interface PredictionGame {
  fixtureId: number;
  round: number;
  date: string | null;
  venue: string | null;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string;
  awayTeamId: string;
  homeProbability: number;
  awayProbability: number;
  factors: PredictionFactor[];
  squiggleConsensus: number | null;
  homeBreakdown: FactorBreakdown;
  awayBreakdown: FactorBreakdown;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function buildTeamLookups(allTeams: Team[]): {
  nameMap: Map<string, Team>;
  teams: Team[];
} {
  const nameMap = new Map<string, Team>();
  for (const t of allTeams) {
    nameMap.set(t.name.toLowerCase(), t);
    nameMap.set(t.shortName.toLowerCase(), t);
    nameMap.set(t.id, t); // slug e.g. "greater-western-sydney"
  }
  return { nameMap, teams: allTeams };
}

function resolveTeam(
  name: string | null,
  lookups: { nameMap: Map<string, Team>; teams: Team[] },
): Team | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  // 1. Exact match on name, shortName, or slug ID
  const direct = lookups.nameMap.get(lower);
  if (direct) return direct;
  // 2. Slugify the Squiggle name and try matching against team IDs
  const slug = lower.replace(/\s+/g, "-");
  const bySlug = lookups.nameMap.get(slug);
  if (bySlug) return bySlug;
  // 3. Partial match — check if any team's full name starts with the input or vice versa
  for (const t of lookups.teams) {
    const tName = t.name.toLowerCase();
    if (tName.startsWith(lower) || lower.startsWith(tName)) return t;
  }
  return null;
}

// ─── Factor Calculations ────────────────────────────────────────────────────────

interface TeamSeasonData {
  wins: number;
  losses: number;
  draws: number;
  played: number;
  totalFor: number;
  totalAgainst: number;
  avgMargin: number;
  pct: number;
  form: ("W" | "L" | "D")[];
}

function computeSeasonData(
  yearMatches: {
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number | null;
    awayScore: number | null;
    round: number;
  }[],
  teamId: string,
): TeamSeasonData {
  const games = yearMatches
    .filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId)
    .filter((m) => m.homeScore != null && m.awayScore != null)
    .sort((a, b) => b.round - a.round);

  let wins = 0,
    losses = 0,
    draws = 0,
    totalFor = 0,
    totalAgainst = 0,
    totalMargin = 0;

  const results: ("W" | "L" | "D")[] = [];
  for (const m of games) {
    const isHome = m.homeTeamId === teamId;
    const scored = isHome ? m.homeScore! : m.awayScore!;
    const conceded = isHome ? m.awayScore! : m.homeScore!;
    const margin = scored - conceded;
    totalFor += scored;
    totalAgainst += conceded;
    totalMargin += margin;
    if (margin > 0) {
      wins++;
      results.push("W");
    } else if (margin < 0) {
      losses++;
      results.push("L");
    } else {
      draws++;
      results.push("D");
    }
  }

  const played = wins + losses + draws;
  return {
    wins,
    losses,
    draws,
    played,
    totalFor,
    totalAgainst,
    avgMargin: played > 0 ? totalMargin / played : 0,
    pct: totalAgainst > 0 ? (totalFor / totalAgainst) * 100 : 100,
    form: results.slice(0, 5),
  };
}

function formScore(data: TeamSeasonData): number {
  const last5 = data.form;
  if (last5.length === 0) return 50;
  const score = last5.reduce(
    (s, r) => s + (r === "W" ? 20 : r === "D" ? 10 : 0),
    0,
  );
  return (score / last5.length) * 5;
}

function scoringScore(data: TeamSeasonData): number {
  if (data.played === 0) return 50;
  const marginScore = clamp(50 + data.avgMargin / 2, 0, 100);
  const pctScore = clamp(data.pct - 50, 0, 100);
  return marginScore * 0.6 + pctScore * 0.4;
}

function statsScore(
  teamId: string,
  teamStatRanks: Map<string, Map<string, number>>,
  totalTeams: number,
): number {
  if (totalTeams <= 1) return 50;
  let sum = 0;
  let count = 0;
  for (const stat of STAT_KEYS) {
    const rankMap = teamStatRanks.get(stat);
    if (!rankMap) continue;
    const rank = rankMap.get(teamId);
    if (rank == null) continue;
    sum += (1 - (rank - 1) / (totalTeams - 1)) * 100;
    count++;
  }
  return count > 0 ? sum / count : 50;
}

function venueScore(
  isHome: boolean,
  venueWinPct: number | null,
): number {
  const baseline = isHome ? 55 : 45;
  if (venueWinPct == null) return baseline;
  return baseline * 0.5 + venueWinPct * 0.5;
}

function h2hScore(wins: number, total: number): number {
  if (total === 0) return 50;
  return (wins / total) * 100;
}

function toProbability(homeRating: number, awayRating: number): number {
  const diff = homeRating - awayRating;
  return 1 / (1 + Math.pow(10, -diff / 30));
}

// ─── Key Factors ────────────────────────────────────────────────────────────────

function deriveFactors(
  home: FactorBreakdown,
  away: FactorBreakdown,
  homeForm: ("W" | "L" | "D")[],
  awayForm: ("W" | "L" | "D")[],
  hasSquiggle: boolean,
): PredictionFactor[] {
  const factors: PredictionFactor[] = [];
  const entries: {
    key: keyof FactorBreakdown;
    weight: number;
  }[] = [
    { key: "form", weight: WEIGHTS.form },
    { key: "scoring", weight: WEIGHTS.scoring },
    { key: "stats", weight: WEIGHTS.stats },
    { key: "venue", weight: WEIGHTS.venue },
    { key: "h2h", weight: WEIGHTS.h2h },
    { key: "squiggle", weight: WEIGHTS.squiggle },
  ];

  for (const { key, weight } of entries) {
    if (key === "squiggle" && !hasSquiggle) continue;
    const diff = home[key] - away[key];
    if (Math.abs(diff) < 3) continue;

    const team: "home" | "away" = diff > 0 ? "home" : "away";
    const impact = Math.abs(diff) * weight;
    const form = team === "home" ? homeForm : awayForm;

    let label: string;
    switch (key) {
      case "form": {
        const w = form.filter((r) => r === "W").length;
        const l = form.filter((r) => r === "L").length;
        label = `Strong form (${w}W-${l}L)`;
        break;
      }
      case "scoring":
        label = "Superior scoring power";
        break;
      case "stats":
        label = "Better team stats";
        break;
      case "venue":
        label = "Home ground advantage";
        break;
      case "h2h":
        label = "Dominant H2H record";
        break;
      case "squiggle":
        label = "Tipster consensus";
        break;
    }

    factors.push({ label, team, impact });
  }

  return factors.sort((a, b) => b.impact - a.impact).slice(0, 3);
}

// ─── Load Function ──────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ url }) => {
  const currentYear = new Date().getFullYear();

  // 1. Load fixtures + teams
  const [allTeams, allFixtures] = await Promise.all([
    getAllTeams(),
    getFixturesForYear(currentYear).catch(() => []),
  ]);

  const lookups = buildTeamLookups(allTeams);

  // 2. Determine round
  const upcomingRound = getUpcomingRound(allFixtures);
  const rawRound = parseInt(url.searchParams.get("round") ?? "");
  const selectedRound =
    !isNaN(rawRound) && rawRound >= 0 && rawRound <= MAX_ROUND
      ? rawRound
      : upcomingRound ?? 1;

  // Available rounds (those with fixture data)
  const roundsWithFixtures = [
    ...new Set(allFixtures.map((f) => f.round)),
  ].sort((a, b) => a - b);

  // 3. Get games for this round
  const roundGames = allFixtures.filter(
    (f) => f.round === selectedRound,
  );

  if (roundGames.length === 0) {
    return {
      selectedRound,
      predictions: [],
      availableRounds: roundsWithFixtures,
    };
  }

  // 4. Resolve team IDs and build list of needed teams
  const gamePairs: {
    fixture: (typeof roundGames)[0];
    homeTeam: Team;
    awayTeam: Team;
  }[] = [];

  for (const fixture of roundGames) {
    const home = resolveTeam(fixture.hteam, lookups);
    const away = resolveTeam(fixture.ateam, lookups);
    if (home && away) {
      gamePairs.push({ fixture, homeTeam: home, awayTeam: away });
    } else {
      console.warn(
        `[predictions] Could not resolve teams: "${fixture.hteam}" => ${home?.id ?? "MISSING"}, "${fixture.ateam}" => ${away?.id ?? "MISSING"}`,
      );
    }
  }

  const neededTeamIds = [
    ...new Set(gamePairs.flatMap((g) => [g.homeTeam.id, g.awayTeam.id])),
  ];

  // 5. Load current season matches
  const yearMatches = await db
    .select({
      id: matches.id,
      round: matches.round,
      year: matches.year,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      venue: matches.venue,
    })
    .from(matches)
    .where(eq(matches.year, currentYear))
    .orderBy(desc(matches.round));

  // 6. Per-team season summaries
  const seasonDataMap = new Map<string, TeamSeasonData>();
  for (const tid of neededTeamIds) {
    seasonDataMap.set(tid, computeSeasonData(yearMatches, tid));
  }

  // 7. Team stat rankings — aggregate stats across all teams for the season
  const basicStatRows = await db
    .select({
      teamId: players.currentTeamId,
      disposals: sql<number>`cast(sum(${playerStats.disposals}) as int)`,
      inside50s: sql<number>`cast(sum(${playerStats.inside50s}) as int)`,
      clearances: sql<number>`cast(sum(${playerStats.clearances}) as int)`,
      tackles: sql<number>`cast(sum(${playerStats.tackles}) as int)`,
      games: sql<number>`cast(count(distinct ${playerStats.matchId}) as int)`,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(eq(matches.year, currentYear))
    .groupBy(players.currentTeamId);

  const advStatRows = await db
    .select({
      teamId: players.currentTeamId,
      contestedPossessions:
        sql<number>`cast(sum(${playerStatsAdvanced.contestedPossessions}) as int)`,
      turnovers:
        sql<number>`cast(sum(${playerStatsAdvanced.turnovers}) as int)`,
      games:
        sql<number>`cast(count(distinct ${playerStatsAdvanced.matchId}) as int)`,
    })
    .from(playerStatsAdvanced)
    .innerJoin(players, eq(playerStatsAdvanced.playerId, players.id))
    .innerJoin(matches, eq(playerStatsAdvanced.matchId, matches.id))
    .where(eq(matches.year, currentYear))
    .groupBy(players.currentTeamId);

  // Build per-team averages and rank them
  const teamAvgs = new Map<
    string,
    Record<string, number>
  >();

  for (const row of basicStatRows) {
    if (!row.teamId || row.games === 0) continue;
    teamAvgs.set(row.teamId, {
      disposals: row.disposals / row.games,
      inside50s: row.inside50s / row.games,
      clearances: row.clearances / row.games,
      tackles: row.tackles / row.games,
    });
  }
  for (const row of advStatRows) {
    if (!row.teamId || row.games === 0) continue;
    const existing = teamAvgs.get(row.teamId) ?? {};
    existing.contestedPossessions = row.contestedPossessions / row.games;
    existing.turnovers = row.turnovers / row.games;
    teamAvgs.set(row.teamId, existing);
  }

  // Rank teams per stat (1 = best)
  const teamStatRanks = new Map<string, Map<string, number>>();
  const totalRankedTeams = teamAvgs.size;
  for (const stat of STAT_KEYS) {
    const sorted = [...teamAvgs.entries()]
      .filter(([, avgs]) => avgs[stat] != null)
      .sort(([, a], [, b]) => {
        // Lower turnovers is better
        if (stat === "turnovers") return (a[stat] ?? 0) - (b[stat] ?? 0);
        return (b[stat] ?? 0) - (a[stat] ?? 0);
      });

    const rankMap = new Map<string, number>();
    sorted.forEach(([tid], i) => rankMap.set(tid, i + 1));
    teamStatRanks.set(stat, rankMap);
  }

  // 8. H2H history (last 3 years) for all game pairs
  const h2hConditions = gamePairs.map((g) =>
    or(
      and(
        eq(matches.homeTeamId, g.homeTeam.id),
        eq(matches.awayTeamId, g.awayTeam.id),
      ),
      and(
        eq(matches.homeTeamId, g.awayTeam.id),
        eq(matches.awayTeamId, g.homeTeam.id),
      ),
    ),
  );

  let h2hMatches: {
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number | null;
    awayScore: number | null;
    venue: string;
  }[] = [];

  if (h2hConditions.length > 0) {
    h2hMatches = await db
      .select({
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        venue: matches.venue,
      })
      .from(matches)
      .where(
        and(
          gte(matches.year, currentYear - 3),
          or(...h2hConditions)!,
        ),
      )
      .orderBy(desc(matches.year), desc(matches.round))
      .limit(100);
  }

  // 9. Squiggle tips
  let roundTips: Awaited<ReturnType<typeof getTipsForRound>> = [];
  try {
    roundTips = await getTipsForRound(currentYear, selectedRound);
  } catch {
    // tips table may not exist
  }

  const tipsByGame = new Map<number, number>();
  const tipGroups = new Map<number, number[]>();
  for (const tip of roundTips) {
    if (!tipGroups.has(tip.gameId)) tipGroups.set(tip.gameId, []);
    tipGroups.get(tip.gameId)!.push(tip.hconfidence);
  }
  for (const [gameId, confs] of tipGroups) {
    tipsByGame.set(
      gameId,
      confs.reduce((a, b) => a + b, 0) / confs.length,
    );
  }

  // 10. Compute predictions
  const predictions: PredictionGame[] = [];

  for (const { fixture, homeTeam, awayTeam } of gamePairs) {
    const homeSeason = seasonDataMap.get(homeTeam.id) ?? computeSeasonData([], homeTeam.id);
    const awaySeason = seasonDataMap.get(awayTeam.id) ?? computeSeasonData([], awayTeam.id);

    // Factor scores
    const homeFormScore = formScore(homeSeason);
    const awayFormScore = formScore(awaySeason);

    const homeScoringScore = scoringScore(homeSeason);
    const awayScoringScore = scoringScore(awaySeason);

    const homeStatsScore = statsScore(homeTeam.id, teamStatRanks, totalRankedTeams);
    const awayStatsScore = statsScore(awayTeam.id, teamStatRanks, totalRankedTeams);

    // Venue — check venue-specific win rates
    const venueStr = fixture.venue ?? "";
    let homeVenueWinPct: number | null = null;
    let awayVenueWinPct: number | null = null;

    if (venueStr) {
      // Query venue records from yearMatches + h2hMatches
      const allMatchesAtVenue = [
        ...yearMatches.filter((m) => m.venue === venueStr),
        ...h2hMatches.filter((m) => m.venue === venueStr),
      ];

      // Deduplicate by assuming yearMatches and h2hMatches may overlap
      const seen = new Set<string>();
      const uniqueVenueMatches = allMatchesAtVenue.filter((m) => {
        const key = `${m.homeTeamId}-${m.awayTeamId}-${m.homeScore}-${m.awayScore}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      for (const tid of [homeTeam.id, awayTeam.id]) {
        const teamVenueGames = uniqueVenueMatches.filter(
          (m) =>
            (m.homeTeamId === tid || m.awayTeamId === tid) &&
            m.homeScore != null &&
            m.awayScore != null,
        );
        if (teamVenueGames.length >= 2) {
          const vWins = teamVenueGames.filter((m) => {
            const isHome = m.homeTeamId === tid;
            const scored = isHome ? m.homeScore! : m.awayScore!;
            const conceded = isHome ? m.awayScore! : m.homeScore!;
            return scored > conceded;
          }).length;
          const pct = (vWins / teamVenueGames.length) * 100;
          if (tid === homeTeam.id) homeVenueWinPct = pct;
          else awayVenueWinPct = pct;
        }
      }
    }

    const homeVenueScore = venueScore(true, homeVenueWinPct);
    const awayVenueScore = venueScore(false, awayVenueWinPct);

    // H2H
    const pairH2h = h2hMatches.filter(
      (m) =>
        (m.homeTeamId === homeTeam.id && m.awayTeamId === awayTeam.id) ||
        (m.homeTeamId === awayTeam.id && m.awayTeamId === homeTeam.id),
    ).slice(0, 6);

    let homeH2hWins = 0;
    let awayH2hWins = 0;
    for (const m of pairH2h) {
      if (m.homeScore == null || m.awayScore == null) continue;
      const homeIsHome = m.homeTeamId === homeTeam.id;
      const homeScored = homeIsHome ? m.homeScore : m.awayScore;
      const awayScoredH2h = homeIsHome ? m.awayScore : m.homeScore;
      if (homeScored > awayScoredH2h) homeH2hWins++;
      else if (awayScoredH2h > homeScored) awayH2hWins++;
    }

    const h2hTotal = pairH2h.filter(
      (m) => m.homeScore != null && m.awayScore != null,
    ).length;
    const homeH2hScore = h2hScore(homeH2hWins, h2hTotal);
    const awayH2hScore = h2hScore(awayH2hWins, h2hTotal);

    // Squiggle
    const squiggleConf = tipsByGame.get(fixture.id) ?? null;
    const hasSquiggle = squiggleConf != null;
    const homeSquiggleScore = squiggleConf ?? 50;
    const awaySquiggleScore = squiggleConf != null ? 100 - squiggleConf : 50;

    // Compute weighted ratings
    const activeWeights = { ...WEIGHTS };
    if (!hasSquiggle) {
      // Redistribute squiggle weight
      const redistrib = activeWeights.squiggle / 5;
      activeWeights.form += redistrib;
      activeWeights.scoring += redistrib;
      activeWeights.stats += redistrib;
      activeWeights.venue += redistrib;
      activeWeights.h2h += redistrib;
      activeWeights.squiggle = 0;
    }

    const homeBreakdown: FactorBreakdown = {
      form: homeFormScore,
      scoring: homeScoringScore,
      stats: homeStatsScore,
      venue: homeVenueScore,
      h2h: homeH2hScore,
      squiggle: homeSquiggleScore,
    };
    const awayBreakdown: FactorBreakdown = {
      form: awayFormScore,
      scoring: awayScoringScore,
      stats: awayStatsScore,
      venue: awayVenueScore,
      h2h: awayH2hScore,
      squiggle: awaySquiggleScore,
    };

    const homeRating =
      activeWeights.form * homeFormScore +
      activeWeights.scoring * homeScoringScore +
      activeWeights.stats * homeStatsScore +
      activeWeights.venue * homeVenueScore +
      activeWeights.h2h * homeH2hScore +
      activeWeights.squiggle * homeSquiggleScore;

    const awayRating =
      activeWeights.form * awayFormScore +
      activeWeights.scoring * awayScoringScore +
      activeWeights.stats * awayStatsScore +
      activeWeights.venue * awayVenueScore +
      activeWeights.h2h * awayH2hScore +
      activeWeights.squiggle * awaySquiggleScore;

    const homeProbability = toProbability(homeRating, awayRating) * 100;

    const factors = deriveFactors(
      homeBreakdown,
      awayBreakdown,
      homeSeason.form,
      awaySeason.form,
      hasSquiggle,
    );

    predictions.push({
      fixtureId: fixture.id,
      round: fixture.round,
      date: fixture.date,
      venue: fixture.venue,
      homeTeam: fixture.hteam ?? "TBD",
      awayTeam: fixture.ateam ?? "TBD",
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeProbability: Math.round(homeProbability * 10) / 10,
      awayProbability: Math.round((100 - homeProbability) * 10) / 10,
      factors,
      squiggleConsensus: squiggleConf != null ? Math.round(squiggleConf) : null,
      homeBreakdown,
      awayBreakdown,
    });
  }

  return {
    selectedRound,
    predictions,
    availableRounds: roundsWithFixtures,
  };
};
