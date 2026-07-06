import { resolveDefaultRound } from "$lib/afl/squiggle";
import { MAX_ROUND, MODEL_VERSION } from "$lib/afl/predictor";
import backtest from "$lib/afl/model-performance.json";
import {
  getFixturesForYear,
  getPredictionsForRound,
  getSeasonPredictionRows,
  type PredictionRow,
  type SeasonPredictionRow,
} from "$lib/db/afl/service";
import type { PageServerLoad } from "./$types";

export type { PredictionRow };

export interface RoundAccuracy {
  round: number;
  hits: number;
  decided: number;
}

/** Season-to-date model grading shown in the scoreboard strip. */
export interface Scoreboard {
  decided: number;
  hits: number;
  accuracy: number | null;
  brier: number | null;
  marginMae: number | null;
  /** Model vs tipster-consensus accuracy on the games both called. */
  benchmark: { games: number; modelHits: number; tipsterHits: number } | null;
  rounds: RoundAccuracy[];
}

function computeScoreboard(rows: SeasonPredictionRow[]): Scoreboard {
  let hits = 0;
  let decided = 0;
  let brierSum = 0;
  let brierGames = 0;
  let maeSum = 0;
  let maeGames = 0;
  let benchGames = 0;
  let benchModel = 0;
  let benchTipster = 0;
  const byRound = new Map<number, RoundAccuracy>();

  for (const r of rows) {
    if (r.actualWinner === null) continue;
    const outcome =
      r.actualWinner === "home" ? 1 : r.actualWinner === "away" ? 0 : 0.5;
    brierSum += (r.homeProbability / 100 - outcome) ** 2;
    brierGames++;
    if (r.predictedMargin !== null && r.actualMargin !== null) {
      maeSum += Math.abs(r.predictedMargin - r.actualMargin);
      maeGames++;
    }
    if (r.actualWinner === "home" || r.actualWinner === "away") {
      decided++;
      const modelRight = (r.homeProbability >= 50) === (r.actualWinner === "home");
      if (modelRight) hits++;
      let entry = byRound.get(r.round);
      if (!entry) {
        entry = { round: r.round, hits: 0, decided: 0 };
        byRound.set(r.round, entry);
      }
      entry.decided++;
      if (modelRight) entry.hits++;
      if (r.squiggleConsensus !== null) {
        benchGames++;
        if (modelRight) benchModel++;
        if ((r.squiggleConsensus >= 50) === (r.actualWinner === "home")) benchTipster++;
      }
    }
  }

  return {
    decided,
    hits,
    accuracy: decided > 0 ? Math.round((hits / decided) * 1000) / 10 : null,
    brier: brierGames > 0 ? Math.round((brierSum / brierGames) * 10000) / 10000 : null,
    marginMae: maeGames > 0 ? Math.round((maeSum / maeGames) * 10) / 10 : null,
    benchmark:
      benchGames > 0
        ? { games: benchGames, modelHits: benchModel, tipsterHits: benchTipster }
        : null,
    rounds: [...byRound.values()].sort((a, b) => a.round - b.round),
  };
}

export const load: PageServerLoad = async ({ url }) => {
  const currentYear = new Date().getFullYear();

  let loadError = false;
  const allFixtures = await getFixturesForYear(currentYear).catch(() => {
    loadError = true;
    return [];
  });

  const rawRound = parseInt(url.searchParams.get("round") ?? "");
  const selectedRound =
    !isNaN(rawRound) && rawRound >= 0 && rawRound <= MAX_ROUND
      ? rawRound
      : resolveDefaultRound(allFixtures);

  const availableRounds = [...new Set(allFixtures.map((f) => f.round))].sort(
    (a, b) => a - b,
  );

  const backtestData = {
    seasons: backtest.seasons,
    validatedOn: backtest.validatedOn,
    tunedOn: backtest.tunedOn,
    params: backtest.params,
  };

  const hasFixtures = allFixtures.some((f) => f.round === selectedRound);
  const [predictions, seasonRows] = await Promise.all([
    hasFixtures
      ? getPredictionsForRound(currentYear, selectedRound, MODEL_VERSION).catch(() => {
          loadError = true;
          return [] as PredictionRow[];
        })
      : Promise.resolve([] as PredictionRow[]),
    getSeasonPredictionRows(currentYear, MODEL_VERSION).catch(() => {
      loadError = true;
      return [];
    }),
  ]);

  return {
    year: currentYear,
    selectedRound,
    availableRounds,
    predictions,
    scoreboard: computeScoreboard(seasonRows),
    backtest: backtestData,
    hasFixtures,
    loadError,
  };
};
