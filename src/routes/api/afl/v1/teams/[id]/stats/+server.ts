import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { listResponse, parseListQuery, q } from '$lib/api/v1';
import { getTeamById, getTeamStatsPaginated } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, params, url }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	const team = await getTeamById(params.id);
	if (!team) {
		return json({ error: 'Team not found' }, { status: 404 });
	}

	const query = parseListQuery(url, {
		year: q.int(),
		round: q.int({ min: 0 })
	});
	if (query instanceof Response) return query;

	return listResponse(await getTeamStatsPaginated({ teamId: params.id, ...query }), query);
};
