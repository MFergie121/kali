import { describe, expect, it } from "vitest";
import { parseIdParam, parsePagination, parseQueryParams, q, wireName } from "./query";

function params(qs: string): URLSearchParams {
  return new URLSearchParams(qs);
}

describe("wireName", () => {
  it("converts camelCase spec keys to snake_case wire names", () => {
    expect(wireName("teamId")).toBe("team_id");
    expect(wireName("dateFrom")).toBe("date_from");
    expect(wireName("modelVersion")).toBe("model_version");
    expect(wireName("year")).toBe("year");
  });

  it("prefers an explicit override", () => {
    expect(wireName("teamId", "club")).toBe("club");
  });
});

describe("parsePagination", () => {
  it("defaults to limit 50, offset 0", () => {
    expect(parsePagination(params(""))).toEqual({ limit: 50, offset: 0 });
  });

  it("passes valid values through", () => {
    expect(parsePagination(params("limit=25&offset=100"))).toEqual({
      limit: 25,
      offset: 100,
    });
  });

  it("never errors: non-numeric input falls back to defaults", () => {
    expect(parsePagination(params("limit=abc&offset=xyz"))).toEqual({
      limit: 50,
      offset: 0,
    });
  });

  it("clamps limit to 1–200", () => {
    expect(parsePagination(params("limit=500")).limit).toBe(200);
    expect(parsePagination(params("limit=-5")).limit).toBe(1);
  });

  it("treats limit=0 as unset (falls back to 50)", () => {
    expect(parsePagination(params("limit=0")).limit).toBe(50);
  });

  it("clamps negative offset to 0", () => {
    expect(parsePagination(params("offset=-3")).offset).toBe(0);
  });
});

describe("q.int", () => {
  it("parses an optional int and leaves it undefined when absent", () => {
    const spec = { year: q.int() };
    expect(parseQueryParams(params("year=2024"), spec)).toEqual({
      ok: true,
      value: { year: 2024 },
    });
    expect(parseQueryParams(params(""), spec)).toEqual({
      ok: true,
      value: { year: undefined },
    });
  });

  it("treats an empty value as absent", () => {
    expect(parseQueryParams(params("year="), { year: q.int() })).toEqual({
      ok: true,
      value: { year: undefined },
    });
  });

  it("rejects non-numeric and below-minimum values with the positive-integer message", () => {
    const spec = { year: q.int() };
    for (const qs of ["year=abc", "year=0", "year=-1"]) {
      expect(parseQueryParams(params(qs), spec)).toEqual({
        ok: false,
        status: 400,
        message: "Bad request: year must be a positive integer",
      });
    }
  });

  it("uses the non-negative-integer message when min is 0", () => {
    const spec = { round: q.int({ min: 0 }) };
    expect(parseQueryParams(params("round=0"), spec)).toEqual({
      ok: true,
      value: { round: 0 },
    });
    expect(parseQueryParams(params("round=-1"), spec)).toEqual({
      ok: false,
      status: 400,
      message: "Bad request: round must be a non-negative integer",
    });
  });

  it("keeps parseInt semantics for trailing garbage", () => {
    expect(parseQueryParams(params("year=2024abc"), { year: q.int() })).toEqual({
      ok: true,
      value: { year: 2024 },
    });
  });
});

describe("q.string", () => {
  it("passes values through and defaults to undefined", () => {
    const spec = { venue: q.string() };
    expect(parseQueryParams(params("venue=MCG"), spec)).toEqual({
      ok: true,
      value: { venue: "MCG" },
    });
    expect(parseQueryParams(params(""), spec)).toEqual({
      ok: true,
      value: { venue: undefined },
    });
  });

  it("passes an empty optional string through unchanged", () => {
    expect(parseQueryParams(params("venue="), { venue: q.string() })).toEqual({
      ok: true,
      value: { venue: "" },
    });
  });
});

