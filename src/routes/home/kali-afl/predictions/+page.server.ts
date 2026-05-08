import { getUpcomingRound } from "$lib/afl/squiggle";
import {
  MAX_ROUND,
  MODEL_VERSION,
  type PredictionFactor,
  type FactorBreakdown,
} from "$lib/afl/predictor";
import { getFixturesForYear, getPredictionsForRound } from "$lib/db/afl/service";
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
  actualWinner: "home" | "away" | "draw" | null;
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

  const stored = await getPredictionsForRound(currentYear, selectedRound, MODEL_VERSION);
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
    actualWinner: r.actualWinner as "home" | "away" | "draw" | null,
  }));
  return { selectedRound, predictions, availableRounds };
};
