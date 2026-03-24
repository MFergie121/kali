import {
  getMatchIdsForRound,
  scrapeMatchAdvancedStats,
  scrapeMatchStats,
} from "$lib/afl/scraper";
import {
  batchUpsertPlayerAdvancedStats,
  batchUpsertPlayerStats,
  upsertMatch,
} from "$lib/db/afl/service";
import { requireAdminOrCron } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const MAX_ROUND = 27;
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

  const mids = await getMatchIdsForRound(round, year);
  console.log(`[afl-scraper] mids for round ${round}=${JSON.stringify(mids)}`);

  if (mids.length === 0) {
    return json(
      {
        error: `No match IDs found for Round ${round}, ${year}. The round may not have been played yet.`,
      },
      { status: 422 },
    );
  }

  let matchesScraped = 0;
  for (const mid of mids) {
    console.log(
      `[afl-scraper] scraping mid=${mid} (${matchesScraped + 1}/${mids.length})`,
    );
    const [data, advData] = await Promise.all([
      scrapeMatchStats(mid),
      scrapeMatchAdvancedStats(mid),
    ]);
    console.log(
      `[afl-scraper] persisting mid=${mid} — ${data.homeStats.length} home + ${data.awayStats.length} away players`,
    );
    await upsertMatch(data.match);
    await batchUpsertPlayerStats(data.homeStats, mid, data.match.year);
    await batchUpsertPlayerStats(data.awayStats, mid, data.match.year);
    await batchUpsertPlayerAdvancedStats(
      advData.homeAdvStats,
      mid,
      data.match.year,
    );
    await batchUpsertPlayerAdvancedStats(
      advData.awayAdvStats,
      mid,
      data.match.year,
    );
    matchesScraped++;
    console.log(`[afl-scraper] mid=${mid} done`);
  }

  console.log(
    `[afl-scraper] complete — year=${year}, round=${round}, matchesScraped=${matchesScraped}`,
  );
  return json({ success: true, year, round, matchesScraped });
};
