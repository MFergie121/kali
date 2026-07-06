import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const apiLimit = env.API_KEY_DEFAULT_LIMIT || '1000';
	return { apiLimit };
};
