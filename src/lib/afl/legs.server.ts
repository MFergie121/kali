// Server-only orchestration for the Legs page. Loads the batched history from
// the service layer, sources each fixture's win probability, and drives the
// pure engine (legs-engine.ts) to produce the showcase, a player card or a team
// table. Shared by the page load and the search endpoint so both agree on the
// maths without recomputing each other's work.

import type { Fixture, Team } from "$lib/db/afl/schema";
import { MODEL_VERSION } from "$lib/afl/predictor";
import {
  buildTeamLookups,
  resolveTeam,
  type TeamLookups,
} from "$lib/afl/predictor";
import { getUpcomingRound } from "$lib/afl/squiggle";
import {
  getAllTeams,
  getCareerGameCounts,
  getFixturesForYear,
  getHeadToHeadGamesForPlayers,
  getLatestLineupForTeams,
  getModelHomeProbabilities,
  getPlayerById,
  getRecentGamesForPlayers,
  getTeamById,
  getTipsForRound,
  type LineupPlayer,
} from "$lib/db/afl/service";
import {
  BASELINE_WINDOW,
  predictPlayer,
  rankShowcase,
  resolveWinProbability,
  STAT_LABELS,
  SHOWCASE_STAT_KEYS,
  teamWinProbability,
  tipsterConsensus,
  type DeviationCandidate,
  type SampledGame,
  type ShowcaseStatKey,
  type StatKey,
  type LowSampleReason,
  type WinSource,
} from "$lib/afl/legs-engine";

// ─── Response shapes ────────────────────────────────────────────────────────────

export interface FixtureContext {
  fixtureId: number;
  round: number;
  date: string | null;
  venue: string | null;
  homeTeamId: string;
  homeTeam: string;
  homeShortName: string;
  awayTeamId: string;
  awayTeam: string;
  awayShortName: string;
  /** Home-team win probability used for the adjustment, 0–1. */
  homeWinProb: number;
  winSource: WinSource;
}

export interface StatCell {
  stat: StatKey;
  label: string;
  expected: number;
  safeLine: number;
}

export interface PlayerCard {
  playerId: number;
  playerName: string;
  teamId: string;
  teamName: string;
  teamShortName: string;
  isHome: boolean;
  /** Subject team's win probability, 0–1. */
  teamWinProb: number;
  winSource: WinSource;
  lowSample: boolean;
  lowSampleReasons: LowSampleReason[];
  stats: StatCell[];
  recentSample: SampledGame[];
  h2hSample: SampledGame[];
}

export interface TeamTableRow {
  playerId: number;
  playerName: string;
  lowSample: boolean;
  stats: Record<StatKey, { expected: number; safeLine: number }>;
}

export interface ShowcaseRow {
  playerId: number;
  playerName: string;
  teamId: string;
  teamShortName: string;
  opponentShortName: string;
  isHome: boolean;
  fixtureId: number;
  stat: ShowcaseStatKey;
  statLabel: string;
  predicted: number;
  average: number;
  deviation: number;
  direction: "up" | "down";
  lowSample: boolean;
}

export interface LegsDay {
  date: string; // YYYY-MM-DD
  label: string;
}

export interface LegsShowcaseResult {
  round: number | null;
  day: string | null;
  days: LegsDay[];
  rows: ShowcaseRow[];
  fixtureCount: number;
}

export type LegsSearchResult =
  | { kind: "player"; fixture: FixtureContext; card: PlayerCard }
  | {
      kind: "team";
      fixture: FixtureContext;
      teamId: string;
      teamName: string;
      rows: TeamTableRow[];
    }
  | { kind: "empty" };

// ─── Date helpers ───────────────────────────────────────────────────────────────

/** Today's calendar date in AEST/AEDT, YYYY-MM-DD (fixture dates are Melbourne time). */
function aestToday(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Australia/Sydney",
  });
}

/** Calendar day of a fixture ("2026-03-15 19:25:00" → "2026-03-15"), or null. */
function fixtureDay(date: string | null): string | null {
  return date ? date.slice(0, 10) : null;
}

