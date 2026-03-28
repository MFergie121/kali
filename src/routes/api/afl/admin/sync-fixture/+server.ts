import { fetchSeasonFixture } from "$lib/afl/squiggle";
import { upsertFixtures } from "$lib/db/afl/service";
import { requireAdminOrCron } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
  await requireAdminOrCron(event.request, event.locals);

  const body = await event.request.json().catch(() => ({}));
  const year = parseInt(body.year, 10) || new Date().getFullYear();

  console.log(`[sync-fixture] starting sync for year=${year}`);
  const games = await fetchSeasonFixture(year);
  console.log(`[sync-fixture] fetched ${games.length} games from Squiggle`);

  await upsertFixtures(games);
  console.log(`[sync-fixture] upserted fixtures to DB`);

  return json({ success: true, year, count: games.length });
};
