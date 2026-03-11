import {
  getLatestCompletedRound,
  getMatchIdsForRound,
  scrapeMatchStats,
} from "$lib/afl/scraper";
import {
  batchUpsertPlayerStats,
  getMatchesForRound,
  getPlayerStatsForMatch,
  getStoredRounds,
  upsertMatch,
} from "$lib/db/afl/service";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const rounds = getStoredRounds();
  const latestRound = rounds[0] ?? null;
  const matchRows = latestRound !== null ? getMatchesForRound(latestRound) : [];

  const matchesWithStats = matchRows.map((m) => ({
    ...m,
    stats: getPlayerStatsForMatch(m.id),
  }));

  return {
    rounds,
    latestRound,
    matches: matchesWithStats,
  };
};

export const actions: Actions = {
  scrape: async () => {
    try {
      const year = new Date().getFullYear();
      const round = await getLatestCompletedRound(year);
      if (round === null) {
        return fail(422, {
          error: "No completed round found yet this season.",
        });
      }
      console.log(
        `[afl-scraper] action: starting scrape for year=${year}, round=${round}`,
      );

      const mids = await getMatchIdsForRound(round, year);
      console.log(
        `[afl-scraper] action: mids for round ${round}=${JSON.stringify(mids)}`,
      );

      if (mids.length === 0) {
        return fail(422, { error: `No match IDs found for round ${round}.` });
      }

      let matchesScraped = 0;
      for (const mid of mids) {
        console.log(
          `[afl-scraper] action: scraping mid=${mid} (${matchesScraped + 1}/${mids.length})`,
        );
        const data = await scrapeMatchStats(mid);
        console.log(
          `[afl-scraper] action: persisting mid=${mid} — ${data.homeStats.length} home + ${data.awayStats.length} away players`,
        );
        await upsertMatch(data.match);
        batchUpsertPlayerStats(data.homeStats, mid);
        batchUpsertPlayerStats(data.awayStats, mid);
        matchesScraped++;
        console.log(`[afl-scraper] action: mid=${mid} done`);
      }

      console.log(
        `[afl-scraper] action: scrape complete — round=${round}, matchesScraped=${matchesScraped}`,
      );
      return { success: true, round, matchesScraped };
    } catch (err) {
      console.error("[afl-scraper] action: scrape FAILED:", err);
      return fail(500, {
        error:
          err instanceof Error ? err.message : "Unknown error during scrape.",
      });
    }
  },

  debugScrape: async ({ request }) => {
    try {
      const formData = await request.formData();
      const mid = parseInt(formData.get("mid") as string, 10);
      if (isNaN(mid) || mid <= 0) {
        return fail(400, { error: "Invalid match ID." });
      }
      console.log(`[afl-scraper] debugScrape: mid=${mid}`);
      const result = await scrapeMatchStats(mid);
      return {
        debugResult: JSON.stringify(
          {
            _debug: result._debug,
            match: result.match,
            homeStatsCount: result.homeStats.length,
            awayStatsCount: result.awayStats.length,
            homeStatsSample: result.homeStats.slice(0, 3),
            awayStatsSample: result.awayStats.slice(0, 3),
          },
          null,
          2,
        ),
      };
    } catch (err) {
      console.error("[afl-scraper] debugScrape FAILED:", err);
      return fail(500, {
        error: err instanceof Error ? err.message : "Debug scrape failed.",
      });
    }
  },
};
