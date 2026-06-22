import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMatchStats, parseMatchAdvancedStats } from "./scraper";

// Real footywire HTML captured from ft_match_statistics?mid=9721 — Carlton v
// Richmond, Round 1 2019 at the MCG. These fixtures let the parsing logic (the
// part that silently breaks when footywire changes their markup) be exercised
// with no network and no DB. Re-capture the fixtures if footywire's HTML moves.
const basicHtml = readFileSync(
  new URL("./__fixtures__/match-9721-stats.html", import.meta.url),
  "utf8",
);
const advancedHtml = readFileSync(
  new URL("./__fixtures__/match-9721-advanced.html", import.meta.url),
  "utf8",
);

describe("parseMatchStats", () => {
  const result = parseMatchStats(basicHtml, 9721);

  it("parses match metadata", () => {
    expect(result.match).toMatchObject({
      mid: 9721,
      round: 1,
      year: 2019,
      venue: "MCG",
      crowd: 85016,
      homeScore: 64,
      awayScore: 97,
      startDatetime: null, // not present on the per-match page; set by caller
    });
    expect(result.match.homeTeam).toEqual({
      id: "carlton",
      name: "Carlton",
      shortName: "Carlton",
    });
    expect(result.match.awayTeam.id).toBe("richmond");
    expect(result.match.date).toContain("21st March 2019");
  });

  it("parses a full player stat line for both teams", () => {
    expect(result.homeStats).toHaveLength(22);
    expect(result.awayStats).toHaveLength(22);

    const cripps = result.homeStats.find(
      (s) => s.playerName === "Patrick Cripps",
    );
    expect(cripps).toEqual({
      playerName: "Patrick Cripps",
      onlineId: "patrick-cripps",
      teamId: "carlton",
      kicks: 10,
      handballs: 22,
      disposals: 32,
      marks: 1,
      goals: 0,
      behinds: 0,
      tackles: 6,
      hitouts: 0,
      goalAssists: 0,
      inside50s: 2,
      clearances: 7,
      clangers: 3,
      rebound50s: 2,
      freesFor: 3,
      freesAgainst: 1,
      aflFantasyPts: 101,
      supercoachPts: 126,
    });
  });

  it("derives a transfer-stable onlineId from the player href", () => {
    // onlineId comes from the slug after "--" in the href, not the team slug,
    // so it survives a player changing clubs.
    expect(
      result.awayStats.every((s) => s.onlineId.length > 0 && s.teamId === "richmond"),
    ).toBe(true);
  });

  it("throws on HTML with no score table", () => {
    expect(() => parseMatchStats("<html><body>nope</body></html>", 1)).toThrow();
  });
});

describe("parseMatchAdvancedStats", () => {
  const result = parseMatchAdvancedStats(advancedHtml, 9721);

  it("parses the 17-column advanced stat line", () => {
    expect(result.homeAdvStats).toHaveLength(22);
    expect(result.awayAdvStats).toHaveLength(22);

    const cripps = result.homeAdvStats.find(
      (s) => s.playerName === "Patrick Cripps",
    );
    expect(cripps).toEqual({
      playerName: "Patrick Cripps",
      onlineId: "patrick-cripps",
      teamId: "carlton",
      contestedPossessions: 21,
      uncontestedPossessions: 11,
      effectiveDisposals: 26,
      disposalEfficiencyPct: 81,
      contestedMarks: 0,
      goalAssists: 0,
      marksInside50: 0,
      onePercenters: 0,
      bounces: 1,
      centreClearances: 4,
      stoppageClearances: 3,
      scoreInvolvements: 5,
      metresGained: 263,
      turnovers: 3,
      intercepts: 4,
      tacklesInside50: 0,
      timeOnGroundPct: 89,
    });
  });

  it("reads the same match metadata as the basic page", () => {
    expect(result.match).toMatchObject({
      mid: 9721,
      round: 1,
      year: 2019,
      venue: "MCG",
    });
  });
});
