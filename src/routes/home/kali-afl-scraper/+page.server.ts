import { getMatchIdsForRound, scrapeMatchStats } from "$lib/afl/scraper";
import {
  batchUpsertPlayerStats,
  getMatchesForRound,
  getPlayerStatsForMatch,
  getStoredRounds,
  upsertMatch,
} from "$lib/afl/service";
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
      // TODO: replace with getLatestCompletedRound(year) once the regular season starts
      const round = 0;
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
};
