// Orchestration for the kali v2 prediction model: loads match history from the
// DB, drives the pure model in model.ts, and owns the sync / settle / backfill
// pipelines that the admin endpoints (and cron) call. The model itself — Elo
// backbone plus situational adjustments — lives entirely in model.ts so the
// backtest harness and unit tests exercise the exact code that runs here.
//
// v2 is independent of Squiggle: tipster consensus is fetched and stored per
// prediction as a benchmark to grade ourselves against, but it never enters
// the probability.

import { db } from "$lib/db/afl";
import { matches } from "$lib/db/afl/schema";
import { fixtures as fixturesTable } from "$lib/db/afl/schema";
import type { Fixture, Team } from "$lib/db/afl/schema";
import {
  getAllTeams,
  getFixturesForYear,
  getTipsForRound,
  updatePredictionOutcomes,
  upsertFixtures,
  upsertPredictions,
} from "$lib/db/afl/service";
import { fetchSeasonFixture, getUpcomingRound } from "$lib/afl/squiggle";
import {
  buildModelState,
  DEFAULT_PARAMS,
  predictGame,
  type Contribution,
  type MatchResult,
  type TeamSnapshot,
} from "$lib/afl/model";
import { and, asc, eq, gte, lt, or, sql } from "drizzle-orm";

export const MODEL_VERSION = "v2";
export const MAX_ROUND = 28;

// ─── Stored shapes (jsonb payloads on the predictions table) ────────────────────

/** `factors` jsonb: the why-panel. Contribution values are rating points, home-positive. */
export interface PredictionFactors {
  totalEdge: number;
  contributions: Contribution[];
  h2h: { homeWins: number; awayWins: number; draws: number };
}

/** `home_breakdown` / `away_breakdown` jsonb: per-team context at compute time. */
export type PredictionTeamBreakdown = TeamSnapshot;

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
  predictedMargin: number;
  squiggleConsensus: number | null;
  factors: PredictionFactors;
  homeBreakdown: PredictionTeamBreakdown;
  awayBreakdown: PredictionTeamBreakdown;
}

// ─── Team name resolution (Squiggle fixture names → team ids) ───────────────────

// Squiggle uses different names than footywire for some teams
const TEAM_NAME_ALIASES: Record<string, string> = {
  "brisbane lions": "brisbane",
  "greater western sydney": "gws",
  "gws giants": "gws",
};

export type TeamLookups = { nameMap: Map<string, Team>; teams: Team[] };

// Exported for reuse by the Legs orchestration: these are the only bridge
// between Squiggle fixture names and match/stat team ids.
export function buildTeamLookups(allTeams: Team[]): TeamLookups {
  const nameMap = new Map<string, Team>();
  // shortName is intentionally not used as a lookup key: nameToTeamInfo derives
  // it from the last word of the full name, so "Melbourne" and "North Melbourne"
  // both produce shortName "Melbourne" (and Sydney / GWS likewise collide).
  for (const t of allTeams) {
    nameMap.set(t.name.toLowerCase(), t);
    nameMap.set(t.id, t);
  }
  return { nameMap, teams: allTeams };
}

export function resolveTeam(
  name: string | null,
  lookups: TeamLookups,
): Team | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  const aliased = TEAM_NAME_ALIASES[lower];
  if (aliased) {
    const byAlias = lookups.nameMap.get(aliased);
    if (byAlias) return byAlias;
  }
  const direct = lookups.nameMap.get(lower);
  if (direct) return direct;
  const slug = lower.replace(/\s+/g, "-");
  const bySlug = lookups.nameMap.get(slug);
  if (bySlug) return bySlug;
  for (const t of lookups.teams) {
    const tName = t.name.toLowerCase();
    if (tName.length > 0 && (tName.startsWith(lower) || lower.startsWith(tName))) return t;
  }
  const lowerWords = lower.split(/\s+/).filter((w) => w.length > 3);
  if (lowerWords.length > 0) {
    for (const t of lookups.teams) {
      const tWords = t.name.toLowerCase().split(/\s+/);
      if (lowerWords.some((w) => tWords.includes(w))) return t;
    }
  }
  return null;
}

