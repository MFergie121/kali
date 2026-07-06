import { MODEL_VERSION, syncPredictionsPipeline } from "$lib/afl/predictor";
import { requireAdminOrCron } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
  await requireAdminOrCron(event.request, event.locals);

  const body = await event.request.json().catch(() => ({}));
  const year = parseInt(body.year, 10) || new Date().getFullYear();

  let round: number | undefined;
  if (body.round !== undefined) {
    round = parseInt(body.round, 10);
    if (isNaN(round)) {
      return json(
        { error: "Bad request: round must be an integer" },
        { status: 400 },
      );
    }
  }

  const result = await syncPredictionsPipeline(year, round);
  console.log(
    `[sync-predictions] year=${year} round=${result.round} upserted ${result.count}`,
  );

  return json({
    success: true,
    year,
    modelVersion: MODEL_VERSION,
    ...result,
  });
};
