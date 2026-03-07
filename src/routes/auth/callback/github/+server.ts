import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	exchangeCodeForTokens,
	getGitHubUser,
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

	const stored = getOAuthCookies(cookies, 'github');

	if (!stored.state || !stored.codeVerifier || state !== stored.state) {
		error(400, 'Invalid OAuth state');
	}

	clearOAuthCookies(cookies, 'github');

	const redirectUri = `${url.origin}/auth/callback/github`;
	const tokens = await exchangeCodeForTokens('github', code, redirectUri, stored.codeVerifier);
	const user = await getGitHubUser(tokens.access_token);

	await createSession(cookies, {
		user,
		provider: 'github',
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		accessTokenExpiresAt: tokens.expires_in
			? Math.floor(Date.now() / 1000) + tokens.expires_in
			: undefined
	});

	redirect(302, '/home');
};
