import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getUserPreferences } from '$lib/db/afl/service';

export const load: LayoutServerLoad = async (event) => {
    const session = await event.locals.auth();

    if (!session) {
        redirect(303, '/auth/login');
    }

    const prefs = getUserPreferences(session.user.email);

    return { session, prefs };
};