import { env } from '$env/dynamic/private';
import { getDataStats } from '$lib/db/afl/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	const apiLimit = env.API_KEY_DEFAULT_LIMIT || '5000';
	const stats = await getDataStats();
	return { session, apiLimit, stats };
};
