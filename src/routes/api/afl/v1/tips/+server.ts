import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/api/auth';
import { parseQuery, q } from '$lib/api/v1';
import { getTipsForRound } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, url }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	const query = parseQuery(url, {
		year: q.int({ required: true }),
		round: q.int({ required: true })
	});
	if (query instanceof Response) return query;

	const data = await getTipsForRound(query.year, query.round);
	return json({ data, meta: { year: query.year, round: query.round, count: data.length } });
};
