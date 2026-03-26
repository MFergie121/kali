import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { getHeadToHead } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	const denied = await requireApiKey(request);
	if (denied) return denied;

	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
	const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0);

	const teamA = url.searchParams.get('team_a');
	const teamB = url.searchParams.get('team_b');

	if (!teamA || !teamB) {
		return json({ error: 'Bad request: team_a and team_b are required' }, { status: 400 });
	}

	const yearParam = url.searchParams.get('year');
	const venue = url.searchParams.get('venue') ?? undefined;

	const year = yearParam ? parseInt(yearParam, 10) : undefined;

	if (yearParam && (isNaN(year!) || year! < 1)) {
		return json({ error: 'Bad request: year must be a positive integer' }, { status: 400 });
	}

	const { data, total } = await getHeadToHead({ teamA, teamB, year, venue, limit, offset });
	return json({ data, meta: { limit, offset, count: data.length, total } });
};
