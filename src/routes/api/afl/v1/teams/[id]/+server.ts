import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { getTeamById } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params }) => {
	const denied = await requireApiKey(request);
	if (denied) return denied;

	const team = await getTeamById(params.id);
	if (!team) {
		return json({ error: 'Team not found' }, { status: 404 });
	}

	return json({ data: team });
};
