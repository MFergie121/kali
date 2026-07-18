import { describe, expect, it } from "vitest";
import {
  BLEND,
  MIN_CAREER_GAMES,
  WIN_ADJ_K,
  predictPlayer,
  rankShowcase,
  relativeDeviation,
  resolveWinProbability,
  teamWinProbability,
  tipsterConsensus,
  winMultiplier,
  type DeviationCandidate,
  type SampledGame,
  type ShowcaseStatKey,
  type StatKey,
} from "./legs-engine";

// A game with every stat at `v` unless overridden; matchId auto-derived per call.
let nextMatchId = 1;
function game(over: Partial<SampledGame> & { v?: number } = {}): SampledGame {
  const v = over.v ?? 0;
  return {
    matchId: over.matchId ?? nextMatchId++,
    year: over.year ?? 2025,
    round: over.round ?? 1,
    opponentTeamId: over.opponentTeamId ?? "brisbane",
    opponentShortName: over.opponentShortName ?? "Lions",
    isHome: over.isHome ?? true,
    date: over.date ?? null,
    tackles: over.tackles ?? v,
    marks: over.marks ?? v,
    goals: over.goals ?? v,
    disposals: over.disposals ?? v,
    kicks: over.kicks ?? v,
    handballs: over.handballs ?? v,
    clearances: over.clearances ?? v,
    fantasyPoints: over.fantasyPoints ?? v,
  };
}

function expected(p: ReturnType<typeof predictPlayer>, stat: StatKey): number {
  return p.projections.find((x) => x.stat === stat)!.expected;
}
function safeLine(p: ReturnType<typeof predictPlayer>, stat: StatKey): number {
  return p.projections.find((x) => x.stat === stat)!.safeLine;
}

const neutralWin = { teamWinProb: 0.5, source: "neutral" as const };

describe("winMultiplier", () => {
  it("is 1 at a coin-flip", () => {
    expect(winMultiplier(0.5, false)).toBe(1);
    expect(winMultiplier(0.5, true)).toBe(1);
  });

  it("caps at ±7% at certainty and inverts for tackles", () => {
    expect(winMultiplier(1, false)).toBeCloseTo(1 + WIN_ADJ_K / 2); // +7%
    expect(winMultiplier(0, false)).toBeCloseTo(1 - WIN_ADJ_K / 2); // -7%
    // tackles move the opposite way
    expect(winMultiplier(1, true)).toBeCloseTo(1 - WIN_ADJ_K / 2);
    expect(winMultiplier(0, true)).toBeCloseTo(1 + WIN_ADJ_K / 2);
  });
});

describe("teamWinProbability", () => {
  it("takes the complement for away teams", () => {
    expect(teamWinProbability(0.7, true)).toBeCloseTo(0.7);
    expect(teamWinProbability(0.7, false)).toBeCloseTo(0.3);
  });
});

describe("predictPlayer — blend", () => {
  it("weights recent form and head-to-head 50/50", () => {
    // recent mean disposals = 20, h2h mean disposals = 10 ⇒ blend = 15
    const recentGames = [game({ v: 20 }), game({ v: 20 }), game({ v: 20 }), game({ v: 20 })];
    const h2hGames = [game({ v: 10 }), game({ v: 10 }), game({ v: 10 })];
    const p = predictPlayer({ recentGames, h2hGames, win: neutralWin });
    expect(expected(p, "disposals")).toBeCloseTo(15);
    expect(p.lowSample).toBe(false);
    expect(p.lowSampleReasons).toEqual([]);
  });

  it("falls back to 100% recent form with no head-to-head, flagged low-sample", () => {
    const recentGames = [game({ v: 20 }), game({ v: 20 }), game({ v: 20 }), game({ v: 20 })];
    const p = predictPlayer({ recentGames, h2hGames: [], win: neutralWin });
    expect(expected(p, "disposals")).toBeCloseTo(20);
    expect(p.lowSample).toBe(true);
    expect(p.lowSampleReasons).toContain("no-h2h");
  });

  it("uses however many recent games exist (short history) and flags it", () => {
    const recentGames = [game({ v: 12 }), game({ v: 18 })]; // mean 15, only 2 games
    const p = predictPlayer({ recentGames, h2hGames: [], win: neutralWin });
    expect(expected(p, "disposals")).toBeCloseTo(15);
    expect(p.lowSampleReasons).toContain("few-recent");
    expect(p.recentSample.length).toBe(2);
  });

  it("only samples the last 4 recent and last 3 head-to-head games", () => {
    const recentGames = [
      game({ v: 30 }),
      game({ v: 30 }),
      game({ v: 30 }),
      game({ v: 30 }),
      game({ v: 0 }), // 5th, must be ignored
    ];
    const h2hGames = [game({ v: 10 }), game({ v: 10 }), game({ v: 10 }), game({ v: 0 })];
    const p = predictPlayer({ recentGames, h2hGames, win: neutralWin });
    // recent mean 30, h2h mean 10 ⇒ 20
    expect(expected(p, "disposals")).toBeCloseTo(20);
    expect(p.recentSample.length).toBe(BLEND.recentWindow);
    expect(p.h2hSample.length).toBe(BLEND.h2hWindow);
  });
});

