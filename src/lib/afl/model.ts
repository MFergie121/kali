// The kali v2 prediction model: an Elo rating backbone with situational
// adjustments, all expressed in rating points and summed before a single
// logistic conversion — so every prediction decomposes into contribution rows
// that visibly add up to the probability shown on the page.
//
// Pure module: no SvelteKit or DB imports. The live predictor (predictor.ts),
// the backtest harness (scripts/backtest-predictor.ts), and the unit tests all
// drive the same three calls:
//
//   const state = createModelState(params);
//   const pred  = predictGame(state, game);   // before the result is known
//   applyResult(state, result);               // after it is
//
// Matches must be applied in chronological order; season boundaries trigger
// regression to the mean. Only the most recent `historyYears` seasons feed the
// ratings (see buildModelState). Parameter defaults come from the backtest —
// see scripts/backtest-predictor.ts.

import { normalizeVenue, venueState, TEAM_STATES } from "./venues";

// ─── Parameters ─────────────────────────────────────────────────────────────────

export interface ModelParams {
  /**
   * Only matches from the most recent `historyYears` calendar years (relative
   * to the latest year in the input) feed the model. Enforced in
   * buildModelState so live syncs, backfills, and the backtest can't disagree.
   */
  historyYears: number;
  /** Elo starting rating for a team never seen before. */
  initialRating: number;
  /** Elo update speed. */
  k: number;
  /** Rating points added to the designated home side in every prediction. */
  homeAdvantage: number;
  /** Margin (points) at which a win counts as ~76% of a "full" result in Elo updates. */
  marginScale: number;
  /** Fraction of each rating regressed toward the mean at a season boundary. */
  seasonRegression: number;
  /** Points of predicted margin per rating point of total edge. */
  pointsPerElo: number;
  /** Rating points per point of recent net-margin differential (last formWindow games). */
  formWeight: number;
  formWindow: number;
  /** Rating points per unit of venue win-rate excess differential (excess in [-1, 1]). */
  venueWeight: number;
  /** Minimum games at a venue (last 3 years) before a venue record counts. */
  venueMinGames: number;
  /** Rating points subtracted from a team playing outside its home state. */
  travelPenalty: number;
  /** Rating points per day of rest differential (each side capped at restCap). */
  restWeight: number;
  restCap: number;
  /** Rating points per net win in the last h2hWindow meetings. */
  h2hWeight: number;
  h2hWindow: number;
}

// Tuned by scripts/backtest-predictor.ts (grid on 2000–2019, validated 2020–2025).
export const DEFAULT_PARAMS: ModelParams = {
  historyYears: 5,
  initialRating: 1500,
  k: 65,
  homeAdvantage: 38,
  marginScale: 38,
  seasonRegression: 0.3,
  pointsPerElo: 0.14,
  formWeight: 0.8,
  formWindow: 8,
  venueWeight: 20,
  venueMinGames: 3,
  travelPenalty: 40,
  restWeight: 0,
  restCap: 4,
  h2hWeight: 0,
  h2hWindow: 6,
};

// ─── Types ──────────────────────────────────────────────────────────────────────

/** A completed match, the model's only historical input. */
export interface MatchResult {
  year: number;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  venue: string | null;
  /** Raw date string in either footywire or ISO form; day precision is enough. */
  date: string | null;
}

/** An upcoming game to predict. */
export interface UpcomingGame {
  year: number;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  venue: string | null;
  date: string | null;
}

export type ContributionKey =
  | "rating"
  | "homeGround"
  | "form"
  | "venueRecord"
  | "travel"
  | "rest"
  | "h2h";

/** One row of the why-panel: rating points of edge, home-positive. */
export interface Contribution {
  key: ContributionKey;
  label: string;
  value: number;
}

export interface TeamSnapshot {
  elo: number;
  /** Elo after each of the team's games this season, oldest first. */
  eloHistory: number[];
  /** Results of the last 5 completed games, most recent first. */
  form: ("W" | "L" | "D")[];
  /** Average points for/against over the last formWindow games. */
  attack: number | null;
  defence: number | null;
  /** Win-loss record at the game's venue over the last 3 years, if known. */
  venueRecord: { wins: number; played: number } | null;
  restDays: number | null;
}

