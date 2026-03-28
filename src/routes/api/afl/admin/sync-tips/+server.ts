import { fetchTips, getUpcomingRound } from "$lib/afl/squiggle";
import { getFixturesForYear, upsertTips } from "$lib/db/afl/service";
import { requireAdminOrCron } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
  await requireAdminOrCron(event.request, event.locals);

  const body = await event.request.json().catch(() => ({}));
  const year = parseInt(body.year, 10) || new Date().getFullYear();

  console.log(`[sync-tips] starting sync for year=${year}`);

  // Find the upcoming round from stored fixtures
  const allFixtures = await getFixturesForYear(year);
  const upcomingRound = getUpcomingRound(allFixtures);

  if (upcomingRound === null) {
    console.log(`[sync-tips] no upcoming round found`);
    return json({
      success: true,
      year,
      round: null,
      count: 0,
      message: "No upcoming round found",
    });
  }

  console.log(`[sync-tips] fetching tips for year=${year}, round=${upcomingRound}`);
  const fetchedTips = await fetchTips(year, upcomingRound);
  console.log(`[sync-tips] fetched ${fetchedTips.length} tips from Squiggle`);

  await upsertTips(fetchedTips, year, upcomingRound);
  console.log(`[sync-tips] upserted tips to DB`);

  return json({
    success: true,
    year,
    round: upcomingRound,
    count: fetchedTips.length,
  });
};