describe("predictPlayer — win adjustment", () => {
  it("nudges stats up for a likely winner but tackles down", () => {
    const recentGames = [game({ v: 100 }), game({ v: 100 }), game({ v: 100 }), game({ v: 100 })];
    const p = predictPlayer({
      recentGames,
      h2hGames: [],
      win: { teamWinProb: 1, source: "model" },
    });
    // +7% for a normal stat, -7% for tackles
    expect(expected(p, "disposals")).toBeCloseTo(107);
    expect(expected(p, "tackles")).toBeCloseTo(93);
  });

  it("caps the swing at ±7% even at certainty", () => {
    const recentGames = [game({ v: 100 })];
    const up = predictPlayer({
      recentGames,
      h2hGames: [],
      win: { teamWinProb: 1, source: "model" },
    });
    const down = predictPlayer({
      recentGames,
      h2hGames: [],
      win: { teamWinProb: 0, source: "model" },
    });
    expect(expected(up, "disposals")).toBeLessThanOrEqual(107.0001);
    expect(expected(down, "disposals")).toBeGreaterThanOrEqual(92.9999);
  });
});

describe("predictPlayer — safe line", () => {
  it("is the min across the deduplicated union, floored", () => {
    const recentGames = [game({ disposals: 18 }), game({ disposals: 22 }), game({ disposals: 25 })];
    const h2hGames = [game({ disposals: 15 }), game({ disposals: 30 })];
    const p = predictPlayer({ recentGames, h2hGames, win: neutralWin });
    // min of {18,22,25,15,30} = 15, neutral multiplier ⇒ 15
    expect(safeLine(p, "disposals")).toBe(15);
  });

  it("floors after the win adjustment", () => {
    const recentGames = [game({ disposals: 20 }), game({ disposals: 24 })];
    const p = predictPlayer({
      recentGames,
      h2hGames: [],
      win: { teamWinProb: 0, source: "model" }, // -7%
    });
    // min 20 × 0.93 = 18.6 ⇒ floor 18
    expect(safeLine(p, "disposals")).toBe(18);
  });

  it("does not double-count a game shared by both samples", () => {
    const shared = game({ disposals: 10, matchId: 999 });
    const p = predictPlayer({
      recentGames: [shared, game({ disposals: 40 })],
      h2hGames: [shared],
      win: neutralWin,
    });
    // union min is 10; the shared game is not weighted twice into anything odd
    expect(safeLine(p, "disposals")).toBe(10);
  });
});

describe("relativeDeviation", () => {
  it("clamps the denominator so tiny baselines don't explode", () => {
    // average 0.2 goals, predicted 1.2 ⇒ (1.2-0.2)/max(0.2,1) = 1.0, not 5.0
    expect(relativeDeviation(1.2, 0.2)).toBeCloseTo(1.0);
    // healthy baseline uses the real denominator
    expect(relativeDeviation(30, 20)).toBeCloseTo(0.5);
  });
});

