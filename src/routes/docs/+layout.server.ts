import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const apiLimit = env.API_KEY_DEFAULT_LIMIT || '5000';
	return { apiLimit };
};
