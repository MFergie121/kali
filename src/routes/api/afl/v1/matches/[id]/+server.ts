import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { getMatchById } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params }) => {
	const denied = await requireApiKey(request);
	if (denied) return denied;

	const id = parseInt(params.id, 10);
	if (isNaN(id) || id < 1) {
		return json({ error: 'Bad request: id must be a positive integer' }, { status: 400 });
	}

	const match = await getMatchById(id);
	if (!match) {
		return json({ error: 'Match not found' }, { status: 404 });
	}

	return json({ data: match });
};
