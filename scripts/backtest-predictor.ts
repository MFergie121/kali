/**
 * Walk-forward backtest for the kali v2 prediction model.
 *
 * Replays every completed match chronologically: predict, score, then feed the
 * result into the model — no future leakage. Parameters are tuned on
 * 2000–2019 (evaluated from 2003 to give the ratings a warm-up) and validated
 * on held-out 2020–2025. Reported numbers are honest out-of-sample.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/backtest-predictor.ts                  # report with current DEFAULT_PARAMS
 *   npx tsx --env-file=.env scripts/backtest-predictor.ts --tune           # coordinate-descent parameter search
 *   npx tsx --env-file=.env scripts/backtest-predictor.ts --write-artifact # also write src/lib/afl/model-performance.json
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import {
  applyResult,
  buildModelState,
  DEFAULT_PARAMS,
  matchSortKey,
  predictGame,
  type MatchResult,
  type ModelParams,
} from "../src/lib/afl/model";

const TUNE_YEARS = { from: 2003, to: 2019 }; // 2000–2002 warm the ratings up
const VALIDATION_YEARS = { from: 2020, to: 2025 };

// ─── Data ───────────────────────────────────────────────────────────────────────

async function loadMatches(): Promise<MatchResult[]> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (run with --env-file=.env)");
    process.exit(1);
  }
  const sql = postgres(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT year, round, home_team_id, away_team_id, home_score, away_score, venue, date
    FROM matches
    WHERE home_score IS NOT NULL AND away_score IS NOT NULL
  `;
  await sql.end();
  return rows.map((r) => ({
    year: r.year as number,
    round: r.round as number,
    homeTeamId: r.home_team_id as string,
    awayTeamId: r.away_team_id as string,
    homeScore: r.home_score as number,
    awayScore: r.away_score as number,
    venue: (r.venue as string) || null,
    date: (r.date as string) || null,
  }));
}

// ─── Walk-forward evaluation ────────────────────────────────────────────────────

interface SeasonMetrics {
  year: number;
  games: number;
  /** Decided games only (draws excluded from the denominator). */
  accuracy: number;
  brier: number;
  marginMae: number;
  /** "Home team always wins" baseline accuracy on the same games. */
  homeBaselineAccuracy: number;
}

interface EvalResult {
  seasons: SeasonMetrics[];
  overall: Omit<SeasonMetrics, "year">;
}

function summarise(
  rows: { p: number; margin: number; actualMargin: number }[],
): Omit<SeasonMetrics, "year"> {
  let correct = 0;
  let decided = 0;
  let homeBaseline = 0;
  let brierSum = 0;
  let maeSum = 0;
  for (const r of rows) {
    const outcome =
      r.actualMargin > 0 ? 1 : r.actualMargin < 0 ? 0 : 0.5;
    brierSum += (r.p - outcome) ** 2;
    maeSum += Math.abs(r.margin - r.actualMargin);
    if (r.actualMargin !== 0) {
      decided++;
      if ((r.p >= 0.5 && r.actualMargin > 0) || (r.p < 0.5 && r.actualMargin < 0)) correct++;
      if (r.actualMargin > 0) homeBaseline++;
    }
  }
  return {
    games: rows.length,
    accuracy: decided > 0 ? correct / decided : 0,
    brier: rows.length > 0 ? brierSum / rows.length : 0,
    marginMae: rows.length > 0 ? maeSum / rows.length : 0,
    homeBaselineAccuracy: decided > 0 ? homeBaseline / decided : 0,
  };
}

function runBacktest(
  matches: MatchResult[],
  params: ModelParams,
  evalFrom: number,
  evalTo: number,
): EvalResult {
  const perSeason = new Map<number, { p: number; margin: number; actualMargin: number }[]>();

  // Rebuild the model state per evaluated season so each season is predicted
  // with exactly the history window a live sync would have had (buildModelState
  // trims the input to the most recent `historyYears` seasons itself).
  for (let year = evalFrom; year <= evalTo; year++) {
    const state = buildModelState(
      matches.filter((m) => m.year < year),
      params,
    );
    const rows: { p: number; margin: number; actualMargin: number }[] = [];
    for (const m of matches) {
      if (m.year !== year) continue;
      const pred = predictGame(state, m);
      rows.push({
        p: pred.homeProbability / 100,
        margin: pred.predictedMargin,
        actualMargin: m.homeScore - m.awayScore,
      });
      applyResult(state, m);
    }
    perSeason.set(year, rows);
  }

  const seasons: SeasonMetrics[] = [...perSeason.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, rows]) => ({ year, ...summarise(rows) }));
  const all = [...perSeason.values()].flat();
  return { seasons, overall: summarise(all) };
}

// ─── Tuning (coordinate descent on tune-window Brier) ──────────────────────────

