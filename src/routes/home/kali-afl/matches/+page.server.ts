import { getUpcomingRound } from "$lib/afl/squiggle";
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
const MAX_ROUND = 28;

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
      : (storedRounds[storedRounds.length - 1] ?? 1);

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
  // Wrapped in try-catch so the page still loads if the tables haven't been created yet
  let upcomingByRound: Record<number, Awaited<ReturnType<typeof getFixturesForYear>>> = {};
  let upcomingRound: number | null = null;
  let roundTips: Awaited<ReturnType<typeof getTipsForRound>> = [];

  try {
    const allFixtures = await getFixturesForYear(selectedYear);
    for (const game of allFixtures.filter((f) => f.complete < 100)) {
      if (!upcomingByRound[game.round]) upcomingByRound[game.round] = [];
      upcomingByRound[game.round].push(game);
    }
    upcomingRound = getUpcomingRound(allFixtures);

    if (upcomingRound !== null && selectedRound === upcomingRound) {
      roundTips = await getTipsForRound(selectedYear, upcomingRound);
    }
  } catch {
    // fixtures/tips tables may not exist yet — page renders without fixture data
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