function dayLabel(day: string): string {
  const d = new Date(day + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ─── Fixture resolution ─────────────────────────────────────────────────────────

interface ResolvedFixture {
  fixture: Fixture;
  home: Team;
  away: Team;
}

function resolveFixture(
  fixture: Fixture,
  lookups: TeamLookups,
): ResolvedFixture | null {
  const home = resolveTeam(fixture.hteam, lookups);
  const away = resolveTeam(fixture.ateam, lookups);
  if (!home || !away) return null;
  return { fixture, home, away };
}

/** The soonest incomplete fixture involving a team, anywhere in the season. */
function nextFixtureForTeam(
  fixtures: Fixture[],
  teamId: string,
  lookups: TeamLookups,
): { resolved: ResolvedFixture; isHome: boolean } | null {
  const candidates = fixtures
    .filter((f) => f.complete < 100 && f.date != null)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
  for (const f of candidates) {
    const resolved = resolveFixture(f, lookups);
    if (!resolved) continue;
    if (resolved.home.id === teamId) return { resolved, isHome: true };
    if (resolved.away.id === teamId) return { resolved, isHome: false };
  }
  return null;
}

// ─── Win probability sourcing ───────────────────────────────────────────────────

type TipsByGame = Map<number, { source: string; hconfidence: number; syncedAt: string }[]>;

async function loadTipsByGame(year: number, round: number): Promise<TipsByGame> {
  const byGame: TipsByGame = new Map();
  let rows: Awaited<ReturnType<typeof getTipsForRound>> = [];
  try {
    rows = await getTipsForRound(year, round);
  } catch {
    return byGame; // tips table may be empty
  }
  for (const t of rows) {
    let list = byGame.get(t.gameId);
    if (!list) {
      list = [];
      byGame.set(t.gameId, list);
    }
    list.push({
      source: t.source,
      hconfidence: t.hconfidence,
      syncedAt: t.syncedAt,
    });
  }
  return byGame;
}

function fixtureWin(
  fixtureId: number,
  tipsByGame: TipsByGame,
  modelProbs: Map<number, number>,
): { homeWinProb: number; source: WinSource } {
  const tips = tipsByGame.get(fixtureId) ?? [];
  return resolveWinProbability(
    tipsterConsensus(tips),
    modelProbs.get(fixtureId) ?? null,
  );
}

function fixtureContext(
  rf: ResolvedFixture,
  win: { homeWinProb: number; source: WinSource },
): FixtureContext {
  return {
    fixtureId: rf.fixture.id,
    round: rf.fixture.round,
    date: rf.fixture.date,
    venue: rf.fixture.venue,
    homeTeamId: rf.home.id,
    homeTeam: rf.home.name,
    homeShortName: rf.home.shortName,
    awayTeamId: rf.away.id,
    awayTeam: rf.away.name,
    awayShortName: rf.away.shortName,
    homeWinProb: win.homeWinProb,
    winSource: win.source,
  };
}

// ─── Projection helpers ─────────────────────────────────────────────────────────

function projectOne(
  playerId: number,
  recentByPlayer: Map<number, SampledGame[]>,
  h2hByPlayer: Map<number, SampledGame[]>,
  teamWinProb: number,
  winSource: WinSource,
) {
  return predictPlayer({
    recentGames: recentByPlayer.get(playerId) ?? [],
    h2hGames: h2hByPlayer.get(playerId) ?? [],
    win: { teamWinProb, source: winSource },
  });
}

function toStatCells(
  projections: { stat: StatKey; expected: number; safeLine: number }[],
): StatCell[] {
  return projections.map((p) => ({
    stat: p.stat,
    label: STAT_LABELS[p.stat],
    expected: p.expected,
    safeLine: p.safeLine,
  }));
}

function toTeamTableRow(
  player: LineupPlayer,
  projection: ReturnType<typeof predictPlayer>,
): TeamTableRow {
  const stats = {} as Record<StatKey, { expected: number; safeLine: number }>;
  for (const p of projection.projections) {
    stats[p.stat] = { expected: p.expected, safeLine: p.safeLine };
  }
  return {
    playerId: player.playerId,
    playerName: player.playerName,
    lowSample: projection.lowSample,
    stats,
  };
}

function baselineAverage(games: SampledGame[], stat: ShowcaseStatKey): number {
  if (games.length === 0) return 0;
  return games.reduce((sum, g) => sum + g[stat], 0) / games.length;
}

// ─── Showcase (page load) ───────────────────────────────────────────────────────

export async function loadLegsShowcase(
  year: number,
  dateParam: string | null,
): Promise<LegsShowcaseResult> {
  const [allTeams, allFixtures] = await Promise.all([
    getAllTeams(),
    getFixturesForYear(year).catch(() => [] as Fixture[]),
  ]);
  const lookups = buildTeamLookups(allTeams);

  const round = getUpcomingRound(allFixtures);
  if (round === null) {
    return { round: null, day: null, days: [], rows: [], fixtureCount: 0 };
  }

  // Remaining days of the upcoming round: any day with an unplayed game.
  const roundFixtures = allFixtures.filter(
    (f) => f.round === round && f.date != null,
  );
  const today = aestToday();
  const daySet = new Set<string>();
  for (const f of roundFixtures) {
    const day = fixtureDay(f.date);
    if (day && f.complete < 100 && day >= today) daySet.add(day);
  }
  const days: LegsDay[] = [...daySet]
    .sort()
    .map((date) => ({ date, label: dayLabel(date) }));

  const day = dateParam && daySet.has(dateParam) ? dateParam : (days[0]?.date ?? null);
  if (day === null) {
    return { round, day: null, days, rows: [], fixtureCount: 0 };
  }

  // Fixtures being showcased on the selected day.
  const dayFixtures = roundFixtures
    .filter((f) => fixtureDay(f.date) === day && f.complete < 100)
    .map((f) => resolveFixture(f, lookups))
    .filter((rf): rf is ResolvedFixture => rf !== null);

  if (dayFixtures.length === 0) {
    return { round, day, days, rows: [], fixtureCount: 0 };
  }

  const [tipsByGame, modelProbs, lineups] = await Promise.all([
    loadTipsByGame(year, round),
    getModelHomeProbabilities(
      dayFixtures.map((rf) => rf.fixture.id),
      MODEL_VERSION,
    ),
    getLatestLineupForTeams([
      ...new Set(dayFixtures.flatMap((rf) => [rf.home.id, rf.away.id])),
    ]),
  ]);

  // Every player in play across the day → one recent-games + career-count read.
  const allPlayerIds = [
    ...new Set(
      dayFixtures.flatMap((rf) => [
        ...(lineups.get(rf.home.id) ?? []).map((p) => p.playerId),
        ...(lineups.get(rf.away.id) ?? []).map((p) => p.playerId),
      ]),
    ),
  ];
  const [recentByPlayer, careerGames] = await Promise.all([
    getRecentGamesForPlayers(allPlayerIds, BASELINE_WINDOW),
    getCareerGameCounts(allPlayerIds),
  ]);

  // Head-to-head: one query per fixture side.
  const h2hByPlayer = new Map<number, SampledGame[]>();
  await Promise.all(
    dayFixtures.flatMap((rf) => {
      const homeIds = (lineups.get(rf.home.id) ?? []).map((p) => p.playerId);
      const awayIds = (lineups.get(rf.away.id) ?? []).map((p) => p.playerId);
      return [
        getHeadToHeadGamesForPlayers(homeIds, rf.away.id, 3).then((m) => {
          for (const [id, games] of m) h2hByPlayer.set(id, games);
        }),
        getHeadToHeadGamesForPlayers(awayIds, rf.home.id, 3).then((m) => {
          for (const [id, games] of m) h2hByPlayer.set(id, games);
        }),
      ];
    }),
  );

  // Build one deviation candidate per player, carrying enough to hydrate rows.
  interface Meta {
    playerName: string;
    teamId: string;
    teamShortName: string;
    opponentShortName: string;
    isHome: boolean;
    fixtureId: number;
    lowSample: boolean;
  }
  const candidates: DeviationCandidate[] = [];
  const metaById = new Map<number, Meta>();

  for (const rf of dayFixtures) {
    const win = fixtureWin(rf.fixture.id, tipsByGame, modelProbs);
    for (const side of ["home", "away"] as const) {
      const team = side === "home" ? rf.home : rf.away;
      const opponent = side === "home" ? rf.away : rf.home;
      const isHome = side === "home";
      const teamWinProb = teamWinProbability(win.homeWinProb, isHome);
      const pool = lineups.get(team.id) ?? [];

      for (const player of pool) {
        if (metaById.has(player.playerId)) continue; // player listed once
        const projection = projectOne(
          player.playerId,
          recentByPlayer,
          h2hByPlayer,
          teamWinProb,
          win.source,
        );
        const recent = recentByPlayer.get(player.playerId) ?? [];
        const predicted = {} as Record<ShowcaseStatKey, number>;
        const average = {} as Record<ShowcaseStatKey, number>;
        for (const stat of SHOWCASE_STAT_KEYS) {
          predicted[stat] =
            projection.projections.find((p) => p.stat === stat)?.expected ?? 0;
          average[stat] = baselineAverage(recent, stat);
        }
        candidates.push({
          playerId: player.playerId,
          careerGames: careerGames.get(player.playerId) ?? recent.length,
          predicted,
          average,
        });
        metaById.set(player.playerId, {
          playerName: player.playerName,
          teamId: team.id,
          teamShortName: team.shortName,
          opponentShortName: opponent.shortName,
          isHome,
          fixtureId: rf.fixture.id,
          lowSample: projection.lowSample,
        });
      }
    }
  }

  const rows: ShowcaseRow[] = rankShowcase(candidates).map((r) => {
    const meta = metaById.get(r.playerId)!;
    return {
      playerId: r.playerId,
      playerName: meta.playerName,
      teamId: meta.teamId,
      teamShortName: meta.teamShortName,
      opponentShortName: meta.opponentShortName,
      isHome: meta.isHome,
      fixtureId: meta.fixtureId,
      stat: r.stat,
      statLabel: STAT_LABELS[r.stat],
      predicted: r.predicted,
      average: Math.round(r.average * 10) / 10,
      deviation: r.deviation,
      direction: r.direction,
      lowSample: meta.lowSample,
    };
  });

  return { round, day, days, rows, fixtureCount: dayFixtures.length };
}

// ─── Search (endpoint) ──────────────────────────────────────────────────────────

async function winForFixture(
  year: number,
  rf: ResolvedFixture,
): Promise<{ homeWinProb: number; source: WinSource }> {
  const [tipsByGame, modelProbs] = await Promise.all([
    loadTipsByGame(year, rf.fixture.round),
    getModelHomeProbabilities([rf.fixture.id], MODEL_VERSION),
  ]);
  return fixtureWin(rf.fixture.id, tipsByGame, modelProbs);
}

export async function searchPlayer(
  year: number,
  playerId: number,
): Promise<LegsSearchResult> {
  const [player, allTeams, allFixtures] = await Promise.all([
    getPlayerById(playerId),
    getAllTeams(),
    getFixturesForYear(year).catch(() => [] as Fixture[]),
  ]);
  if (!player) return { kind: "empty" };

  const lookups = buildTeamLookups(allTeams);
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));
  const next = nextFixtureForTeam(allFixtures, player.currentTeamId, lookups);
  if (!next) return { kind: "empty" };

  const { resolved: rf, isHome } = next;
  const team = isHome ? rf.home : rf.away;
  const opponent = isHome ? rf.away : rf.home;
  const win = await winForFixture(year, rf);
  const teamWinProb = teamWinProbability(win.homeWinProb, isHome);

  const [recentByPlayer, h2hByPlayer] = await Promise.all([
    getRecentGamesForPlayers([playerId], BASELINE_WINDOW),
    getHeadToHeadGamesForPlayers([playerId], opponent.id, 3),
  ]);

  const projection = projectOne(
    playerId,
    recentByPlayer,
    h2hByPlayer,
    teamWinProb,
    win.source,
  );

  const card: PlayerCard = {
    playerId,
    playerName: player.name,
    teamId: team.id,
    teamName: teamMap.get(team.id)?.name ?? team.id,
    teamShortName: team.shortName,
    isHome,
    teamWinProb,
    winSource: win.source,
    lowSample: projection.lowSample,
    lowSampleReasons: projection.lowSampleReasons,
    stats: toStatCells(projection.projections),
    recentSample: projection.recentSample,
    h2hSample: projection.h2hSample,
  };

  return { kind: "player", fixture: fixtureContext(rf, win), card };
}

