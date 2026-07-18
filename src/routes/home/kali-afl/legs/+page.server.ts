import { loadLegsShowcase, type LegsShowcaseResult } from "$lib/afl/legs.server";
import { getLegsSearchIndex, type LegsSearchIndex } from "$lib/db/afl/service";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const year = new Date().getFullYear();
  const dateParam = url.searchParams.get("date");

  let loadError = false;
  const emptyShowcase: LegsShowcaseResult = {
    round: null,
    day: null,
    days: [],
    rows: [],
    fixtureCount: 0,
  };
  const emptyIndex: LegsSearchIndex = { players: [], teams: [] };

  const [showcase, searchIndex] = await Promise.all([
    loadLegsShowcase(year, dateParam).catch(() => {
      loadError = true;
      return emptyShowcase;
    }),
    getLegsSearchIndex(year).catch(() => {
      loadError = true;
      return emptyIndex;
    }),
  ]);

  return { year, showcase, searchIndex, loadError };
};
