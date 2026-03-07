import type { Handle } from '@sveltejs/kit';
import { getSession, type UserSession } from './auth';

export const handle: Handle = async ({ event, resolve }) => {
	let cached: UserSession | null | undefined;

	event.locals.auth = async () => {
		if (cached === undefined) {
			cached = await getSession(event.cookies);
		}
		return cached;
	};

	return resolve(event);
};
