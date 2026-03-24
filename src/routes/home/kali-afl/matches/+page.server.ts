import {
  getAdvancedPlayerStatsForMatch,
  getMatchesForRoundAndYear,
  getPlayerStatsForMatch,
  getStoredRoundsForYear,
} from "$lib/db/afl/service";
import {
  fetchSeasonFixture,
  fetchTips,
  getUpcomingGames,
  getUpcomingRound,
  type SquiggleGame,
  type SquiggleTip,
} from "$lib/afl/squiggle";
import type { PageServerLoad } from "./$types";

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
  const matches = await Promise.all(
    matchRows.map(async (m) => ({
      ...m,
      stats: await getPlayerStatsForMatch(m.id),
      advStats: await getAdvancedPlayerStatsForMatch(m.id),
    })),
  );

  // Fetch fixture from Squiggle (cached) — fail gracefully if the API is down
  let upcomingByRound: Record<number, SquiggleGame[]> = {};
  let upcomingRound: number | null = null;
  let roundTips: SquiggleTip[] = [];

  try {
    const allGames = await fetchSeasonFixture(selectedYear);
    const upcoming = getUpcomingGames(allGames);
    for (const game of upcoming) {
      if (!upcomingByRound[game.round]) upcomingByRound[game.round] = [];
      upcomingByRound[game.round].push(game);
    }
    upcomingRound = getUpcomingRound(allGames);

    // Only fetch tips when viewing the actual upcoming round
    if (upcomingRound !== null && selectedRound === upcomingRound) {
      try {
        roundTips = await fetchTips(selectedYear, upcomingRound);
      } catch {
        // Tips API down — predictions simply won't show
      }
    }
  } catch {
    // Squiggle is down — upcoming chips and fixture simply won't render
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
