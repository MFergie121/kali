import { requireApiKey } from '$lib/api/auth';
import { listResponse, parseListQuery, q } from '$lib/api/v1';
import { getPlayerTeamAssignmentsPaginated } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, url }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	const query = parseListQuery(url, {
		playerId: q.int(),
		teamId: q.string(),
		year: q.int(),
		reason: q.string()
	});
	if (query instanceof Response) return query;

	return listResponse(await getPlayerTeamAssignmentsPaginated(query), query);
};