const SEARCH_SPACE: Partial<Record<keyof ModelParams, number[]>> = {
  k: [40, 52, 65, 75, 90],
  homeAdvantage: [28, 38, 45, 55, 70],
  marginScale: [26, 30, 34, 38, 46],
  seasonRegression: [0.1, 0.2, 0.3, 0.4, 0.55],
  formWeight: [0, 0.3, 0.45, 0.6, 0.8, 1.1],
  venueWeight: [0, 20, 32, 45, 60, 80],
  travelPenalty: [0, 14, 22, 30, 40, 55],
  restWeight: [0, 0.8, 1.5, 2.5],
  h2hWeight: [0, 1, 2, 4],
};

function tune(matches: MatchResult[], start: ModelParams): ModelParams {
  let best = { ...start };
  let bestBrier = runBacktest(matches, best, TUNE_YEARS.from, TUNE_YEARS.to).overall.brier;
  console.log(`tune start: brier ${bestBrier.toFixed(4)} (2003–2019)`);

  for (let sweep = 1; sweep <= 3; sweep++) {
    let improved = false;
    for (const [key, values] of Object.entries(SEARCH_SPACE) as [keyof ModelParams, number[]][]) {
      for (const v of values) {
        if (v === best[key]) continue;
        const candidate = { ...best, [key]: v };
        const brier = runBacktest(matches, candidate, TUNE_YEARS.from, TUNE_YEARS.to).overall.brier;
        if (brier < bestBrier - 1e-6) {
          bestBrier = brier;
          best = candidate;
          improved = true;
          console.log(`  sweep ${sweep}: ${key}=${v} → brier ${brier.toFixed(4)}`);
        }
      }
    }
    if (!improved) break;
  }

  // pointsPerElo only affects margins — fit it last by minimising tune-window MAE.
  let bestMae = Infinity;
  for (let ppe = 0.08; ppe <= 1.2; ppe += 0.02) {
    const candidate = { ...best, pointsPerElo: Math.round(ppe * 100) / 100 };
    const mae = runBacktest(matches, candidate, TUNE_YEARS.from, TUNE_YEARS.to).overall.marginMae;
    if (mae < bestMae) {
      bestMae = mae;
      best.pointsPerElo = candidate.pointsPerElo;
    }
  }
  console.log(`  pointsPerElo=${best.pointsPerElo} → margin MAE ${bestMae.toFixed(2)}`);
  console.log("tuned params:", JSON.stringify(best, null, 2));
  return best;
}

// ─── Reporting ──────────────────────────────────────────────────────────────────

function printTable(title: string, result: EvalResult): void {
  console.log(`\n${title}`);
  console.log("  season  games  acc%   brier   margin-MAE  home-baseline%");
  for (const s of result.seasons) {
    console.log(
      `  ${s.year}    ${String(s.games).padStart(3)}   ${(s.accuracy * 100).toFixed(1)}   ${s.brier.toFixed(4)}  ${s.marginMae.toFixed(1)}        ${(s.homeBaselineAccuracy * 100).toFixed(1)}`,
    );
  }
  const o = result.overall;
  console.log(
    `  ALL     ${String(o.games).padStart(4)}  ${(o.accuracy * 100).toFixed(1)}   ${o.brier.toFixed(4)}  ${o.marginMae.toFixed(1)}        ${(o.homeBaselineAccuracy * 100).toFixed(1)}`,
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────────

const matches = (await loadMatches()).sort((a, b) => matchSortKey(a) - matchSortKey(b));
console.log(`${matches.length} completed matches loaded (${matches[0]?.year}–${matches[matches.length - 1]?.year})`);

let params: ModelParams = { ...DEFAULT_PARAMS };
if (process.argv.includes("--tune")) {
  params = tune(matches, params);
  console.log(
    "\nPaste into DEFAULT_PARAMS in src/lib/afl/model.ts if validation looks good.",
  );
}

const tuneResult = runBacktest(matches, params, TUNE_YEARS.from, TUNE_YEARS.to);
console.log(
  `\nTUNE WINDOW 2003–2019: acc ${(tuneResult.overall.accuracy * 100).toFixed(1)}% · brier ${tuneResult.overall.brier.toFixed(4)} · MAE ${tuneResult.overall.marginMae.toFixed(1)}`,
);

const validation = runBacktest(matches, params, VALIDATION_YEARS.from, VALIDATION_YEARS.to);
printTable("VALIDATION (held-out 2020–2025)", validation);

if (process.argv.includes("--write-artifact")) {
  const artifact = {
    generatedAt: new Date().toISOString().slice(0, 10),
    modelVersion: "v2",
    tunedOn: "2000–2019 (evaluated 2003–2019)",
    validatedOn: "2020–2025 (held out)",
    params,
    seasons: runBacktest(matches, params, TUNE_YEARS.from, VALIDATION_YEARS.to).seasons.map(
      (s) => ({
        year: s.year,
        games: s.games,
        accuracy: Math.round(s.accuracy * 1000) / 10,
        brier: Math.round(s.brier * 10000) / 10000,
        marginMae: Math.round(s.marginMae * 10) / 10,
        homeBaselineAccuracy: Math.round(s.homeBaselineAccuracy * 1000) / 10,
      }),
    ),
  };
  const out = join(
    dirname(fileURLToPath(import.meta.url)),
    "../src/lib/afl/model-performance.json",
  );
  writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n");
  console.log(`\nwrote ${out}`);
}