describe("rankShowcase", () => {
  type StatMap = Partial<Record<ShowcaseStatKey, number>>;
  // Unspecified stats sit at a neutral value where predicted === average, so
  // their deviation is 0 and they never win the "largest deviation" selection.
  const NEUTRAL = 10;
  function fill(m: StatMap = {}): Record<ShowcaseStatKey, number> {
    return {
      tackles: NEUTRAL,
      disposals: NEUTRAL,
      marks: NEUTRAL,
      goals: NEUTRAL,
      fantasyPoints: NEUTRAL,
      ...m,
    };
  }
  function candidate(
    playerId: number,
    over: { careerGames?: number; predicted?: StatMap; average?: StatMap },
  ): DeviationCandidate {
    return {
      playerId,
      careerGames: over.careerGames ?? 50,
      predicted: fill(over.predicted),
      average: fill(over.average),
    };
  }

  it("keeps one entry per player: their largest absolute deviation stat", () => {
    const c = candidate(1, {
      predicted: { tackles: 8, disposals: 21, goals: 1 }, // tackles +100%, disp +5%
      average: { tackles: 4, disposals: 20, goals: 1 },
    });
    const [row] = rankShowcase([c]);
    expect(row.stat).toBe("tackles");
    expect(row.direction).toBe("up");
    expect(row.deviation).toBeCloseTo(1);
  });

  it("excludes players below the minimum career games", () => {
    const rookie = candidate(1, {
      careerGames: MIN_CAREER_GAMES - 1,
      predicted: { tackles: 20, disposals: 20, goals: 1 },
      average: { tackles: 2, disposals: 20, goals: 1 },
    });
    expect(rankShowcase([rookie])).toHaveLength(0);
  });

  it("ranks by relative deviation so goals can beat disposals", () => {
    const bigGoals = candidate(1, {
      predicted: { tackles: 4, disposals: 20, goals: 3 }, // +200%
      average: { tackles: 4, disposals: 20, goals: 1 },
    });
    const bigDisposals = candidate(2, {
      predicted: { tackles: 4, disposals: 26, goals: 1 }, // +30%
      average: { tackles: 4, disposals: 20, goals: 1 },
    });
    const ranked = rankShowcase([bigDisposals, bigGoals]);
    expect(ranked[0].playerId).toBe(1);
    expect(ranked[0].stat).toBe("goals");
  });

  it("captures downward deviations too", () => {
    const cold = candidate(1, {
      predicted: { tackles: 4, disposals: 8, goals: 1 },
      average: { tackles: 4, disposals: 20, goals: 1 },
    });
    const [row] = rankShowcase([cold]);
    expect(row.stat).toBe("disposals");
    expect(row.direction).toBe("down");
    expect(row.deviation).toBeLessThan(0);
  });

  it("truncates to the requested size", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      candidate(i + 1, {
        predicted: { tackles: 4 + i, disposals: 20, goals: 1 },
        average: { tackles: 4, disposals: 20, goals: 1 },
      }),
    );
    expect(rankShowcase(many, null, 10)).toHaveLength(10);
  });

  it("filters to a single stat, ranking by that stat's deviation only", () => {
    // A deviates hugely on tackles but modestly on disposals.
    const a = candidate(1, {
      predicted: { tackles: 12, disposals: 22 },
      average: { tackles: 4, disposals: 20 },
    });
    // B deviates most on disposals.
    const b = candidate(2, {
      predicted: { tackles: 4, disposals: 34 },
      average: { tackles: 4, disposals: 20 },
    });
    const ranked = rankShowcase([a, b], "disposals");
    expect(ranked.every((r) => r.stat === "disposals")).toBe(true);
    // B's disposals deviation (+70%) beats A's (+10%) despite A's huge tackles.
    expect(ranked[0].playerId).toBe(2);
  });

  it("filter still gates on career games and truncates to size", () => {
    const rookie = candidate(1, {
      careerGames: MIN_CAREER_GAMES - 1,
      predicted: { goals: 5 },
      average: { goals: 1 },
    });
    expect(rankShowcase([rookie], "goals")).toHaveLength(0);

    const many = Array.from({ length: 15 }, (_, i) =>
      candidate(i + 1, { predicted: { marks: 5 + i }, average: { marks: 5 } }),
    );
    expect(rankShowcase(many, "marks", 10)).toHaveLength(10);
  });

  it("ranks the newly featured stats (marks, fantasy)", () => {
    const c = candidate(1, {
      predicted: { fantasyPoints: 150 },
      average: { fantasyPoints: 90 },
    });
    const [row] = rankShowcase([c], "fantasyPoints");
    expect(row.stat).toBe("fantasyPoints");
    expect(row.direction).toBe("up");
  });
});

describe("tipsterConsensus", () => {
  it("returns null with no tips", () => {
    expect(tipsterConsensus([])).toBeNull();
  });

  it("averages the latest snapshot per source", () => {
    const prob = tipsterConsensus([
      { source: "a", hconfidence: 60, syncedAt: "2025-01-01T00:00:00Z" },
      { source: "b", hconfidence: 80, syncedAt: "2025-01-01T00:00:00Z" },
    ]);
    expect(prob).toBeCloseTo(0.7); // (60+80)/2 /100
  });

  it("deduplicates re-synced tipsters to their latest snapshot", () => {
    const prob = tipsterConsensus([
      { source: "a", hconfidence: 10, syncedAt: "2025-01-01T00:00:00Z" }, // stale
      { source: "a", hconfidence: 90, syncedAt: "2025-01-02T00:00:00Z" }, // latest
      { source: "b", hconfidence: 50, syncedAt: "2025-01-01T00:00:00Z" },
    ]);
    // only a=90 and b=50 count ⇒ 0.7, the stale a=10 is ignored
    expect(prob).toBeCloseTo(0.7);
  });
});

describe("resolveWinProbability", () => {
  it("prefers tipster consensus", () => {
    expect(resolveWinProbability(0.62, 500)).toEqual({
      homeWinProb: 0.62,
      source: "tipster",
    });
  });

  it("normalises the per-mille model probability when tips are absent", () => {
    expect(resolveWinProbability(null, 723)).toEqual({
      homeWinProb: 0.723,
      source: "model",
    });
  });

  it("falls back to a neutral coin-flip", () => {
    expect(resolveWinProbability(null, null)).toEqual({
      homeWinProb: 0.5,
      source: "neutral",
    });
  });
});
