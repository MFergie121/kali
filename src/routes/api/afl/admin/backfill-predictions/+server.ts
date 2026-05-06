import {
  MODEL_VERSION,
  assemblePredictorInputs,
  computePredictions,
} from "$lib/afl/predictor";
import {
  getFixturesForYear,
  updatePredictionOutcomes,
  upsertPredictions,
} from "$lib/db/afl/service";
import { requireAdmin } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
  await requireAdmin(event.locals);

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

  const allFixtures = await getFixturesForYear(year);
  if (allFixtures.length === 0) {
    return json({ success: true, year, count: 0, rounds: [] });
  }

  const allRounds = [...new Set(allFixtures.map((f) => f.round))].sort(
    (a, b) => a - b,
  );

  const fromRound =
    body.fromRound !== undefined
      ? parseInt(body.fromRound, 10)
      : allRounds[0];
  const toRound =
    body.toRound !== undefined
      ? parseInt(body.toRound, 10)
      : allRounds[allRounds.length - 1];

  if (isNaN(fromRound) || isNaN(toRound) || fromRound > toRound) {
    return json(
      { error: "Bad request: invalid fromRound/toRound" },
      { status: 400 },
    );
  }

  const rounds = allRounds.filter((r) => r >= fromRound && r <= toRound);
  let totalCount = 0;
  const summary: { round: number; count: number }[] = [];

  for (const round of rounds) {
    // Earliest fixture date in this round → asOfDate (use day before to be safe)
    const roundFixtures = allFixtures.filter((f) => f.round === round);
    const earliest = roundFixtures
      .map((f) => f.date)
      .filter((d): d is string => !!d)
      .sort()[0];

    let beforeDate: string | undefined;
    if (earliest) {
      const d = new Date(earliest.replace(" ", "T"));
      d.setDate(d.getDate() - 1);
      beforeDate = d.toISOString().slice(0, 10);
    }

    const inputs = await assemblePredictorInputs(year, round, {
      upToRound: round,
      beforeDate,
      skipTips,
    });

    if (inputs.roundFixtures.length === 0) {
      summary.push({ round, count: 0 });
      continue;
    }

    const preds = computePredictions(inputs);
    await upsertPredictions(preds, year, round, modelVersion);
    summary.push({ round, count: preds.length });
    totalCount += preds.length;
    console.log(
      `[backfill-predictions] year=${year} round=${round} stored ${preds.length}`,
    );
  }

  const settled = await updatePredictionOutcomes(year);

  return json({
    success: true,
    year,
    fromRound,
    toRound,
    modelVersion,
    skipTips,
    rounds: summary,
    count: totalCount,
    settled,
  });
};
