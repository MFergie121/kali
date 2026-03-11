import { getMatchIdsForRound, scrapeMatchStats } from "$lib/afl/scraper";
import {
  batchUpsertPlayerStats,
  getMatchesForRoundAndYear,
  getPlayerStatsForMatch,
  getStoredRoundsForYear,
  upsertMatch,
} from "$lib/db/afl/service";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

const FIRST_YEAR = 2024;
const MAX_ROUND = 27;

export const load: PageServerLoad = async ({ url }) => {
  const currentYear = new Date().getFullYear();
  const allYears = Array.from(
    { length: currentYear - FIRST_YEAR + 1 },
    (_, i) => FIRST_YEAR + i,
  );
  const allRounds = Array.from({ length: MAX_ROUND + 1 }, (_, i) => i);

  const selectedYear = Math.min(
    Math.max(
      parseInt(url.searchParams.get("year") ?? "") || currentYear,
      FIRST_YEAR,
    ),
    currentYear,
  );

  const storedRounds = getStoredRoundsForYear(selectedYear);

  const rawRound = parseInt(url.searchParams.get("round") ?? "");
  const selectedRound =
    !isNaN(rawRound) && rawRound >= 0 && rawRound <= MAX_ROUND
      ? rawRound
      : (storedRounds[0] ?? 1);

  const hasData = storedRounds.includes(selectedRound);
  const matchRows = hasData
    ? getMatchesForRoundAndYear(selectedRound, selectedYear)
    : [];
  const matches = matchRows.map((m) => ({
    ...m,
    stats: getPlayerStatsForMatch(m.id),
  }));

  return {
    allYears,
    allRounds,
    storedRounds,
    selectedYear,
    selectedRound,
    hasData,
    matches,
  };
};

export const actions: Actions = {
  scrape: async ({ request }) => {
    try {
      const formData = await request.formData();
      const year =
        parseInt(formData.get("year") as string, 10) ||
        new Date().getFullYear();
      const round = parseInt(formData.get("round") as string, 10);

      if (isNaN(round) || round < 0 || round > MAX_ROUND) {
        return fail(422, { error: "Invalid round number." });
      }

      console.log(
        `[afl-scraper] action: starting scrape for year=${year}, round=${round}`,
      );

      const mids = await getMatchIdsForRound(round, year);
      console.log(
        `[afl-scraper] action: mids for round ${round}=${JSON.stringify(mids)}`,
      );

      if (mids.length === 0) {
        return fail(422, {
          error: `No match IDs found for Round ${round}, ${year}. The round may not have been played yet.`,
        });
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
        `[afl-scraper] action: scrape complete — year=${year}, round=${round}, matchesScraped=${matchesScraped}`,
      );
      return { success: true, year, round, matchesScraped };
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
