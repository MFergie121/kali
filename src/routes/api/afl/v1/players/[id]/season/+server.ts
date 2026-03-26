import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { getPlayerSeasonStats } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params, url }) => {
	const denied = await requireApiKey(request);
	if (denied) return denied;

	const id = parseInt(params.id, 10);
	if (isNaN(id) || id < 1) {
		return json({ error: 'Bad request: id must be a positive integer' }, { status: 400 });
	}

	const yearParam = url.searchParams.get('year');
	if (!yearParam) {
		return json({ error: 'Bad request: year is required' }, { status: 400 });
	}
	const year = parseInt(yearParam, 10);
	if (isNaN(year) || year < 1) {
		return json({ error: 'Bad request: year must be a positive integer' }, { status: 400 });
	}

	const stats = await getPlayerSeasonStats(id, year);
	if (!stats) {
		return json({ error: 'Player not found' }, { status: 404 });
	}

	return json({ data: stats });
};