describe("q.enum", () => {
  const stats = ["kicks", "marks", "goals"];

  it("accepts listed values and rejects others with the valid-values message", () => {
    const spec = { stat: q.enum(stats) };
    expect(parseQueryParams(params("stat=kicks"), spec)).toEqual({
      ok: true,
      value: { stat: "kicks" },
    });
    expect(parseQueryParams(params("stat=nope"), spec)).toEqual({
      ok: false,
      status: 400,
      message: "Bad request: invalid stat 'nope'. Valid values: kicks, marks, goals",
    });
  });

  it("lists valid values in the required message", () => {
    const spec = { stat: q.enum(stats, { required: true }) };
    expect(parseQueryParams(params(""), spec)).toEqual({
      ok: false,
      status: 400,
      message: "Bad request: stat is required. Valid values: kicks, marks, goals",
    });
  });
});

describe("q.order", () => {
  it("accepts asc/desc, rejects anything else, undefined when absent", () => {
    const spec = { order: q.order() };
    expect(parseQueryParams(params("order=asc"), spec)).toEqual({
      ok: true,
      value: { order: "asc" },
    });
    expect(parseQueryParams(params("order=desc"), spec)).toEqual({
      ok: true,
      value: { order: "desc" },
    });
    expect(parseQueryParams(params(""), spec)).toEqual({
      ok: true,
      value: { order: undefined },
    });
    expect(parseQueryParams(params("order=up"), spec)).toEqual({
      ok: false,
      status: 400,
      message: "Bad request: order must be 'asc' or 'desc'",
    });
  });
});

describe("q.bool", () => {
  it("is lenient: true/false parse, anything else is undefined", () => {
    const spec = { settled: q.bool() };
    expect(parseQueryParams(params("settled=true"), spec)).toEqual({
      ok: true,
      value: { settled: true },
    });
    expect(parseQueryParams(params("settled=false"), spec)).toEqual({
      ok: true,
      value: { settled: false },
    });
    expect(parseQueryParams(params("settled=maybe"), spec)).toEqual({
      ok: true,
      value: { settled: undefined },
    });
  });
});

describe("required params", () => {
  it("names every required param when any is missing", () => {
    const spec = { teamA: q.string({ required: true }), teamB: q.string({ required: true }) };
    const expected = {
      ok: false,
      status: 400,
      message: "Bad request: team_a and team_b are required",
    };
    expect(parseQueryParams(params(""), spec)).toEqual(expected);
    expect(parseQueryParams(params("team_a=carlton"), spec)).toEqual(expected);
  });

  it("uses the singular message for a single required param", () => {
    expect(parseQueryParams(params(""), { year: q.int({ required: true }) })).toEqual({
      ok: false,
      status: 400,
      message: "Bad request: year is required",
    });
  });

  it("treats an empty required value as missing", () => {
    expect(parseQueryParams(params("year="), { year: q.int({ required: true }) })).toEqual({
      ok: false,
      status: 400,
      message: "Bad request: year is required",
    });
  });

  it("reports missing required params before value errors", () => {
    const spec = { year: q.int(), round: q.int({ required: true }) };
    expect(parseQueryParams(params("year=abc"), spec)).toEqual({
      ok: false,
      status: 400,
      message: "Bad request: round is required",
    });
  });
});

describe("parseQueryParams", () => {
  it("reports the first invalid param in spec order", () => {
    const spec = { matchId: q.int(), playerId: q.int() };
    expect(parseQueryParams(params("match_id=abc&player_id=xyz"), spec)).toEqual({
      ok: false,
      status: 400,
      message: "Bad request: match_id must be a positive integer",
    });
  });

  it("parses a realistic multi-param query", () => {
    const spec = {
      year: q.int(),
      round: q.int({ min: 0 }),
      teamId: q.string(),
      sortBy: q.enum(["kicks", "goals"]),
      order: q.order(),
    };
    expect(
      parseQueryParams(params("year=2025&round=0&team_id=richmond&sort_by=goals&order=desc"), spec),
    ).toEqual({
      ok: true,
      value: { year: 2025, round: 0, teamId: "richmond", sortBy: "goals", order: "desc" },
    });
  });
});

describe("parseIdParam", () => {
  it("parses a positive integer id", () => {
    expect(parseIdParam("42")).toEqual({ ok: true, value: 42 });
  });

  it("rejects non-numeric, zero, and negative ids", () => {
    for (const raw of ["abc", "0", "-1"]) {
      expect(parseIdParam(raw)).toEqual({
        ok: false,
        status: 400,
        message: "Bad request: id must be a positive integer",
      });
    }
  });
});
