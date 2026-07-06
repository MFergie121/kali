import { requireApiKey } from '$lib/api/auth';
import { listResponse, parseListQuery, q } from '$lib/api/v1';
import { getHeadToHead } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, url }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	const query = parseListQuery(url, {
		teamA: q.string({ required: true }),
		teamB: q.string({ required: true }),
		year: q.int(),
		venue: q.string()
	});
	if (query instanceof Response) return query;

	return listResponse(await getHeadToHead(query), query);
};