export async function searchTeam(
  year: number,
  teamId: string,
): Promise<LegsSearchResult> {
  const [team, allTeams, allFixtures] = await Promise.all([
    getTeamById(teamId),
    getAllTeams(),
    getFixturesForYear(year).catch(() => [] as Fixture[]),
  ]);
  if (!team) return { kind: "empty" };

  const lookups = buildTeamLookups(allTeams);
  const next = nextFixtureForTeam(allFixtures, teamId, lookups);
  if (!next) return { kind: "empty" };

  const { resolved: rf, isHome } = next;
  const opponent = isHome ? rf.away : rf.home;
  const win = await winForFixture(year, rf);
  const teamWinProb = teamWinProbability(win.homeWinProb, isHome);

  const lineups = await getLatestLineupForTeams([teamId]);
  const pool = lineups.get(teamId) ?? [];
  const playerIds = pool.map((p) => p.playerId);

  const [recentByPlayer, h2hByPlayer] = await Promise.all([
    getRecentGamesForPlayers(playerIds, BASELINE_WINDOW),
    getHeadToHeadGamesForPlayers(playerIds, opponent.id, 3),
  ]);

  const rows: TeamTableRow[] = pool.map((player) =>
    toTeamTableRow(
      player,
      projectOne(
        player.playerId,
        recentByPlayer,
        h2hByPlayer,
        teamWinProb,
        win.source,
      ),
    ),
  );

  return {
    kind: "team",
    fixture: fixtureContext(rf, win),
    teamId,
    teamName: team.name,
    rows,
  };
}
