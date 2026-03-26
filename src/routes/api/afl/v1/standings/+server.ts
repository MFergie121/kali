import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { getStandings } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	const denied = await requireApiKey(request);
	if (denied) return denied;

	const yearParam = url.searchParams.get('year');
	if (!yearParam) {
		return json({ error: 'Bad request: year is required' }, { status: 400 });
	}
	const year = parseInt(yearParam, 10);
	if (isNaN(year) || year < 1) {
		return json({ error: 'Bad request: year must be a positive integer' }, { status: 400 });
	}

	const data = await getStandings(year);
	return json({ data, meta: { year, count: data.length } });
};
