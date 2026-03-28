import { getUpcomingRound, type SquiggleGame } from "$lib/afl/squiggle";
import {
  getAdvancedPlayerStatsForRound,
  getFixturesForYear,
  getMatchesForRoundAndYear,
  getPlayerStatsForRound,
  getStoredRoundsForYear,
  getTipsForRound,
} from "$lib/db/afl/service";
import type { PageServerLoad } from "./$types";

const FIRST_YEAR = 2000;
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

  const storedRounds = await getStoredRoundsForYear(selectedYear);

  const rawRound = parseInt(url.searchParams.get("round") ?? "");
  const selectedRound =
    !isNaN(rawRound) && rawRound >= 0 && rawRound <= MAX_ROUND
      ? rawRound
      : (storedRounds[0] ?? 1);

  const hasData = storedRounds.includes(selectedRound);
  const matchRows = hasData
    ? await getMatchesForRoundAndYear(selectedRound, selectedYear)
    : [];

  // Batch load all stats for the round instead of per-match
  const statsMap = hasData
    ? await getPlayerStatsForRound(selectedRound, selectedYear)
    : new Map();
  const advStatsMap = hasData
    ? await getAdvancedPlayerStatsForRound(selectedRound, selectedYear)
    : new Map();

  const matches = matchRows.map((m) => ({
    ...m,
    stats: statsMap.get(m.id) ?? [],
    advStats: advStatsMap.get(m.id) ?? [],
  }));

  // Read fixtures and tips from DB (synced via cron job)
  const allFixtures = await getFixturesForYear(selectedYear);
  const upcomingByRound: Record<number, typeof allFixtures> = {};
  for (const game of allFixtures.filter((f) => f.complete < 100)) {
    if (!upcomingByRound[game.round]) upcomingByRound[game.round] = [];
    upcomingByRound[game.round].push(game);
  }
  const upcomingRound = getUpcomingRound(allFixtures);

  let roundTips = [];
  if (upcomingRound !== null && selectedRound === upcomingRound) {
    roundTips = await getTipsForRound(selectedYear, upcomingRound);
  }

  return {
    allYears,
    allRounds,
    storedRounds,
    selectedYear,
    selectedRound,
    hasData,
    matches,
    upcomingByRound,
    upcomingRound,
    roundTips,
  };
};