export interface GamePrediction {
  /** Home win probability, 0–100. */
  homeProbability: number;
  /** Expected margin in points, home-positive. */
  predictedMargin: number;
  /** Total rating edge (home-positive) that produced the probability. */
  totalEdge: number;
  contributions: Contribution[];
  home: TeamSnapshot;
  away: TeamSnapshot;
  /** Last h2hWindow meetings: wins from the current home side's perspective. */
  h2h: { homeWins: number; awayWins: number; draws: number };
}

// ─── Date parsing ───────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

/**
 * Parse either data source's date format to a UTC day timestamp:
 * footywire ("Friday, 28th March 2003") or Squiggle ("2026-03-05 19:30:00").
 * Returns null when unparseable — dependent factors simply switch off.
 */
export function parseMatchDate(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const wordy = raw.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/);
  if (wordy) {
    const month = MONTHS[wordy[2].toLowerCase()];
    if (month === undefined) return null;
    return Date.UTC(Number(wordy[3]), month, Number(wordy[1]));
  }
  return null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Elo primitives ─────────────────────────────────────────────────────────────

/** Expected home result for a rating edge, standard 400-based logistic. */
export function expectedResult(edge: number): number {
  return 1 / (1 + Math.pow(10, -edge / 400));
}

/**
 * Map a signed margin to a result in [0, 1] for Elo updates. Smooth
 * margin-of-victory handling: a draw is 0.5, a win by marginScale ≈ 0.88.
 */
export function marginToResult(margin: number, marginScale: number): number {
  return 0.5 * (1 + Math.tanh(margin / marginScale));
}

// ─── Model state ────────────────────────────────────────────────────────────────

interface TeamGame {
  dayTs: number | null;
  year: number;
  round: number;
  venueKey: string | null;
  opponentId: string;
  scored: number;
  conceded: number;
}

export interface ModelState {
  params: ModelParams;
  ratings: Map<string, number>;
  /** Elo after each game of the team's current season (reset at season change). */
  seasonEloHistory: Map<string, number[]>;
  games: Map<string, TeamGame[]>;
  currentYear: number | null;
}

export function createModelState(params: ModelParams = DEFAULT_PARAMS): ModelState {
  return {
    params,
    ratings: new Map(),
    seasonEloHistory: new Map(),
    games: new Map(),
    currentYear: null,
  };
}

function getRating(state: ModelState, teamId: string): number {
  return state.ratings.get(teamId) ?? state.params.initialRating;
}

function teamGames(state: ModelState, teamId: string): TeamGame[] {
  let arr = state.games.get(teamId);
  if (!arr) {
    arr = [];
    state.games.set(teamId, arr);
  }
  return arr;
}

function regressToMean(state: ModelState): void {
  const { initialRating, seasonRegression } = state.params;
  for (const [teamId, rating] of state.ratings) {
    state.ratings.set(teamId, rating + (initialRating - rating) * seasonRegression);
  }
  state.seasonEloHistory.clear();
}

/** Feed one completed match into the state. Must be called in chronological order. */
export function applyResult(state: ModelState, m: MatchResult): void {
  if (state.currentYear !== null && m.year > state.currentYear) {
    regressToMean(state);
  }
  state.currentYear = Math.max(state.currentYear ?? m.year, m.year);

  const { k, homeAdvantage, marginScale } = state.params;
  const homeRating = getRating(state, m.homeTeamId);
  const awayRating = getRating(state, m.awayTeamId);
  const expected = expectedResult(homeRating + homeAdvantage - awayRating);
  const actual = marginToResult(m.homeScore - m.awayScore, marginScale);
  const delta = k * (actual - expected);

  const newHome = homeRating + delta;
  const newAway = awayRating - delta;
  state.ratings.set(m.homeTeamId, newHome);
  state.ratings.set(m.awayTeamId, newAway);

  for (const [teamId, rating] of [
    [m.homeTeamId, newHome],
    [m.awayTeamId, newAway],
  ] as const) {
    let hist = state.seasonEloHistory.get(teamId);
    if (!hist) {
      hist = [];
      state.seasonEloHistory.set(teamId, hist);
    }
    hist.push(Math.round(rating));
  }

  const dayTs = parseMatchDate(m.date);
  const venueKey = normalizeVenue(m.venue);
  teamGames(state, m.homeTeamId).push({
    dayTs,
    year: m.year,
    round: m.round,
    venueKey,
    opponentId: m.awayTeamId,
    scored: m.homeScore,
    conceded: m.awayScore,
  });
  teamGames(state, m.awayTeamId).push({
    dayTs,
    year: m.year,
    round: m.round,
    venueKey,
    opponentId: m.homeTeamId,
    scored: m.awayScore,
    conceded: m.homeScore,
  });
}

