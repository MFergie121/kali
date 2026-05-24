import { requireApiKey } from "$lib/api/auth";
import { getPredictionsPaginated } from "$lib/db/afl/service";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, locals, url }) => {
  const denied = await requireApiKey(request, locals);
  if (denied) return denied;

  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    200,
  );
  const offset = Math.max(
    parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
    0,
  );

  const yearParam = url.searchParams.get("year");
  const roundParam = url.searchParams.get("round");
  const fixtureIdParam = url.searchParams.get("fixture_id");
  const teamId = url.searchParams.get("team_id") ?? undefined;
  const modelVersion = url.searchParams.get("model_version") ?? undefined;
  const settledParam = url.searchParams.get("settled");

  const year = yearParam ? parseInt(yearParam, 10) : undefined;
  const round = roundParam ? parseInt(roundParam, 10) : undefined;
  const fixtureId = fixtureIdParam ? parseInt(fixtureIdParam, 10) : undefined;

  if (yearParam && (isNaN(year!) || year! < 1)) {
    return json(
      { error: "Bad request: year must be a positive integer" },
      { status: 400 },
    );
  }
  if (roundParam && (isNaN(round!) || round! < 0)) {
    return json(
      { error: "Bad request: round must be a non-negative integer" },
      { status: 400 },
    );
  }
  if (fixtureIdParam && (isNaN(fixtureId!) || fixtureId! < 1)) {
    return json(
      { error: "Bad request: fixture_id must be a positive integer" },
      { status: 400 },
    );
  }

  let settled: boolean | undefined;
  if (settledParam === "true") settled = true;
  else if (settledParam === "false") settled = false;

  const { data, total } = await getPredictionsPaginated({
    year,
    round,
    fixtureId,
    teamId,
    modelVersion,
    settled,
    limit,
    offset,
  });
  return json({ data, meta: { limit, offset, count: data.length, total } });
};
