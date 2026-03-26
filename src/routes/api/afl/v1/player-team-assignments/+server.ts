import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { getPlayerTeamAssignmentsPaginated } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	const denied = await requireApiKey(request);
	if (denied) return denied;

	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
	const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0);

	const playerIdParam = url.searchParams.get('player_id');
	const teamId = url.searchParams.get('team_id') ?? undefined;
	const yearParam = url.searchParams.get('year');
	const reason = url.searchParams.get('reason') ?? undefined;

	const playerId = playerIdParam ? parseInt(playerIdParam, 10) : undefined;
	const year = yearParam ? parseInt(yearParam, 10) : undefined;

	if (playerIdParam && (isNaN(playerId!) || playerId! < 1)) {
		return json({ error: 'Bad request: player_id must be a positive integer' }, { status: 400 });
	}
	if (yearParam && (isNaN(year!) || year! < 1)) {
		return json({ error: 'Bad request: year must be a positive integer' }, { status: 400 });
	}

	const { data, total } = await getPlayerTeamAssignmentsPaginated({ playerId, teamId, year, reason, limit, offset });
	return json({ data, meta: { limit, offset, count: data.length, total } });
};
