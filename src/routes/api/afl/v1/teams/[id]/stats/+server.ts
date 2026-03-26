import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { getTeamById, getTeamStatsPaginated } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params, url }) => {
	const denied = await requireApiKey(request);
	if (denied) return denied;

	const team = await getTeamById(params.id);
	if (!team) {
		return json({ error: 'Team not found' }, { status: 404 });
	}

	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
	const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0);

	const yearParam = url.searchParams.get('year');
	const roundParam = url.searchParams.get('round');
	const year = yearParam ? parseInt(yearParam, 10) : undefined;
	const round = roundParam ? parseInt(roundParam, 10) : undefined;

	if (yearParam && (isNaN(year!) || year! < 1)) {
		return json({ error: 'Bad request: year must be a positive integer' }, { status: 400 });
	}
	if (roundParam && (isNaN(round!) || round! < 0)) {
		return json({ error: 'Bad request: round must be a non-negative integer' }, { status: 400 });
	}

	const { data, total } = await getTeamStatsPaginated({ teamId: params.id, year, round, limit, offset });
	return json({ data, meta: { limit, offset, count: data.length, total } });
};
