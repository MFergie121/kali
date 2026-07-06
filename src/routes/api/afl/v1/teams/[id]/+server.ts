import { requireApiKey } from '$lib/api/auth';
import { resource } from '$lib/api/v1';
import { getTeamById } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, params }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	return resource(await getTeamById(params.id), 'Team');
};