// ─── Adjustment factors ─────────────────────────────────────────────────────────

function recentNetMargin(games: TeamGame[], window: number): number | null {
  if (games.length === 0) return null;
  const recent = games.slice(-window);
  const total = recent.reduce((s, g) => s + (g.scored - g.conceded), 0);
  return total / recent.length;
}

function attackDefence(
  games: TeamGame[],
  window: number,
): { attack: number | null; defence: number | null } {
  if (games.length === 0) return { attack: null, defence: null };
  const recent = games.slice(-window);
  return {
    attack: recent.reduce((s, g) => s + g.scored, 0) / recent.length,
    defence: recent.reduce((s, g) => s + g.conceded, 0) / recent.length,
  };
}

function venueRecord(
  games: TeamGame[],
  venueKey: string | null,
  year: number,
): { wins: number; played: number } | null {
  if (!venueKey) return null;
  const atVenue = games.filter((g) => g.venueKey === venueKey && g.year >= year - 3);
  if (atVenue.length === 0) return null;
  return {
    wins: atVenue.filter((g) => g.scored > g.conceded).length,
    played: atVenue.length,
  };
}

/** Win-rate excess vs the team's overall recent record, in [-1, 1]. */
function venueExcess(
  record: { wins: number; played: number } | null,
  games: TeamGame[],
  minGames: number,
): number {
  if (!record || record.played < minGames || games.length === 0) return 0;
  const overall =
    games.filter((g) => g.scored > g.conceded).length / games.length;
  return record.wins / record.played - overall;
}

function restDays(games: TeamGame[], gameDayTs: number | null): number | null {
  if (gameDayTs === null || games.length === 0) return null;
  const last = games[games.length - 1];
  if (last.dayTs === null) return null;
  const days = Math.round((gameDayTs - last.dayTs) / DAY_MS);
  // Off-season gaps and data glitches are not "rest": ignore implausible values.
  return days >= 1 && days <= 60 ? days : null;
}

function headToHead(
  state: ModelState,
  homeTeamId: string,
  awayTeamId: string,
): { homeWins: number; awayWins: number; draws: number } {
  const meetings = (state.games.get(homeTeamId) ?? [])
    .filter((g) => g.opponentId === awayTeamId)
    .slice(-state.params.h2hWindow);
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  for (const g of meetings) {
    if (g.scored > g.conceded) homeWins++;
    else if (g.scored < g.conceded) awayWins++;
    else draws++;
  }
  return { homeWins, awayWins, draws };
}

// ─── Prediction ─────────────────────────────────────────────────────────────────

