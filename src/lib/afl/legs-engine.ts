// Pure prediction engine for the Legs page: given plain game histories, tipster
// rows and a win probability it returns expected stat values, conservative
// "safe" lines and the showcase deviation ranking. No SvelteKit, DB or network
// imports — the orchestration layer (server-only) loads the data and drives the
// three entry points here, and the unit tests exercise this exact code.
//
// All tuning constants live here as single definitions: they came from user
// preference, not fitting, and are expected to be tweaked.

// ─── Stats ─────────────────────────────────────────────────────────────────────

/** The 8 stats projected on a player card, in display order. */
export const STAT_KEYS = [
  "tackles",
  "marks",
  "goals",
  "disposals",
  "kicks",
  "handballs",
  "clearances",
  "fantasyPoints",
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

/** Stats that drive the "unusual day" showcase ranking (and its per-stat filter). */
export const SHOWCASE_STAT_KEYS = [
  "tackles",
  "disposals",
  "marks",
  "goals",
  "fantasyPoints",
] as const;
export type ShowcaseStatKey = (typeof SHOWCASE_STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  tackles: "Tackles",
  marks: "Marks",
  goals: "Goals",
  disposals: "Disposals",
  kicks: "Kicks",
  handballs: "Handballs",
  clearances: "Clearances",
  fantasyPoints: "Fantasy",
};

// ─── Tuning constants ──────────────────────────────────────────────────────────

/** Blend of recent form and head-to-head history. */
export const BLEND = {
  /** Games taken from the player's recent form (newest first). */
  recentWindow: 4,
  /** Games taken from the player's history against the upcoming opponent. */
  h2hWindow: 3,
  /** Weight on recent form. Recent and h2h count equally. */
  recentWeight: 0.5,
  /** Weight on head-to-head. */
  h2hWeight: 0.5,
} as const;

/** Win-adjustment strength. k=0.14 ⇒ ±7% at certainty (prob 0 or 1). */
export const WIN_ADJ_K = 0.14;

/** Games behind the showcase "average" baseline. */
export const BASELINE_WINDOW = 10;

/** Players below this many career games are excluded from the showcase. */
export const MIN_CAREER_GAMES = 5;

/** Rows shown in the showcase. */
export const SHOWCASE_SIZE = 10;

// ─── Shared shapes ─────────────────────────────────────────────────────────────

/** The eight projected stats for a single completed game. */
export interface StatLine {
  tackles: number;
  marks: number;
  goals: number;
  disposals: number;
  kicks: number;
  handballs: number;
  clearances: number;
  fantasyPoints: number;
}

/** A completed game a projection was sampled from (shown in the card's detail). */
export interface SampledGame extends StatLine {
  matchId: number;
  year: number;
  round: number;
  opponentTeamId: string | null;
  opponentShortName: string | null;
  isHome: boolean | null;
  date: string | null;
}

export type WinSource = "tipster" | "model" | "neutral";

export interface WinProbability {
  /** Home-team win probability, 0–1. */
  homeWinProb: number;
  source: WinSource;
}

export type LowSampleReason = "few-recent" | "no-h2h";

export interface StatProjection {
  stat: StatKey;
  /** Expected value (win-adjusted blend), one decimal. */
  expected: number;
  /** Conservative over line cleared across the whole sample, win-adjusted + floored. */
  safeLine: number;
}

export interface PlayerProjection {
  projections: StatProjection[];
  /** Subject team's win probability actually used, 0–1. */
  teamWinProb: number;
  winSource: WinSource;
  lowSample: boolean;
  lowSampleReasons: LowSampleReason[];
  /** The up-to-4 recent games used in the blend (newest first). */
  recentSample: SampledGame[];
  /** The up-to-3 head-to-head games used in the blend (newest first). */
  h2hSample: SampledGame[];
}

// ─── Small numeric helpers ─────────────────────────────────────────────────────

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/**
 * Multiplier applied to an expected stat given the subject team's win
 * probability. Stats rise with a likely win; tackles invert (the side under
 * pressure lays more). Bounded to ±(WIN_ADJ_K/2) because prob ∈ [0, 1].
 */
export function winMultiplier(teamWinProb: number, invert: boolean): number {
  const delta = clamp01(teamWinProb) - 0.5;
  return 1 + (invert ? -1 : 1) * WIN_ADJ_K * delta;
}

/** Convert a home-win probability to the subject team's win probability. */
export function teamWinProbability(homeWinProb: number, isHome: boolean): number {
  return isHome ? clamp01(homeWinProb) : clamp01(1 - homeWinProb);
}

/** Relative deviation with a clamped denominator so small baselines don't blow up. */
export function relativeDeviation(predicted: number, average: number): number {
  return (predicted - average) / Math.max(average, 1);
}

// ─── Player projection ─────────────────────────────────────────────────────────

function dedupeByMatch(games: SampledGame[]): SampledGame[] {
  const seen = new Set<number>();
  const out: SampledGame[] = [];
  for (const g of games) {
    if (seen.has(g.matchId)) continue;
    seen.add(g.matchId);
    out.push(g);
  }
  return out;
}

/**
 * Project the eight stats for one player against their upcoming opponent.
 *
 * expected = winMultiplier × (0.5 · mean(last 4 games) + 0.5 · mean(last 3 vs
 * opponent)). With no head-to-head history the blend collapses to 100% recent
 * form; with fewer than 4 recent games it uses what exists (minimum 1). Both
 * fallbacks flag the result low-sample.
 *
 * safeLine = floor(winMultiplier × min(stat across the deduplicated union of
 * sampled games)) — an over line cleared in every sampled game, then nudged by
 * the predicted game state.
 */
export function predictPlayer(input: {
  /** Player's most recent completed games, newest first (at least 1). */
  recentGames: SampledGame[];
  /** Player's completed games vs the upcoming opponent, newest first. */
  h2hGames: SampledGame[];
  win: { teamWinProb: number; source: WinSource };
}): PlayerProjection {
  const recent = input.recentGames.slice(0, BLEND.recentWindow);
  const h2h = input.h2hGames.slice(0, BLEND.h2hWindow);
  const union = dedupeByMatch([...recent, ...h2h]);

  const lowSampleReasons: LowSampleReason[] = [];
  if (recent.length < BLEND.recentWindow) lowSampleReasons.push("few-recent");
  if (h2h.length === 0) lowSampleReasons.push("no-h2h");

  const projections: StatProjection[] = STAT_KEYS.map((stat) => {
    const invert = stat === "tackles";
    const mult = winMultiplier(input.win.teamWinProb, invert);

    const recentMean = mean(recent.map((g) => g[stat]));
    const base =
      h2h.length > 0
        ? BLEND.recentWeight * recentMean + BLEND.h2hWeight * mean(h2h.map((g) => g[stat]))
        : recentMean;

    const minValue = union.length > 0 ? Math.min(...union.map((g) => g[stat])) : 0;

    return {
      stat,
      expected: round1(base * mult),
      safeLine: Math.max(0, Math.floor(minValue * mult)),
    };
  });

  return {
    projections,
    teamWinProb: clamp01(input.win.teamWinProb),
    winSource: input.win.source,
    lowSample: lowSampleReasons.length > 0,
    lowSampleReasons,
    recentSample: recent,
    h2hSample: h2h,
  };
}

// ─── Showcase deviation ranking ────────────────────────────────────────────────

export interface DeviationCandidate {
  playerId: number;
  careerGames: number;
  /** Projected value for each showcase stat (from predictPlayer). */
  predicted: Record<ShowcaseStatKey, number>;
  /** BASELINE_WINDOW-game average for each showcase stat. */
  average: Record<ShowcaseStatKey, number>;
}

export interface ShowcaseRanking {
  playerId: number;
  stat: ShowcaseStatKey;
  predicted: number;
  average: number;
  /** Signed relative deviation (predicted vs average). */
  deviation: number;
  direction: "up" | "down";
}

/**
 * Rank players by how far their projection deviates from their own baseline.
 * One entry per player, players below MIN_CAREER_GAMES excluded, ranked by
 * absolute deviation descending, top `size` returned.
 *
 * With `filterStat` set, ranks by that stat's deviation alone. Otherwise each
 * player is represented by their single largest absolute deviation across the
 * featured stats (SHOWCASE_STAT_KEYS).
 */
export function rankShowcase(
  candidates: DeviationCandidate[],
  filterStat: ShowcaseStatKey | null = null,
  size = SHOWCASE_SIZE,
): ShowcaseRanking[] {
  const stats = filterStat ? [filterStat] : SHOWCASE_STAT_KEYS;
  const rankings: ShowcaseRanking[] = [];

  for (const c of candidates) {
    if (c.careerGames < MIN_CAREER_GAMES) continue;

    let best: ShowcaseRanking | null = null;
    for (const stat of stats) {
      const deviation = relativeDeviation(c.predicted[stat], c.average[stat]);
      if (best === null || Math.abs(deviation) > Math.abs(best.deviation)) {
        best = {
          playerId: c.playerId,
          stat,
          predicted: c.predicted[stat],
          average: c.average[stat],
          deviation,
          direction: deviation >= 0 ? "up" : "down",
        };
      }
    }
    if (best) rankings.push(best);
  }

  rankings.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
  return rankings.slice(0, size);
}

// ─── Win probability sourcing ──────────────────────────────────────────────────

export interface TipSnapshot {
  source: string;
  /** Home-team win confidence, 0–100. */
  hconfidence: number;
  /** ISO timestamp; used to keep only the latest snapshot per source. */
  syncedAt: string;
}

/**
 * Squiggle tipster consensus as a home-win probability (0–1), or null if there
 * are no tips. Deduplicated to the latest snapshot per source before averaging,
 * so a re-synced round doesn't double-count tipsters.
 */
export function tipsterConsensus(tips: TipSnapshot[]): number | null {
  if (tips.length === 0) return null;

  const latestBySource = new Map<string, TipSnapshot>();
  for (const tip of tips) {
    const existing = latestBySource.get(tip.source);
    if (!existing || tip.syncedAt > existing.syncedAt) {
      latestBySource.set(tip.source, tip);
    }
  }

  const confidences = [...latestBySource.values()].map((t) => t.hconfidence);
  return clamp01(mean(confidences) / 100);
}

/**
 * Home-win probability used for the win adjustment, sourced in order:
 * tipster consensus → in-house model (stored per-mille, normalised) → neutral.
 */
export function resolveWinProbability(
  tipsterProb: number | null,
  modelHomeProbPerMille: number | null,
): WinProbability {
  if (tipsterProb !== null) {
    return { homeWinProb: clamp01(tipsterProb), source: "tipster" };
  }
  if (modelHomeProbPerMille !== null) {
    return { homeWinProb: clamp01(modelHomeProbPerMille / 1000), source: "model" };
  }
  return { homeWinProb: 0.5, source: "neutral" };
}
