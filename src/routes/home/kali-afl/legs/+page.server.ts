import { loadLegsShowcase, type LegsShowcaseResult } from "$lib/afl/legs.server";
import { SHOWCASE_STAT_KEYS, type ShowcaseStatKey } from "$lib/afl/legs-engine";
import { getLegsSearchIndex, type LegsSearchIndex } from "$lib/db/afl/service";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const year = new Date().getFullYear();
  const dateParam = url.searchParams.get("date");

  const rawStat = url.searchParams.get("stat");
  const statParam: ShowcaseStatKey | null = SHOWCASE_STAT_KEYS.includes(
    rawStat as ShowcaseStatKey,
  )
    ? (rawStat as ShowcaseStatKey)
    : null;

  let loadError = false;
  const emptyShowcase: LegsShowcaseResult = {
    round: null,
    day: null,
    days: [],
    rows: [],
    fixtureCount: 0,
    stat: statParam,
  };
  const emptyIndex: LegsSearchIndex = { players: [], teams: [] };

  const [showcase, searchIndex] = await Promise.all([
    loadLegsShowcase(year, dateParam, statParam).catch(() => {
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
