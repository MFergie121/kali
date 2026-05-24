// Pure helpers for the API analytics page. Kept free of SvelteKit/DB imports so
// they can be unit-tested directly (see analytics-utils.test.ts).

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

export const DEFAULT_RANGE: AnalyticsRange = "30d";

export const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

const RANGE_DAYS: Record<Exclude<AnalyticsRange, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function isAnalyticsRange(value: string | null): value is AnalyticsRange {
  return value === "7d" || value === "30d" || value === "90d" || value === "all";
}

/**
 * Convert the `?range=` query param into a window. Unknown or missing input
 * falls back to the 30-day default. `all` returns `{ since: null }` (no filter).
 * `now` is injected for deterministic testing.
 */
export function parseRange(
  rangeParam: string | null,
  now: Date = new Date(),
): { range: AnalyticsRange; since: Date | null } {
  const range = isAnalyticsRange(rangeParam) ? rangeParam : DEFAULT_RANGE;
  if (range === "all") {
    return { range, since: null };
  }
  const since = new Date(now.getTime() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000);
  return { range, since };
}

/**
 * Turn `import.meta.glob('/src/routes/api/afl/v1/**\/+server.ts')` keys into the
 * route ID strings SvelteKit assigns to `event.route.id`, e.g.
 * `/src/routes/api/afl/v1/players/[id]/career/+server.ts`
 *   -> `/api/afl/v1/players/[id]/career`. `[param]` segments are preserved.
 */
export function enumerateV1Routes(globKeys: string[]): string[] {
  return globKeys
    .map((key) => key.replace(/^\/src\/routes/, "").replace(/\/\+server\.ts$/, ""))
    .sort();
}
