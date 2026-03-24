import { ADMIN_EMAIL } from '$env/static/private';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session) redirect(303, '/auth/login');
	const isAdmin = session.user?.email === ADMIN_EMAIL;
	return { session, isAdmin };
};