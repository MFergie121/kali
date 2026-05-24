import { describe, expect, it } from "vitest";
import {
  DEFAULT_RANGE,
  enumerateV1Routes,
  parseRange,
} from "./analytics-utils";

const NOW = new Date("2026-05-23T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

describe("parseRange", () => {
  it("maps each preset to a since relative to now", () => {
    expect(parseRange("7d", NOW).since).toEqual(new Date(NOW.getTime() - 7 * DAY));
    expect(parseRange("30d", NOW).since).toEqual(
      new Date(NOW.getTime() - 30 * DAY),
    );
    expect(parseRange("90d", NOW).since).toEqual(
      new Date(NOW.getTime() - 90 * DAY),
    );
  });

  it("returns since: null for all-time", () => {
    const result = parseRange("all", NOW);
    expect(result.range).toBe("all");
    expect(result.since).toBeNull();
  });

  it("falls back to the 30d default for missing input", () => {
    const result = parseRange(null, NOW);
    expect(result.range).toBe(DEFAULT_RANGE);
    expect(result.since).toEqual(new Date(NOW.getTime() - 30 * DAY));
  });

  it("falls back to the 30d default for unknown input without throwing", () => {
    expect(() => parseRange("bogus", NOW)).not.toThrow();
    expect(parseRange("bogus", NOW).range).toBe("30d");
    expect(parseRange("", NOW).range).toBe("30d");
    expect(parseRange("7", NOW).range).toBe("30d");
  });
});

describe("enumerateV1Routes", () => {
  it("strips the /src/routes prefix and /+server.ts suffix", () => {
    expect(
      enumerateV1Routes(["/src/routes/api/afl/v1/matches/+server.ts"]),
    ).toEqual(["/api/afl/v1/matches"]);
  });

  it("preserves [param] segments verbatim", () => {
    expect(
      enumerateV1Routes([
        "/src/routes/api/afl/v1/players/[id]/career/+server.ts",
        "/src/routes/api/afl/v1/teams/[id]/+server.ts",
      ]),
    ).toEqual([
      "/api/afl/v1/players/[id]/career",
      "/api/afl/v1/teams/[id]",
    ]);
  });

  it("returns a sorted list", () => {
    expect(
      enumerateV1Routes([
        "/src/routes/api/afl/v1/teams/+server.ts",
        "/src/routes/api/afl/v1/matches/+server.ts",
      ]),
    ).toEqual(["/api/afl/v1/matches", "/api/afl/v1/teams"]);
  });
});
