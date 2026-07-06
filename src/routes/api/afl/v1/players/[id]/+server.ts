import { requireApiKey } from '$lib/api/auth';
import { parseId, resource } from '$lib/api/v1';
import { getPlayerById } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, params }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	const id = parseId(params.id);
	if (id instanceof Response) return id;

	return resource(await getPlayerById(id), 'Player');
};
