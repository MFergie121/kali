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

  // Load fixtures early so we can derive the active round for the default
  let allFixtures: Awaited<ReturnType<typeof getFixturesForYear>> = [];
  let upcomingByRound: Record<number, Awaited<ReturnType<typeof getFixturesForYear>>> = {};
  let upcomingRound: number | null = null;

  try {
    allFixtures = await getFixturesForYear(selectedYear);
    for (const game of allFixtures.filter((f) => f.complete < 100)) {
      if (!upcomingByRound[game.round]) upcomingByRound[game.round] = [];
      upcomingByRound[game.round].push(game);
    }
    upcomingRound = getUpcomingRound(allFixtures);
  } catch {
    // fixtures/tips tables may not exist yet
  }

  // Default round: latest round with a completed fixture game (current year),
  // or highest scraped round (past years), or 1
  const rawRound = parseInt(url.searchParams.get("round") ?? "");
  let defaultRound: number;
  if (selectedYear === currentYear && allFixtures.length > 0) {
    const activeRound = allFixtures
      .filter((f) => f.complete >= 100)
      .reduce((max, f) => Math.max(max, f.round), 0);
    defaultRound = activeRound || storedRounds[0] || 1;
  } else {
    defaultRound = storedRounds[0] ?? 1;
  }
  const selectedRound =
    !isNaN(rawRound) && rawRound >= 0 && rawRound <= MAX_ROUND
      ? rawRound
      : defaultRound;

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

  // Load tips for the upcoming round if it matches the selected round
  let roundTips: Awaited<ReturnType<typeof getTipsForRound>> = [];
  try {
    if (upcomingRound !== null && selectedRound === upcomingRound) {
      roundTips = await getTipsForRound(selectedYear, upcomingRound);
    }
  } catch {
    // tips table may not exist yet
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
