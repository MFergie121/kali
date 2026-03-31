import { getMatchIdsForRound } from "$lib/afl/scraper";
import { scrapeAndPersistMatch } from "$lib/db/afl/service";
import { requireAdminOrCron } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const MAX_ROUND = 28;
const FIRST_YEAR = 2000;

export const POST: RequestHandler = async (event) => {
  await requireAdminOrCron(event.request, event.locals);

  const body = await event.request.json();
  const year = parseInt(body.year, 10) || new Date().getFullYear();
  const round = parseInt(body.round, 10);

  if (isNaN(round) || round < 0 || round > MAX_ROUND) {
    return json({ error: "Invalid round number." }, { status: 422 });
  }

  const currentYear = new Date().getFullYear();
  if (isNaN(year) || year < FIRST_YEAR || year > currentYear) {
    return json({ error: "Invalid year." }, { status: 422 });
  }

  console.log(`[afl-scraper] starting scrape for year=${year}, round=${round}`);

  const matchInfos = await getMatchIdsForRound(round, year);
  console.log(`[afl-scraper] matches for round ${round}=${JSON.stringify(matchInfos)}`);

  if (matchInfos.length === 0) {
    return json(
      {
        error: `No match IDs found for Round ${round}, ${year}. The round may not have been played yet.`,
      },
      { status: 422 },
    );
  }

  console.log(`[afl-scraper] scraping ${matchInfos.length} matches in parallel`);
  await Promise.all(
    matchInfos.map(({ mid, startDatetime }) => {
      console.log(`[afl-scraper] scraping mid=${mid} startDatetime=${startDatetime}`);
      return scrapeAndPersistMatch(mid, startDatetime).then(() => console.log(`[afl-scraper] mid=${mid} done`));
    }),
  );

  console.log(
    `[afl-scraper] complete — year=${year}, round=${round}, matchesScraped=${matchInfos.length}`,
  );
  return json({ success: true, year, round, matchesScraped: matchInfos.length });
};
