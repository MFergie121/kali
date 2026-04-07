import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { getTipsForRound } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	const denied = await requireApiKey(request);
	if (denied) return denied;

	const yearParam = url.searchParams.get('year');
	const roundParam = url.searchParams.get('round');

	if (!yearParam || !roundParam) {
		return json({ error: 'Bad request: year and round are required' }, { status: 400 });
	}

	const year = parseInt(yearParam, 10);
	const round = parseInt(roundParam, 10);

	if (isNaN(year) || year < 1) {
		return json({ error: 'Bad request: year must be a positive integer' }, { status: 400 });
	}
	if (isNaN(round) || round < 1) {
		return json({ error: 'Bad request: round must be a positive integer' }, { status: 400 });
	}

	const data = await getTipsForRound(year, round);
	return json({ data, meta: { year, round, count: data.length } });
};
