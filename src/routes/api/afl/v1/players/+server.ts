import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { getPlayersPaginated } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request, url }) => {
	const denied = requireApiKey(request);
	if (denied) return denied;

	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
	const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0);
	const teamId = url.searchParams.get('team_id') ?? undefined;

	const { data, total } = getPlayersPaginated({ teamId, limit, offset });
	return json({ data, meta: { limit, offset, count: data.length, total } });
};
