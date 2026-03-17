import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { getAllTeams } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request, url }) => {
	const denied = requireApiKey(request);
	if (denied) return denied;

	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
	const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0);

	const all = getAllTeams();
	const data = all.slice(offset, offset + limit);

	return json({ data, meta: { limit, offset, count: data.length, total: all.length } });
};
