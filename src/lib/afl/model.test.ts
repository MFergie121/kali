import { describe, expect, it } from "vitest";
import {
  applyResult,
  buildModelState,
  createModelState,
  DEFAULT_PARAMS,
  expectedResult,
  marginToResult,
  parseMatchDate,
  predictGame,
  type MatchResult,
  type ModelParams,
} from "./model";
import { normalizeVenue, venueState } from "./venues";

const P: ModelParams = { ...DEFAULT_PARAMS };

function match(over: Partial<MatchResult>): MatchResult {
  return {
    year: 2025,
    round: 1,
    homeTeamId: "geelong",
    awayTeamId: "brisbane",
    homeScore: 100,
    awayScore: 80,
    venue: "GMHBA Stadium",
    date: "2025-03-20 19:30:00",
    ...over,
  };
}

describe("parseMatchDate", () => {
  it("parses footywire wordy dates", () => {
    expect(parseMatchDate("Friday, 28th March 2003")).toBe(Date.UTC(2003, 2, 28));
    expect(parseMatchDate("Saturday, 1st April 2017")).toBe(Date.UTC(2017, 3, 1));
    expect(parseMatchDate("Sunday, 22nd June 2025")).toBe(Date.UTC(2025, 5, 22));
  });

  it("parses Squiggle ISO-ish datetimes to day precision", () => {
    expect(parseMatchDate("2026-03-05 19:30:00")).toBe(Date.UTC(2026, 2, 5));
  });

  it("returns null for garbage or missing input", () => {
    expect(parseMatchDate(null)).toBeNull();
    expect(parseMatchDate("")).toBeNull();
    expect(parseMatchDate("TBC")).toBeNull();
  });
});

describe("venue normalisation", () => {
  it("maps both data sources' names to one canonical key", () => {
    expect(normalizeVenue("MCG")).toBe("mcg");
    expect(normalizeVenue("M.C.G.")).toBe("mcg");
    expect(normalizeVenue("Marvel Stadium")).toBe("docklands");
    expect(normalizeVenue("Docklands")).toBe("docklands");
    expect(normalizeVenue("Optus Stadium")).toBe("perth-stadium");
    expect(normalizeVenue("Perth Stadium")).toBe("perth-stadium");
    expect(normalizeVenue("Cazaly's Stadium")).toBe("cazalys-stadium");
  });

  it("rejects weekday-polluted and empty venue values", () => {
    expect(normalizeVenue("Saturday")).toBeNull();
    expect(normalizeVenue("Sunday")).toBeNull();
    expect(normalizeVenue("")).toBeNull();
    expect(normalizeVenue(null)).toBeNull();
  });

  it("knows venue states for the travel factor", () => {
    expect(venueState("mcg")).toBe("VIC");
    expect(venueState("perth-stadium")).toBe("WA");
    expect(venueState(null)).toBeNull();
  });
});

describe("Elo primitives", () => {
  it("expectedResult is symmetric around 0.5", () => {
    expect(expectedResult(0)).toBeCloseTo(0.5);
    expect(expectedResult(100) + expectedResult(-100)).toBeCloseTo(1);
    expect(expectedResult(400)).toBeCloseTo(10 / 11);
  });

  it("marginToResult maps draw to 0.5 and is margin-monotonic", () => {
    expect(marginToResult(0, 40)).toBeCloseTo(0.5);
    expect(marginToResult(40, 40)).toBeGreaterThan(marginToResult(10, 40));
    expect(marginToResult(-25, 40)).toBeCloseTo(1 - marginToResult(25, 40));
  });
});

describe("Elo updates", () => {
  it("winner gains what the loser drops, bigger margins move more", () => {
    const s1 = createModelState(P);
    applyResult(s1, match({ homeScore: 100, awayScore: 90 }));
    const s2 = createModelState(P);
    applyResult(s2, match({ homeScore: 150, awayScore: 60 }));

    const narrowGain = s1.ratings.get("geelong")! - P.initialRating;
    const thumpGain = s2.ratings.get("geelong")! - P.initialRating;
    expect(narrowGain).toBeGreaterThan(0);
    expect(thumpGain).toBeGreaterThan(narrowGain);
    expect(s2.ratings.get("brisbane")! - P.initialRating).toBeCloseTo(-thumpGain);
  });

  it("an upset moves ratings more than an expected result", () => {
    const state = createModelState(P);
    // Make geelong strong first.
    for (let r = 1; r <= 5; r++) {
      applyResult(state, match({ round: r, homeScore: 120, awayScore: 70 }));
    }
    const strongBefore = state.ratings.get("geelong")!;
    const weakBefore = state.ratings.get("brisbane")!;
    expect(strongBefore).toBeGreaterThan(weakBefore + 100);

    // Now brisbane (away, weaker) wins by the same margin geelong kept winning by.
    applyResult(state, match({ round: 6, homeScore: 70, awayScore: 120 }));
    const upsetSwing = strongBefore - state.ratings.get("geelong")!;
    expect(upsetSwing).toBeGreaterThan(P.k * 0.5);
  });

  it("regresses toward the mean between seasons", () => {
    const state = createModelState(P);
    for (let r = 1; r <= 8; r++) {
      applyResult(state, match({ round: r, homeScore: 130, awayScore: 60 }));
    }
    const beforeRegression = state.ratings.get("geelong")!;
    applyResult(state, match({ year: 2026, round: 1, homeScore: 80, awayScore: 80 }));
    const afterDraw = state.ratings.get("geelong")!;
    // A draw between unequal teams costs the stronger side rating, so the drop
    // must be at least the pure regression amount.
    expect(beforeRegression - afterDraw).toBeGreaterThanOrEqual(
      (beforeRegression - P.initialRating) * P.seasonRegression * 0.99,
    );
    // Season history resets at the boundary: only the new season's game remains.
    expect(state.seasonEloHistory.get("geelong")!.length).toBe(1);
  });
});

