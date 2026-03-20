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
  const totalMatches = db.select({ c: count() }).from(matches).get()?.c ?? 0;
  const totalPlayers = db.select({ c: count() }).from(players).get()?.c ?? 0;
  const totalStatRecords =
    db.select({ c: count() }).from(playerStats).get()?.c ?? 0;
  const distinctYears = db
    .selectDistinct({ year: matches.year })
    .from(matches)
    .orderBy(desc(matches.year))
    .all();

  // 2. Season Coverage Grid — for each year, which rounds are scraped
  const seasonGrid = distinctYears.map(({ year }) => {
    const rounds = db
      .selectDistinct({ round: matches.round })
      .from(matches)
      .where(eq(matches.year, year))
      .orderBy(asc(matches.round))
      .all()
      .map((r) => r.round);
    return { year, rounds };
  });

  // 3. Latest Round Summary
  const latestEntry = db
    .select({ round: matches.round, year: matches.year })
    .from(matches)
    .orderBy(desc(matches.year), desc(matches.round))
    .limit(1)
    .get();

  const latestRound = latestEntry
    ? {
        round: latestEntry.round,
        year: latestEntry.year,
        matches: getMatchesForRoundAndYear(latestEntry.round, latestEntry.year),
      }
    : null;

  // 4. Top Performers — season totals for latest year
  const currentYear = latestEntry?.year ?? new Date().getFullYear();

  const topByDisposals = db
    .select({
      playerName: players.name,
      teamId: players.teamId,
      total: sql<number>`cast(sum(${playerStats.disposals}) as int)`,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(eq(matches.year, currentYear))
    .groupBy(players.id)
    .orderBy(desc(sql`sum(${playerStats.disposals})`))
    .limit(5)
    .all();

  const topByGoals = db
    .select({
      playerName: players.name,
      teamId: players.teamId,
      total: sql<number>`cast(sum(${playerStats.goals}) as int)`,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(eq(matches.year, currentYear))
    .groupBy(players.id)
    .orderBy(desc(sql`sum(${playerStats.goals})`))
    .limit(5)
    .all();

  const topByFantasy = db
    .select({
      playerName: players.name,
      teamId: players.teamId,
      total: sql<number>`cast(sum(${playerStats.aflFantasyPts}) as int)`,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(matches, eq(playerStats.matchId, matches.id))
    .where(eq(matches.year, currentYear))
    .groupBy(players.id)
    .orderBy(desc(sql`sum(${playerStats.aflFantasyPts})`))
    .limit(5)
    .all();

  // 5. API Usage Snapshot for current user
  let apiSnapshot: {
    apiUsage: number;
    apiLimit: number | null;
    activeKeys: number;
    totalKeys: number;
  } | null = null;
  const userEmail = (locals as any).session?.user?.email;
  if (userEmail) {
    const user = db.select().from(users).where(eq(kaliUsers.email, userEmail)).get();
    if (user) {
      const keys = listApiKeysForUser(user.id);
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
