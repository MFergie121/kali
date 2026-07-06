import { requireApiKey } from '$lib/api/auth';
import { listResponse, parseListQuery, q } from '$lib/api/v1';
import { getPlayerAdvancedStatsPaginated, VALID_PLAYER_ADVANCED_STAT_SORT_KEYS } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, url }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	const query = parseListQuery(url, {
		matchId: q.int(),
		playerId: q.int(),
		year: q.int(),
		round: q.int({ min: 0 }),
		teamId: q.string(),
		sortBy: q.enum(VALID_PLAYER_ADVANCED_STAT_SORT_KEYS),
		order: q.order()
	});
	if (query instanceof Response) return query;

	return listResponse(await getPlayerAdvancedStatsPaginated(query), query);
};
