// Pure time/quota math for the per-user API quota. No SvelteKit/DB imports so it
// can be unit-tested directly (see quota-window.test.ts). `now` is injected for
// determinism, following the analytics-utils precedent.

/**
 * The next 00:00 UTC boundary strictly after `now`, as an ISO 8601 string.
 * Calendar-aligned (not a rolling 24h window) so the reset is documentable.
 * Exactly midnight rolls forward to the following midnight.
 */
export function nextResetAt(now: Date = new Date()): string {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return next.toISOString();
}

/**
 * True when the current window has ended, i.e. `now` has reached or passed the
 * stored `reset_at` boundary.
 */
export function isWindowExpired(
  resetAt: string,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= new Date(resetAt).getTime();
}

export interface RateLimitHeaderValues {
  /** The configured ceiling, or null for unlimited. */
  limit: number | null;
  /** Requests remaining in the current window, clamped at 0. */
  remaining: number | null;
  /** The reset boundary as epoch seconds. */
  resetEpoch: number;
  /** Seconds until the window resets, clamped at 0. */
  retryAfter: number;
}

/**
 * Derive the values for the `X-RateLimit-*` / `Retry-After` headers from the
 * post-update quota figures. `remaining` and `retryAfter` are clamped at 0 so a
 * boundary-crossing or over-count never emits a negative number.
 */
export function rateLimitHeaders({
  limit,
  usage,
  resetAt,
  now = new Date(),
}: {
  limit: number | null;
  usage: number;
  resetAt: string;
  now?: Date;
}): RateLimitHeaderValues {
  const resetMs = new Date(resetAt).getTime();
  const resetEpoch = Math.floor(resetMs / 1000);
  const retryAfter = Math.max(0, Math.ceil((resetMs - now.getTime()) / 1000));
  const remaining = limit === null ? null : Math.max(0, limit - usage);

  return { limit, remaining, resetEpoch, retryAfter };
}
