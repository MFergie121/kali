import { dev } from "$app/environment";
import type { Handle } from "@sveltejs/kit";
import {
  bumpKeyUsage,
  recordApiRequest,
  refundUserQuota,
} from "$lib/db/afl/service";
import { isRefundable } from "$lib/api/refund";
import { getSession, type UserSession } from "./auth";

export const handle: Handle = async ({ event, resolve }) => {
  let cached: UserSession | null | undefined;

  event.locals.auth = async () => {
    if (cached === undefined) {
      cached = await getSession(event.cookies);
    }
    return cached;
  };

  if (
    dev &&
    event.url.pathname === "/.well-known/appspecific/com.chrome.devtools.json"
  ) {
    return new Response(undefined, { status: 404 });
  }

  // Analytics: log every request to the public v1 API surface. The write is
  // fire-and-forget so it can never slow down or break a consumer's response.
  if (event.url.pathname.startsWith("/api/afl/v1/")) {
    const start = performance.now();
    const response = await resolve(event);

    // Quota bookkeeping + headers, all off the latency path. Only runs when the
    // request passed the gate (requireApiKey set apiKeyId/userId); 401/429
    // short-circuits never reach here with identity set.
    const rl = event.locals.rateLimit;
    if (rl) {
      if (rl.limit !== null) {
        response.headers.set("X-RateLimit-Limit", String(rl.limit));
      }
      if (rl.remaining !== null) {
        response.headers.set("X-RateLimit-Remaining", String(rl.remaining));
      }
      response.headers.set(
        "X-RateLimit-Reset",
        String(Math.floor(new Date(rl.resetAt).getTime() / 1000)),
      );
    }

    const apiKeyId = event.locals.apiKeyId;
    const userId = event.locals.userId;
    if (apiKeyId) {
      bumpKeyUsage(apiKeyId).catch((err) =>
        console.error("[quota] bumpKeyUsage failed", err),
      );
    }
    // Refund the user bucket for failures that are our fault (5xx).
    if (userId && isRefundable(response.status)) {
      refundUserQuota(userId).catch((err) =>
        console.error("[quota] refundUserQuota failed", err),
      );
    }

    recordApiRequest({
      timestamp: new Date().toISOString(),
      apiKeyId: event.locals.apiKeyId ?? null,
      userId: event.locals.userId ?? null,
      routeId: event.route.id ?? event.url.pathname,
      method: event.request.method,
      status: response.status,
      latencyMs: Math.round(performance.now() - start),
      responseBytes: Number(response.headers.get("content-length") ?? 0),
      queryString: event.url.search ? event.url.search.slice(1) : null,
    }).catch((err) => console.error("[analytics] record failed", err));

    return response;
  }

  return resolve(event);
};
