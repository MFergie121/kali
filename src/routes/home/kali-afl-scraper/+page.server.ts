import { db } from "$lib/db/afl";
import { kaliUsers, matches, players, playerStats } from "$lib/db/afl/schema";
import {
  getMatchesForRoundAndYear,
  listApiKeysForUser,
} from "$lib/db/afl/service";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  // 1. DB Snapshot counts
  const [{ c: totalMatches }] = await db.select({ c: count() }).from(matches);
  const [{ c: totalPlayers }] = await db.select({ c: count() }).from(players);
  const [{ c: totalStatRecords }] = await db.select({ c: count() }).from(playerStats);
  const distinctYears = await db
    .selectDistinct({ year: matches.year })
    .from(matches)
    .orderBy(desc(matches.year));

  // 2. Season Coverage Grid — for each year, which rounds are scraped
  const seasonGrid = await Promise.all(
    distinctYears.map(async ({ year }) => {
      const roundRows = await db
        .selectDistinct({ round: matches.round })
        .from(matches)
        .where(eq(matches.year, year))
        .orderBy(asc(matches.round));
      return { year, rounds: roundRows.map((r) => r.round) };
    }),
  );

  // 3. Latest Round Summary
  const [latestEntry] = await db
    .select({ round: matches.round, year: matches.year })
    .from(matches)
    .orderBy(desc(matches.year), desc(matches.round))
    .limit(1);

  const latestRound = latestEntry
    ? {
        round: latestEntry.round,
        year: latestEntry.year,
        matches: await getMatchesForRoundAndYear(latestEntry.round, latestEntry.year),
      }
    : null;

  // 4. Top Performers — season totals for latest year
  const currentYear = latestEntry?.year ?? new Date().getFullYear();

  const topByDisposals = await db
    .select({
      playerName: players.name,
      teamId: players.currentTeamId,
      total: sql<number>`cast(sum(${playerStats.disposals}) as int)`,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(eq(matches.year, currentYear))
    .groupBy(players.id)
    .orderBy(desc(sql`sum(${playerStats.disposals})`))
    .limit(5);

  const topByGoals = await db
    .select({
      playerName: players.name,
      teamId: players.currentTeamId,
      total: sql<number>`cast(sum(${playerStats.goals}) as int)`,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(eq(matches.year, currentYear))
    .groupBy(players.id)
    .orderBy(desc(sql`sum(${playerStats.goals})`))
    .limit(5);

  const topByFantasy = await db
    .select({
      playerName: players.name,
      teamId: players.currentTeamId,
      total: sql<number>`cast(sum(${playerStats.aflFantasyPts}) as int)`,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(eq(matches.year, currentYear))
    .groupBy(players.id)
    .orderBy(desc(sql`sum(${playerStats.aflFantasyPts})`))
    .limit(5);

  // 5. API Usage Snapshot for current user
  let apiSnapshot: {
    apiUsage: number;
    apiLimit: number | null;
    activeKeys: number;
    totalKeys: number;
  } | null = null;
  const userEmail = (locals as any).session?.user?.email;
  if (userEmail) {
    const [user] = await db.select().from(kaliUsers).where(eq(kaliUsers.email, userEmail));
    if (user) {
      const keys = await listApiKeysForUser(user.id);
      const activeKeys = keys.filter((k) => !k.revoked);
      apiSnapshot = {
        apiUsage: activeKeys.reduce((sum, k) => sum + k.usage, 0),
        apiLimit: null,
        activeKeys: activeKeys.length,
        totalKeys: keys.length,
      };
    }
  }

  return {
    snapshot: {
      totalMatches,
      totalPlayers,
      totalStatRecords,
      yearsCount: distinctYears.length,
    },
    seasonGrid,
    latestRound,
    topPerformers: {
      currentYear,
      disposals: topByDisposals,
      goals: topByGoals,
      fantasy: topByFantasy,
    },
    apiSnapshot,
  };
};
