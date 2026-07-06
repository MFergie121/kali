import { requireApiKey } from '$lib/api/auth';
import { listResponse, parseListQuery, q } from '$lib/api/v1';
import { getMatchesPaginated } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, url }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	const query = parseListQuery(url, {
		year: q.int(),
		round: q.int({ min: 0 }),
		teamId: q.string(),
		venue: q.string(),
		dateFrom: q.string(),
		dateTo: q.string()
	});
	if (query instanceof Response) return query;

	return listResponse(await getMatchesPaginated(query), query);
};
