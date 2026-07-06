import { requireApiKey } from '$lib/api/auth';
import { listResponse, parsePagination } from '$lib/api/v1';
import { getAllTeams } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, url }) => {
	const denied = await requireApiKey(request, locals);
	if (denied) return denied;

	const page = parsePagination(url.searchParams);
	const all = await getAllTeams();
	const data = all.slice(page.offset, page.offset + page.limit);

	return listResponse({ data, total: all.length }, page);
};
