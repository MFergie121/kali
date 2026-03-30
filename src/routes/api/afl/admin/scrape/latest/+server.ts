import { getLatestCompletedMatchId } from "$lib/afl/scraper";
import { scrapeAndPersistMatch } from "$lib/db/afl/service";
import { requireAdminOrCron } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
  await requireAdminOrCron(event.request, event.locals);

  const body = await event.request.json();
  const year = parseInt(body.year, 10) || new Date().getFullYear();

  const currentYear = new Date().getFullYear();
  if (isNaN(year) || year < 2000 || year > currentYear) {
    return json({ error: "Invalid year." }, { status: 422 });
  }

  console.log(`[afl-scraper] finding latest completed match for year=${year}`);
  const latest = await getLatestCompletedMatchId(year);

  if (!latest) {
    return json(
      { error: `No completed matches found for ${year}.` },
      { status: 422 },
    );
  }

  console.log(
    `[afl-scraper] scraping latest match mid=${latest.mid}, round=${latest.round}`,
  );
  const result = await scrapeAndPersistMatch(latest.mid);
  console.log(`[afl-scraper] latest match mid=${latest.mid} done`);

  return json({
    success: true,
    mid: latest.mid,
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
