import { requireApiKey } from '$lib/api/auth';
import { parseId, parseQuery, q, resource } from '$lib/api/v1';
import { getPlayerSeasonStats } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, params, url }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	const id = parseId(params.id);
	if (id instanceof Response) return id;

	const query = parseQuery(url, { year: q.int({ required: true }) });
	if (query instanceof Response) return query;

	return resource(await getPlayerSeasonStats(id, query.year), 'Player');
};
