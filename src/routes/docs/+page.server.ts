import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const apiLimit = env.API_KEY_DEFAULT_LIMIT || '5000';
	return { apiLimit };
};
