import {
  getPerUserTotals,
  getRecentErrors,
  getTopEndpoints,
  getZeroTrafficRoutes,
} from "$lib/db/afl/service";
import { requireAdmin } from "$lib/server/admin";
import { enumerateV1Routes, parseRange } from "./analytics-utils";
import type { PageServerLoad } from "./$types";

// Eagerly glob the v1 endpoint files so we know the full set of known routes
// without maintaining a manual list. Keys look like
// `/src/routes/api/afl/v1/players/[id]/career/+server.ts`.
const v1RouteFiles = import.meta.glob("/src/routes/api/afl/v1/**/+server.ts");
const knownRoutes = enumerateV1Routes(Object.keys(v1RouteFiles));

export const load: PageServerLoad = async ({ locals, url }) => {
  await requireAdmin(locals);

  const { range, since } = parseRange(url.searchParams.get("range"));

  const [topEndpoints, zeroTrafficRoutes, recentErrors, perUserTotals] =
    await Promise.all([
      getTopEndpoints({ since }),
      getZeroTrafficRoutes({ since, knownRoutes }),
      getRecentErrors({ limit: 50 }),
      getPerUserTotals({ since }),
    ]);

  return {
    range,
    topEndpoints,
    zeroTrafficRoutes,
    recentErrors,
    perUserTotals,
  };
};
