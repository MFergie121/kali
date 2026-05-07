import { getUpcomingRound } from "$lib/afl/squiggle";
import {
  MODEL_VERSION,
  assemblePredictorInputs,
  computePredictions,
} from "$lib/afl/predictor";
import { getFixturesForYear, upsertPredictions } from "$lib/db/afl/service";
import { requireAdminOrCron } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
  await requireAdminOrCron(event.request, event.locals);

  const body = await event.request.json().catch(() => ({}));
  const year = parseInt(body.year, 10) || new Date().getFullYear();

  let round: number | null;
  if (body.round !== undefined) {
    round = parseInt(body.round, 10);
    if (isNaN(round)) {
      return json(
        { error: "Bad request: round must be an integer" },
        { status: 400 },
      );
    }
  } else {
    const allFixtures = await getFixturesForYear(year);
    round = getUpcomingRound(allFixtures);
  }

  console.log(`[sync-predictions] year=${year} round=${round}`);

  if (round == null) {
    return json({
      success: true,
      year,
      round: null,
      count: 0,
      modelVersion: MODEL_VERSION,
      message: "No upcoming round found",
    });
  }

  const inputs = await assemblePredictorInputs(year, round);
  if (inputs.roundFixtures.length === 0) {
    return json({
      success: true,
      year,
      round,
      count: 0,
      modelVersion: MODEL_VERSION,
      message: "No fixtures for round",
    });
  }

  const preds = computePredictions(inputs);
  await upsertPredictions(preds, year, round, MODEL_VERSION);
  console.log(`[sync-predictions] upserted ${preds.length} predictions`);

  return json({
    success: true,
    year,
    round,
    count: preds.length,
    modelVersion: MODEL_VERSION,
  });
};
