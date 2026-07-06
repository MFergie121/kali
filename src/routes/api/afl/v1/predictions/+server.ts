import { requireApiKey } from "$lib/api/auth";
import { listResponse, parseListQuery, q } from "$lib/api/v1";
import { getPredictionsPaginated } from "$lib/db/afl/service";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, locals, url }) => {
  const denied = await requireApiKey(request, locals);
  if (denied) return denied;

  const query = parseListQuery(url, {
    year: q.int(),
    round: q.int({ min: 0 }),
    fixtureId: q.int(),
    teamId: q.string(),
    modelVersion: q.string(),
    settled: q.bool(),
  });
  if (query instanceof Response) return query;

  return listResponse(await getPredictionsPaginated(query), query);
};
