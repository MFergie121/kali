import { requireApiKey } from '$lib/api/auth';
import { listResponse, parseListQuery, q } from '$lib/api/v1';
import { getLeaderboard, VALID_LEADERBOARD_STATS } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, url }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	const query = parseListQuery(url, {
		stat: q.enum(VALID_LEADERBOARD_STATS, { required: true }),
		year: q.int(),
		round: q.int({ min: 0 }),
		teamId: q.string()
	});
	if (query instanceof Response) return query;

	return listResponse(await getLeaderboard(query), query);
};