// ─── Compute ────────────────────────────────────────────────────────────────────

/**
 * Completed matches feeding the model, optionally cut off before a given
 * (year, round) for point-in-time backfills. Only the model's history window
 * is loaded; the query bound is one year looser than `historyYears` because
 * the exact trim lives in buildModelState (keyed to the latest year actually
 * present, e.g. a pre-season backfill whose newest match is last season's).
 */
async function loadCompletedMatches(
  refYear: number,
  upTo?: {
    year: number;
    round: number;
  },
): Promise<MatchResult[]> {
  const completed = and(
    sql`${matches.homeScore} IS NOT NULL`,
    sql`${matches.awayScore} IS NOT NULL`,
    gte(matches.year, refYear - DEFAULT_PARAMS.historyYears),
  );
  const where = upTo
    ? and(
        completed,
        or(
          lt(matches.year, upTo.year),
          and(eq(matches.year, upTo.year), lt(matches.round, upTo.round)),
        ),
      )
    : completed;

  const rows = await db
    .select({
      year: matches.year,
      round: matches.round,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      venue: matches.venue,
      date: matches.date,
    })
    .from(matches)
    .where(where);

  return rows.map((r) => ({
    ...r,
    homeScore: r.homeScore!,
    awayScore: r.awayScore!,
    venue: r.venue || null,
    date: r.date || null,
  }));
}

/** Average Squiggle tipster home-confidence per game id for a round. */
async function loadConsensus(year: number, round: number): Promise<Map<number, number>> {
  const consensus = new Map<number, number>();
  let roundTips: Awaited<ReturnType<typeof getTipsForRound>> = [];
  try {
    roundTips = await getTipsForRound(year, round);
  } catch {
    // tips table may be empty
  }
  const groups = new Map<number, number[]>();
  for (const tip of roundTips) {
    if (!groups.has(tip.gameId)) groups.set(tip.gameId, []);
    groups.get(tip.gameId)!.push(tip.hconfidence);
  }
  for (const [gameId, confs] of groups) {
    consensus.set(gameId, confs.reduce((a, b) => a + b, 0) / confs.length);
  }
  return consensus;
}

export interface ComputeOptions {
  /** Cut match history off before this round (point-in-time backfills). */
  pointInTime?: boolean;
  /** Skip the Squiggle consensus benchmark lookup. */
  skipTips?: boolean;
}

/**
 * Compute v2 predictions for one round of a year's fixture. Pure model on top
 * of DB-loaded history; returns storable games (empty when fixtures are
 * missing or team names can't be resolved).
 */
export async function computeRoundPredictions(
  year: number,
  round: number,
  opts: ComputeOptions = {},
): Promise<PredictionGame[]> {
  const [allTeams, allFixtures, history, consensus] = await Promise.all([
    getAllTeams(),
    getFixturesForYear(year).catch(() => [] as Fixture[]),
    loadCompletedMatches(year, opts.pointInTime ? { year, round } : undefined),
    opts.skipTips ? Promise.resolve(new Map<number, number>()) : loadConsensus(year, round),
  ]);

  const roundFixtures = allFixtures.filter(
    (f) => f.round === round && f.hteam != null && f.ateam != null,
  );
  if (roundFixtures.length === 0) return [];

  const state = buildModelState(history);
  const lookups = buildTeamLookups(allTeams);
  const games: PredictionGame[] = [];

  for (const fixture of roundFixtures) {
    const home = resolveTeam(fixture.hteam, lookups);
    const away = resolveTeam(fixture.ateam, lookups);
    if (!home || !away) {
      console.warn(
        `[predictor] Could not resolve teams: "${fixture.hteam}" => ${home?.id ?? "MISSING"}, "${fixture.ateam}" => ${away?.id ?? "MISSING"}`,
      );
      continue;
    }

    const pred = predictGame(state, {
      year,
      round,
      homeTeamId: home.id,
      awayTeamId: away.id,
      venue: fixture.venue,
      date: fixture.date,
    });

    const conf = consensus.get(fixture.id);
    games.push({
      fixtureId: fixture.id,
      round,
      date: fixture.date,
      venue: fixture.venue,
      homeTeam: fixture.hteam ?? "TBD",
      awayTeam: fixture.ateam ?? "TBD",
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeProbability: pred.homeProbability,
      awayProbability: Math.round((100 - pred.homeProbability) * 10) / 10,
      predictedMargin: pred.predictedMargin,
      squiggleConsensus: conf != null ? Math.round(conf) : null,
      factors: {
        totalEdge: pred.totalEdge,
        contributions: pred.contributions,
        h2h: pred.h2h,
      },
      homeBreakdown: pred.home,
      awayBreakdown: pred.away,
    });
  }

  return games;
}

