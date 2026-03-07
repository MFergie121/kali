import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAuthorizationUrl, setOAuthCookies } from '../../../../auth';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const redirectUri = `${url.origin}/auth/callback/github`;
	const { url: authUrl, state, codeVerifier } = await createAuthorizationUrl('github', redirectUri);
	setOAuthCookies(cookies, 'github', state, codeVerifier);
	redirect(302, authUrl.toString());
};