function teamLabel(teamId: string): string {
  return teamId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function predictGame(state: ModelState, game: UpcomingGame): GamePrediction {
  const p = state.params;
  const homeGames = state.games.get(game.homeTeamId) ?? [];
  const awayGames = state.games.get(game.awayTeamId) ?? [];

  const homeElo = getRating(state, game.homeTeamId);
  const awayElo = getRating(state, game.awayTeamId);
  const venueKey = normalizeVenue(game.venue);
  const gameDayTs = parseMatchDate(game.date);

  const contributions: Contribution[] = [];

  // Rating edge — long-run team strength.
  contributions.push({
    key: "rating",
    label: "rating edge",
    value: homeElo - awayElo,
  });

  // Home ground advantage — constant for the designated home side.
  contributions.push({
    key: "homeGround",
    label: "home ground advantage",
    value: p.homeAdvantage,
  });

  // Recent scoring form beyond what the ratings have absorbed.
  const homeNet = recentNetMargin(homeGames, p.formWindow);
  const awayNet = recentNetMargin(awayGames, p.formWindow);
  contributions.push({
    key: "form",
    label: "recent scoring form",
    value:
      homeNet !== null && awayNet !== null ? (homeNet - awayNet) * p.formWeight : 0,
  });

  // Venue familiarity — record at this ground vs the team's own baseline.
  const homeVenueRec = venueRecord(homeGames, venueKey, game.year);
  const awayVenueRec = venueRecord(awayGames, venueKey, game.year);
  contributions.push({
    key: "venueRecord",
    label: "venue record",
    value:
      (venueExcess(homeVenueRec, homeGames, p.venueMinGames) -
        venueExcess(awayVenueRec, awayGames, p.venueMinGames)) *
      p.venueWeight,
  });

  // Interstate travel.
  const gameState = venueState(venueKey);
  let travel = 0;
  const travellers: string[] = [];
  if (gameState) {
    const homeState = TEAM_STATES[game.homeTeamId] ?? null;
    const awayState = TEAM_STATES[game.awayTeamId] ?? null;
    if (homeState && homeState !== gameState) {
      travel -= p.travelPenalty;
      travellers.push(teamLabel(game.homeTeamId));
    }
    if (awayState && awayState !== gameState) {
      travel += p.travelPenalty;
      travellers.push(teamLabel(game.awayTeamId));
    }
  }
  contributions.push({
    key: "travel",
    label:
      travellers.length > 0
        ? `travel (${travellers.join(" & ")} interstate)`
        : "travel",
    value: travel,
  });

  // Rest differential.
  const homeRest = restDays(homeGames, gameDayTs);
  const awayRest = restDays(awayGames, gameDayTs);
  contributions.push({
    key: "rest",
    label:
      homeRest !== null && awayRest !== null
        ? `rest (${homeRest} vs ${awayRest} days)`
        : "rest",
    value:
      homeRest !== null && awayRest !== null
        ? Math.max(-p.restCap, Math.min(p.restCap, homeRest - awayRest)) * p.restWeight
        : 0,
  });

  // Head-to-head recency.
  const h2h = headToHead(state, game.homeTeamId, game.awayTeamId);
  contributions.push({
    key: "h2h",
    label: `head-to-head (last ${h2h.homeWins + h2h.awayWins + h2h.draws})`,
    value: (h2h.homeWins - h2h.awayWins) * p.h2hWeight,
  });

  const totalEdge = contributions.reduce((s, c) => s + c.value, 0);
  const probability = expectedResult(totalEdge);

  const homeAttDef = attackDefence(homeGames, p.formWindow);
  const awayAttDef = attackDefence(awayGames, p.formWindow);

  const snapshot = (
    teamId: string,
    games: TeamGame[],
    attDef: { attack: number | null; defence: number | null },
    rec: { wins: number; played: number } | null,
    rest: number | null,
  ): TeamSnapshot => ({
    elo: Math.round(getRating(state, teamId)),
    eloHistory: state.seasonEloHistory.get(teamId) ?? [],
    form: games
      .slice(-5)
      .reverse()
      .map((g) => (g.scored > g.conceded ? "W" : g.scored < g.conceded ? "L" : "D")),
    attack: attDef.attack !== null ? Math.round(attDef.attack * 10) / 10 : null,
    defence: attDef.defence !== null ? Math.round(attDef.defence * 10) / 10 : null,
    venueRecord: rec,
    restDays: rest,
  });

  return {
    homeProbability: Math.round(probability * 1000) / 10,
    predictedMargin: Math.round(totalEdge * p.pointsPerElo),
    totalEdge: Math.round(totalEdge * 10) / 10,
    contributions: contributions.map((c) => ({
      ...c,
      value: Math.round(c.value * 10) / 10,
    })),
    home: snapshot(game.homeTeamId, homeGames, homeAttDef, homeVenueRec, homeRest),
    away: snapshot(game.awayTeamId, awayGames, awayAttDef, awayVenueRec, awayRest),
    h2h,
  };
}

// ─── Bulk build ─────────────────────────────────────────────────────────────────

/**
 * Chronological sort key for match rows. Day-level date when parseable,
 * falling back to (year, round) ordering.
 */
export function matchSortKey(m: MatchResult): number {
  const ts = parseMatchDate(m.date);
  // Year/round ordering dominates; date breaks ties within a round.
  return m.year * 1e12 + m.round * 1e9 + (ts !== null ? ts % 1e9 : 0);
}

/**
 * Fold a match history (any order) into a fresh model state. Only the most
 * recent `historyYears` calendar years of the input are used — older matches
 * are dropped before folding, so the ratings carry no trace of them.
 */
export function buildModelState(
  matches: MatchResult[],
  params: ModelParams = DEFAULT_PARAMS,
): ModelState {
  const state = createModelState(params);
  let maxYear = -Infinity;
  for (const m of matches) if (m.year > maxYear) maxYear = m.year;
  const ordered = matches
    .filter((m) => m.year > maxYear - params.historyYears)
    .sort((a, b) => matchSortKey(a) - matchSortKey(b));
  for (const m of ordered) applyResult(state, m);
  return state;
}
