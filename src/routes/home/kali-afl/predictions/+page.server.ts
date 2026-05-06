import { getUpcomingRound } from "$lib/afl/squiggle";
import {
  MAX_ROUND,
  MODEL_VERSION,
  type PredictionFactor,
  type FactorBreakdown,
  assemblePredictorInputs,
  computePredictions,
} from "$lib/afl/predictor";
import {
  getFixturesForYear,
  getPredictionsForRound,
  upsertPredictions,
} from "$lib/db/afl/service";
import type { PageServerLoad } from "./$types";

export type { PredictionFactor, FactorBreakdown };

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

export const load: PageServerLoad = async ({ url }) => {
  const currentYear = new Date().getFullYear();

  const allFixtures = await getFixturesForYear(currentYear).catch(() => []);

  const upcomingRound = getUpcomingRound(allFixtures);
  const rawRound = parseInt(url.searchParams.get("round") ?? "");
  const selectedRound =
    !isNaN(rawRound) && rawRound >= 0 && rawRound <= MAX_ROUND
      ? rawRound
      : (upcomingRound ?? 1);

  const availableRounds = [
    ...new Set(allFixtures.map((f) => f.round)),
  ].sort((a, b) => a - b);

  const roundGames = allFixtures.filter((f) => f.round === selectedRound);
  if (roundGames.length === 0) {
    return { selectedRound, predictions: [], availableRounds };
  }

  // 1. Try DB cache
  const stored = await getPredictionsForRound(
    currentYear,
    selectedRound,
    MODEL_VERSION,
  );
  if (stored.length === roundGames.length) {
    const predictions: PredictionGame[] = stored.map((r) => ({
      fixtureId: r.fixtureId,
      round: r.round,
      date: r.date,
      venue: r.venue,
      homeTeam: r.homeTeam,
      awayTeam: r.awayTeam,
      homeTeamId: r.homeTeamId,
      awayTeamId: r.awayTeamId,
      homeProbability: r.homeProbability,
      awayProbability: r.awayProbability,
      factors: r.factors,
      squiggleConsensus: r.squiggleConsensus,
      homeBreakdown: r.homeBreakdown,
      awayBreakdown: r.awayBreakdown,
    }));
    return { selectedRound, predictions, availableRounds };
  }

  // 2. Cache miss → compute and write through
  const inputs = await assemblePredictorInputs(currentYear, selectedRound);
  const predictions = computePredictions(inputs);
  upsertPredictions(predictions, currentYear, selectedRound, MODEL_VERSION).catch(
    (err) => console.warn("[predictions] write-through failed:", err),
  );

  return { selectedRound, predictions, availableRounds };
};
