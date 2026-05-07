import { updatePredictionOutcomes } from "$lib/db/afl/service";
import { requireAdminOrCron } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
  await requireAdminOrCron(event.request, event.locals);

  const body = await event.request.json().catch(() => ({}));

  let year: number;
  if (body.year !== undefined) {
    year = parseInt(body.year, 10);
    if (isNaN(year) || year < 2000) {
      return json(
        { error: "Bad request: year must be a valid integer" },
        { status: 400 },
      );
    }
  } else {
    year = new Date().getFullYear();
  }

  console.log(`[settle-predictions] year=${year}`);

  const settled = await updatePredictionOutcomes(year);
  if (settled > 0) {
    console.log(`[settle-predictions] settled ${settled} predictions`);
  }

  return json({ success: true, year, settled });
};
