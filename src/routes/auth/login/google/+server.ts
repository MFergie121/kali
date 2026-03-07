import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAuthorizationUrl, setOAuthCookies } from '../../../../auth';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const redirectUri = `${url.origin}/auth/callback/google`;
	const { url: authUrl, state, codeVerifier } = await createAuthorizationUrl('google', redirectUri);
	setOAuthCookies(cookies, 'google', state, codeVerifier);
	redirect(302, authUrl.toString());
};
