import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	exchangeCodeForTokens,
	decodeGoogleIdToken,
	getOAuthCookies,
	clearOAuthCookies,
	createSession
} from '../../../../auth';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (!code || !state) {
		error(400, 'Missing code or state parameter');
	}

	const stored = getOAuthCookies(cookies, 'google');

	if (!stored.state || !stored.codeVerifier || state !== stored.state) {
		error(400, 'Invalid OAuth state');
	}

	clearOAuthCookies(cookies, 'google');

	const redirectUri = `${url.origin}/auth/callback/google`;
	const tokens = await exchangeCodeForTokens('google', code, redirectUri, stored.codeVerifier);

	if (!tokens.id_token) {
		error(500, 'Google did not return an ID token');
	}

	const user = decodeGoogleIdToken(tokens.id_token);

	await createSession(cookies, {
		user,
		provider: 'google',
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		accessTokenExpiresAt: tokens.expires_in
			? Math.floor(Date.now() / 1000) + tokens.expires_in
			: undefined
	});

	redirect(302, '/home');
};
