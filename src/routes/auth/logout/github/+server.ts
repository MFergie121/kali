import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroySession } from '../../../../auth';

export const GET: RequestHandler = async ({ cookies }) => {
	destroySession(cookies);
	redirect(302, '/');
};
