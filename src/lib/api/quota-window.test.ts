import { describe, expect, it } from "vitest";
import { isWindowExpired, nextResetAt, rateLimitHeaders } from "./quota-window";

describe("nextResetAt", () => {
  it("returns the next 00:00 UTC boundary for a mid-day time", () => {
    expect(nextResetAt(new Date("2026-06-08T13:24:55.000Z"))).toBe(
      "2026-06-09T00:00:00.000Z",
    );
  });

  it("rolls forward from the 23:59 edge", () => {
    expect(nextResetAt(new Date("2026-06-08T23:59:59.999Z"))).toBe(
      "2026-06-09T00:00:00.000Z",
    );
  });

  it("rolls exact midnight forward to the following midnight", () => {
    expect(nextResetAt(new Date("2026-06-08T00:00:00.000Z"))).toBe(
      "2026-06-09T00:00:00.000Z",
    );
  });

  it("crosses month boundaries", () => {
    expect(nextResetAt(new Date("2026-06-30T12:00:00.000Z"))).toBe(
      "2026-07-01T00:00:00.000Z",
    );
  });
});

describe("isWindowExpired", () => {
  const resetAt = "2026-06-09T00:00:00.000Z";

  it("is false before the boundary", () => {
    expect(isWindowExpired(resetAt, new Date("2026-06-08T23:59:59.999Z"))).toBe(
      false,
    );
  });

  it("is true exactly at the boundary", () => {
    expect(isWindowExpired(resetAt, new Date("2026-06-09T00:00:00.000Z"))).toBe(
      true,
    );
  });

  it("is true after the boundary", () => {
    expect(isWindowExpired(resetAt, new Date("2026-06-09T00:00:00.001Z"))).toBe(
      true,
    );
  });
});

describe("rateLimitHeaders", () => {
  const resetAt = "2026-06-09T00:00:00.000Z";
  const now = new Date("2026-06-08T23:00:00.000Z");

  it("computes remaining as limit minus usage", () => {
    const h = rateLimitHeaders({ limit: 5000, usage: 10, resetAt, now });
    expect(h.limit).toBe(5000);
    expect(h.remaining).toBe(4990);
  });

  it("clamps remaining at 0 when usage exceeds limit", () => {
    const h = rateLimitHeaders({ limit: 5000, usage: 6000, resetAt, now });
    expect(h.remaining).toBe(0);
  });

  it("reports null remaining for an unlimited user", () => {
    const h = rateLimitHeaders({ limit: null, usage: 100, resetAt, now });
    expect(h.limit).toBeNull();
    expect(h.remaining).toBeNull();
  });

  it("emits resetEpoch as epoch seconds of the boundary", () => {
    const h = rateLimitHeaders({ limit: 5000, usage: 0, resetAt, now });
    expect(h.resetEpoch).toBe(Math.floor(Date.parse(resetAt) / 1000));
  });

  it("computes retryAfter as seconds until reset", () => {
    const h = rateLimitHeaders({ limit: 5000, usage: 0, resetAt, now });
    expect(h.retryAfter).toBe(3600);
  });

  it("clamps retryAfter at 0 once the boundary has passed", () => {
    const h = rateLimitHeaders({
      limit: 5000,
      usage: 0,
      resetAt,
      now: new Date("2026-06-09T01:00:00.000Z"),
    });
    expect(h.retryAfter).toBe(0);
  });
});
