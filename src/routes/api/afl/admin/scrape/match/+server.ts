import { scrapeAndPersistMatch } from "$lib/db/afl/service";
import { requireAdminOrCron } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
  await requireAdminOrCron(event.request, event.locals);

  const body = await event.request.json();
  const mid = parseInt(body.mid, 10);

  if (isNaN(mid) || mid <= 0) {
    return json({ error: "Invalid match ID." }, { status: 400 });
  }

  console.log(`[afl-scraper] scraping single match mid=${mid}`);
  const result = await scrapeAndPersistMatch(mid);
  console.log(`[afl-scraper] single match mid=${mid} done`);

  return json({
    success: true,
    mid,
    round: result.match.round,
    year: result.match.year,
    homeTeam: result.match.homeTeam.name,
    awayTeam: result.match.awayTeam.name,
    homeScore: result.match.homeScore,
    awayScore: result.match.awayScore,
    homeStatsCount: result.homeStatsCount,
    awayStatsCount: result.awayStatsCount,
  });
};
