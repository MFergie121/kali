import { dev } from "$app/environment";
import type { Handle } from "@sveltejs/kit";
import { recordApiRequest } from "$lib/db/afl/service";
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
