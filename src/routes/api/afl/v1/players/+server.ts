import { requireApiKey } from '$lib/api/auth';
import { listResponse, parseListQuery, q } from '$lib/api/v1';
import { getPlayersPaginated } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, url }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	const query = parseListQuery(url, {
		teamId: q.string(),
		name: q.string(),
		year: q.int()
	});
	if (query instanceof Response) return query;

	return listResponse(await getPlayersPaginated(query), query);
};
