import { MODEL_VERSION, backfillPredictionsPipeline } from "$lib/afl/predictor";
import { updatePredictionOutcomes } from "$lib/db/afl/service";
import { requireAdminOrCron } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
  await requireAdminOrCron(event.request, event.locals);

  const body = await event.request.json().catch(() => ({}));
  const year = parseInt(body.year, 10);
  if (isNaN(year) || year < 2000) {
    return json(
      { error: "Bad request: year must be a valid integer" },
      { status: 400 },
    );
  }

  const modelVersion =
    typeof body.modelVersion === "string" && body.modelVersion.length > 0
      ? body.modelVersion
      : MODEL_VERSION;
  const skipTips = body.skipTips === true;

  const fromRound =
    body.fromRound !== undefined ? parseInt(body.fromRound, 10) : undefined;
  const toRound =
    body.toRound !== undefined ? parseInt(body.toRound, 10) : undefined;
  if (
    (fromRound !== undefined && isNaN(fromRound)) ||
    (toRound !== undefined && isNaN(toRound)) ||
    (fromRound !== undefined && toRound !== undefined && fromRound > toRound)
  ) {
    return json(
      { error: "Bad request: invalid fromRound/toRound" },
      { status: 400 },
    );
  }

  const summary = await backfillPredictionsPipeline(year, {
    fromRound,
    toRound,
    modelVersion,
    skipTips,
  });
  console.log(
    `[backfill-predictions] year=${year} stored ${summary.total} across ${summary.rounds.length} rounds`,
  );
  const settled = await updatePredictionOutcomes(year);

  return json({
    success: true,
    year,
    modelVersion,
    skipTips,
    rounds: summary.rounds,
    count: summary.total,
    settled,
  });
};