describe("history window", () => {
	it("buildModelState drops matches older than historyYears", () => {
		const params = { ...P, historyYears: 5 };
		// Geelong dominant 6+ years before the latest input year...
		const ancient: MatchResult[] = [];
		for (let r = 1; r <= 8; r++) {
			ancient.push(match({ year: 2019, round: r, homeScore: 150, awayScore: 50 }));
		}
		// ...then a single recent draw sets the latest year to 2025.
		const recent = match({ year: 2025, round: 1, homeScore: 80, awayScore: 80 });

		const state = buildModelState([...ancient, recent], params);
		// The 2019 dominance leaves no trace: identical state to never seeing it.
		const withoutAncient = buildModelState([recent], params);
		expect(state.ratings.get("geelong")!).toBeCloseTo(
			withoutAncient.ratings.get("geelong")!,
			8,
		);
		expect(state.games.get("geelong")!.length).toBe(1);

		// The same matches inside the window do count.
		const inWindow = buildModelState(
			[...ancient.map((m) => ({ ...m, year: 2021 })), recent],
			params,
		);
		expect(inWindow.ratings.get("geelong")!).toBeGreaterThan(params.initialRating + 50);
	});
});

describe("predictGame", () => {
  it("gives the home side more than 50% between equal teams (home advantage)", () => {
    const state = createModelState(P);
    const pred = predictGame(state, match({}));
    expect(pred.homeProbability).toBeGreaterThan(50);
    expect(pred.predictedMargin).toBeGreaterThan(0);
  });

  it("contribution rows sum to the total edge that produced the probability", () => {
    const matches: MatchResult[] = [];
    for (let r = 1; r <= 10; r++) {
      matches.push(
        match({
          round: r,
          homeScore: 90 + r * 3,
          awayScore: 85,
          date: `2025-0${r < 8 ? 3 : 4}-${String((r * 7) % 28 + 1).padStart(2, "0")} 19:00:00`,
        }),
      );
    }
    const state = buildModelState(matches, P);
    const pred = predictGame(state, {
      year: 2025,
      round: 11,
      homeTeamId: "geelong",
      awayTeamId: "brisbane",
      venue: "M.C.G.",
      date: "2025-05-30 19:30:00",
    });
    const sum = pred.contributions.reduce((s, c) => s + c.value, 0);
    expect(sum).toBeCloseTo(pred.totalEdge, 0);
    expect(pred.homeProbability + 0).toBeCloseTo(
      Math.round(expectedResult(pred.totalEdge) * 1000) / 10,
      0,
    );
  });

  it("penalises the interstate traveller", () => {
    const state = createModelState(P);
    const atHome = predictGame(state, {
      year: 2025,
      round: 1,
      homeTeamId: "geelong",
      awayTeamId: "brisbane",
      venue: "MCG",
      date: null,
    });
    const travelRow = atHome.contributions.find((c) => c.key === "travel")!;
    // Brisbane travels QLD→VIC: positive (home) edge.
    expect(travelRow.value).toBeGreaterThan(0);
    expect(travelRow.label).toContain("Brisbane");

    const bothTravel = predictGame(state, {
      year: 2025,
      round: 1,
      homeTeamId: "geelong",
      awayTeamId: "brisbane",
      venue: "Adelaide Oval",
      date: null,
    });
    // Both interstate at a neutral ground: penalties cancel.
    expect(bothTravel.contributions.find((c) => c.key === "travel")!.value).toBe(0);
  });

  it("uses rest days from both date formats", () => {
    const state = createModelState(P);
    applyResult(
      state,
      match({ round: 1, date: "Friday, 16th May 2025", venue: "MCG" }),
    );
    const pred = predictGame(state, {
      year: 2025,
      round: 2,
      homeTeamId: "geelong",
      awayTeamId: "brisbane",
      venue: "MCG",
      date: "2025-05-24 19:30:00",
    });
    expect(pred.home.restDays).toBe(8);
    expect(pred.away.restDays).toBe(8);
    // Equal rest: no edge either way.
    expect(pred.contributions.find((c) => c.key === "rest")!.value).toBe(0);
  });

  it("tracks head-to-head from the home side's perspective", () => {
    const matches: MatchResult[] = [
      match({ round: 1, homeScore: 100, awayScore: 60 }),
      match({ round: 5, homeTeamId: "brisbane", awayTeamId: "geelong", homeScore: 70, awayScore: 90 }),
      match({ round: 9, homeScore: 80, awayScore: 85 }),
    ];
    const state = buildModelState(matches, P);
    const pred = predictGame(state, {
      year: 2025,
      round: 12,
      homeTeamId: "geelong",
      awayTeamId: "brisbane",
      venue: "MCG",
      date: null,
    });
    expect(pred.h2h).toEqual({ homeWins: 2, awayWins: 1, draws: 0 });
  });

  it("degrades gracefully with no history: only home advantage moves the number", () => {
    const state = createModelState(P);
    const pred = predictGame(state, {
      year: 2025,
      round: 1,
      homeTeamId: "geelong",
      awayTeamId: "brisbane",
      venue: null,
      date: null,
    });
    for (const c of pred.contributions) {
      if (c.key === "homeGround") expect(c.value).toBe(P.homeAdvantage);
      else expect(c.value).toBe(0);
    }
  });
});
