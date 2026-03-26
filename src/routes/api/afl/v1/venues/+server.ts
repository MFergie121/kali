import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { getAllVenues } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const denied = await requireApiKey(request);
	if (denied) return denied;

	const data = await getAllVenues();
	return json({ data, meta: { count: data.length } });
};
