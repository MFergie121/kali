import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { getPlayersPaginated } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, url }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
	const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0);
	const teamId = url.searchParams.get('team_id') ?? undefined;
	const name = url.searchParams.get('name') ?? undefined;

	const yearParam = url.searchParams.get('year');
	const year = yearParam ? parseInt(yearParam, 10) : undefined;
	if (yearParam && (isNaN(year!) || year! < 1)) {
		return json({ error: 'Bad request: year must be a positive integer' }, { status: 400 });
	}

	const { data, total } = await getPlayersPaginated({ teamId, name, year, limit, offset });
	return json({ data, meta: { limit, offset, count: data.length, total } });
};