// ─── Pipelines (called by admin endpoints and cron) ─────────────────────────────

export interface SyncPredictionsResult {
  round: number | null;
  count: number;
  message?: string;
}

/** Predict the given round (or the upcoming one) and upsert under MODEL_VERSION. */
export async function syncPredictionsPipeline(
  year: number,
  round?: number,
): Promise<SyncPredictionsResult> {
  let target = round ?? null;
  if (target == null) {
    const allFixtures = await getFixturesForYear(year);
    target = getUpcomingRound(allFixtures);
  }
  if (target == null) {
    return { round: null, count: 0, message: "No upcoming round found" };
  }

  const games = await computeRoundPredictions(year, target);
  if (games.length === 0) {
    return { round: target, count: 0, message: "No fixtures for round" };
  }
  await upsertPredictions(games, year, target, MODEL_VERSION);
  return { round: target, count: games.length };
}

export interface SettlePredictionsResult {
  fixturesRefreshed: number;
  settled: number;
}

/** Refresh fixture results from Squiggle, then settle any completed predictions. */
export async function settlePredictionsPipeline(
  year: number,
): Promise<SettlePredictionsResult> {
  const games = await fetchSeasonFixture(year);
  await upsertFixtures(games);
  const settled = await updatePredictionOutcomes(year);
  return { fixturesRefreshed: games.length, settled };
}

export interface BackfillSummary {
  rounds: { round: number; count: number }[];
  total: number;
}

/**
 * Recompute predictions for a span of rounds with point-in-time history —
 * each round sees only matches played before it, exactly like a live sync
 * would have. Tips are skipped for rounds that had already started (their
 * consensus is still stored when present, matching what live syncs capture).
 */
export async function backfillPredictionsPipeline(
  year: number,
  opts: { fromRound?: number; toRound?: number; modelVersion?: string; skipTips?: boolean } = {},
): Promise<BackfillSummary> {
  const allFixtures = await getFixturesForYear(year);
  if (allFixtures.length === 0) return { rounds: [], total: 0 };

  const allRounds = [...new Set(allFixtures.map((f) => f.round))].sort((a, b) => a - b);
  const from = opts.fromRound ?? allRounds[0];
  const to = opts.toRound ?? allRounds[allRounds.length - 1];
  const version = opts.modelVersion ?? MODEL_VERSION;

  const summary: BackfillSummary = { rounds: [], total: 0 };
  for (const round of allRounds.filter((r) => r >= from && r <= to)) {
    const games = await computeRoundPredictions(year, round, {
      pointInTime: true,
      skipTips: opts.skipTips,
    });
    if (games.length > 0) {
      await upsertPredictions(games, year, round, version);
    }
    summary.rounds.push({ round, count: games.length });
    summary.total += games.length;
  }
  return summary;
}

// ─── Available rounds helper (used by page) ────────────────────────────────────

export async function getAvailableRounds(year: number): Promise<number[]> {
  const rows = await db
    .selectDistinct({ round: fixturesTable.round })
    .from(fixturesTable)
    .where(eq(fixturesTable.year, year))
    .orderBy(asc(fixturesTable.round));
  return rows.map((r) => r.round);
}
