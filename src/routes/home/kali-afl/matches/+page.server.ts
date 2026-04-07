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

  // Default round logic (current year with fixtures):
  //   1. If a round is in progress (≥1 game started, ≥1 not complete) → that round
  //   2. Otherwise → upcoming round (next round with unstarted games)
  //   3. Fallback → latest completed round, then highest scraped, then 1
  // Past years: highest scraped round, then 1
  const rawRound = parseInt(url.searchParams.get("round") ?? "");
  let defaultRound: number;
  if (selectedYear === currentYear && allFixtures.length > 0) {
    const now = new Date();
    // Group fixtures by round
    const byRound = new Map<number, typeof allFixtures>();
    for (const f of allFixtures) {
      if (!byRound.has(f.round)) byRound.set(f.round, []);
      byRound.get(f.round)!.push(f);
    }

    // Find a round currently in progress
    let inProgressRound: number | null = null;
    for (const [round, games] of byRound) {
      const hasStarted = games.some((g) => {
        if (g.complete > 0) return true;
        if (g.date) {
          const gameDate = new Date(g.date.replace(" ", "T") + "+10:00");
          return gameDate <= now;
        }
        return false;
      });
      const hasIncomplete = games.some((g) => g.complete < 100);
      if (hasStarted && hasIncomplete) {
        inProgressRound = round;
        break;
      }
    }

    if (inProgressRound !== null) {
      defaultRound = inProgressRound;
    } else if (upcomingRound !== null) {
      defaultRound = upcomingRound;
    } else {
      // All games complete or no fixtures — fall back to latest completed round
      const latestCompleted = allFixtures
        .filter((f) => f.complete >= 100)
        .reduce((max, f) => Math.max(max, f.round), 0);
      defaultRound = latestCompleted || storedRounds[0] || 1;
    }
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
