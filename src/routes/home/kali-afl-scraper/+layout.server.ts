import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async (event) => {
    const session = await event.locals.auth();

    if (!session) {
        redirect(303, '/auth/login');
    }

    return { session };
};