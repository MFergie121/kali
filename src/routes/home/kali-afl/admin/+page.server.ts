import { getMatchIdsForRound } from "$lib/afl/scraper";
import {
  getStoredRoundsForYear,
  scrapeAndPersistMatch,
} from "$lib/db/afl/service";
import { requireAdmin } from "$lib/server/admin";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

const FIRST_YEAR = 2000;
const MAX_ROUND = 28;

export const load: PageServerLoad = async (event) => {
  await requireAdmin(event.locals);

  const currentYear = new Date().getFullYear();
  const allYears = Array.from(
    { length: currentYear - FIRST_YEAR + 1 },
    (_, i) => FIRST_YEAR + i,
  );
  const allRounds = Array.from({ length: MAX_ROUND + 1 }, (_, i) => i);

  const yearParam =
    parseInt(event.url.searchParams.get("year") ?? "") || currentYear;
  const selectedYear = Math.min(Math.max(yearParam, FIRST_YEAR), currentYear);
  const storedRounds = await getStoredRoundsForYear(selectedYear);

  return { allYears, allRounds, selectedYear, storedRounds };
};

export const actions: Actions = {
  scrape: async (event) => {
    await requireAdmin(event.locals);

    const form = await event.request.formData();
    const year = parseInt(form.get("year") as string, 10);
    const round = parseInt(form.get("round") as string, 10);
    const currentYear = new Date().getFullYear();

    if (isNaN(year) || year < FIRST_YEAR || year > currentYear) {
      return fail(422, { error: "Invalid year." });
    }
    if (isNaN(round) || round < 0 || round > MAX_ROUND) {
      return fail(422, { error: "Invalid round." });
    }

    const matchInfos = await getMatchIdsForRound(round, year);
    if (matchInfos.length === 0) {
      return fail(422, {
        error: `No matches found for Round ${round}, ${year}. The round may not have been played yet.`,
      });
    }

    let matchesScraped = 0;
    for (const { mid, startDatetime } of matchInfos) {
      await scrapeAndPersistMatch(mid, startDatetime);
      matchesScraped++;
    }

    return { success: true, year, round, matchesScraped };
  },
};
