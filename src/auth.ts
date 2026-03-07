import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { EncryptJWT, jwtDecrypt } from 'jose';
import type { Cookies } from '@sveltejs/kit';

// ─── Types ───────────────────────────────────────────────────────────

export interface UserSession {
	user: {
		name: string;
		email: string;
		image?: string;
	};
	provider: 'github' | 'google';
	accessToken: string;
	refreshToken?: string;
	accessTokenExpiresAt?: number;
}

// ─── Constants ───────────────────────────────────────────────────────

const SESSION_COOKIE = 'session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// ─── Provider Configuration ──────────────────────────────────────────

export const providers = {
	github: {
		authorizeUrl: 'https://github.com/login/oauth/authorize',
		tokenUrl: 'https://github.com/login/oauth/access_token',
		scopes: ['read:user', 'user:email'],
		get clientId() {
			return env.GITHUB_CLIENT_ID ?? '';
		},
		get clientSecret() {
			return env.GITHUB_CLIENT_SECRET ?? '';
		}
	},
	google: {
		authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
		tokenUrl: 'https://oauth2.googleapis.com/token',
		scopes: ['openid', 'profile', 'email'],
		get clientId() {
			return env.GOOGLE_CLIENT_ID ?? '';
		},
		get clientSecret() {
			return env.GOOGLE_CLIENT_SECRET ?? '';
		}
	}
} as const;

export type Provider = keyof typeof providers;

// ─── PKCE Helpers ────────────────────────────────────────────────────

function base64UrlEncode(buffer: ArrayBuffer): string {
	return btoa(String.fromCharCode(...new Uint8Array(buffer)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function generateCodeVerifier(): string {
	const buffer = new Uint8Array(32);
	crypto.getRandomValues(buffer);
	return base64UrlEncode(buffer.buffer);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
	const data = new TextEncoder().encode(verifier);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return base64UrlEncode(digest);
}

function generateState(): string {
	const buffer = new Uint8Array(16);
	crypto.getRandomValues(buffer);
	return Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Authorization URL ──────────────────────────────────────────────

export async function createAuthorizationUrl(
	provider: Provider,
	redirectUri: string
): Promise<{ url: URL; state: string; codeVerifier: string }> {
	const config = providers[provider];
	const state = generateState();
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = await generateCodeChallenge(codeVerifier);

	const url = new URL(config.authorizeUrl);
	url.searchParams.set('client_id', config.clientId);
	url.searchParams.set('redirect_uri', redirectUri);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('scope', config.scopes.join(' '));
	url.searchParams.set('state', state);
	url.searchParams.set('code_challenge', codeChallenge);
	url.searchParams.set('code_challenge_method', 'S256');

	if (provider === 'google') {
		url.searchParams.set('access_type', 'offline');
		url.searchParams.set('prompt', 'consent');
	}

	return { url, state, codeVerifier };
}

// ─── Token Exchange ─────────────────────────────────────────────────

interface TokenResponse {
	access_token: string;
	token_type: string;
	scope?: string;
	refresh_token?: string;
	expires_in?: number;
	id_token?: string;
}

export async function exchangeCodeForTokens(
	provider: Provider,
	code: string,
	redirectUri: string,
	codeVerifier: string
): Promise<TokenResponse> {
	const config = providers[provider];
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri,
		client_id: config.clientId,
		client_secret: config.clientSecret,
		code_verifier: codeVerifier
	});

	const response = await fetch(config.tokenUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		},
		body
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Token exchange failed: ${response.status} ${text}`);
	}

	return response.json();
}

// ─── Token Refresh ──────────────────────────────────────────────────

export async function refreshAccessToken(
	provider: Provider,
	refreshToken: string
): Promise<TokenResponse> {
	const config = providers[provider];
	const body = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: refreshToken,
		client_id: config.clientId,
		client_secret: config.clientSecret
	});

	const response = await fetch(config.tokenUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		},
		body
	});

	if (!response.ok) {
		throw new Error(`Token refresh failed: ${response.status}`);
	}

	return response.json();
}

// ─── User Info Fetchers ─────────────────────────────────────────────

interface GitHubUser {
	login: string;
	name: string | null;
	email: string | null;
	avatar_url: string;
}

interface GitHubEmail {
	email: string;
	primary: boolean;
	verified: boolean;
}

export async function getGitHubUser(
	accessToken: string
): Promise<{ name: string; email: string; image?: string }> {
	const [userRes, emailsRes] = await Promise.all([
		fetch('https://api.github.com/user', {
			headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
		}),
		fetch('https://api.github.com/user/emails', {
			headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
		})
	]);

	if (!userRes.ok) throw new Error('Failed to fetch GitHub user info');

	const user: GitHubUser = await userRes.json();
	let email = user.email;

	if (!email && emailsRes.ok) {
		const emails: GitHubEmail[] = await emailsRes.json();
		const primary = emails.find((e) => e.primary && e.verified);
		email = primary?.email ?? emails[0]?.email ?? null;
	}

	return {
		name: user.name ?? user.login,
		email: email ?? '',
		image: user.avatar_url
	};
}

export function decodeGoogleIdToken(
	idToken: string
): { name: string; email: string; image?: string } {
	// The ID token was received directly from Google's token endpoint over HTTPS,
	// so it is safe to decode without signature verification for immediate use
	const payload = JSON.parse(
		atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
	);

	return {
		name: payload.name ?? '',
		email: payload.email ?? '',
		image: payload.picture
	};
}

// ─── Session Management ─────────────────────────────────────────────

function getSecretKey(): Uint8Array {
	const secret = env.AUTH_SECRET;
	if (!secret) throw new Error('AUTH_SECRET environment variable is not set');
	const encoded = new TextEncoder().encode(secret);
	const key = new Uint8Array(32);
	key.set(encoded.subarray(0, 32));
	return key;
}

function cookieOpts(maxAge?: number) {
	return {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax' as const,
		...(maxAge !== undefined && { maxAge })
	};
}

export async function createSession(cookies: Cookies, session: UserSession): Promise<void> {
	const secret = getSecretKey();
	const jwt = await new EncryptJWT(session as unknown as Record<string, unknown>)
		.setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
		.setIssuedAt()
		.setExpirationTime(`${SESSION_MAX_AGE}s`)
		.encrypt(secret);

	cookies.set(SESSION_COOKIE, jwt, cookieOpts(SESSION_MAX_AGE));
}

export async function getSession(cookies: Cookies): Promise<UserSession | null> {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;

	try {
		const secret = getSecretKey();
		const { payload } = await jwtDecrypt(token, secret);
		const session = payload as unknown as UserSession;

		// Auto-refresh expired access tokens
		if (session.refreshToken && session.accessTokenExpiresAt) {
			const now = Math.floor(Date.now() / 1000);
			if (now >= session.accessTokenExpiresAt - 60) {
				try {
					const tokens = await refreshAccessToken(session.provider, session.refreshToken);
					session.accessToken = tokens.access_token;
					if (tokens.refresh_token) session.refreshToken = tokens.refresh_token;
					if (tokens.expires_in) session.accessTokenExpiresAt = now + tokens.expires_in;
					await createSession(cookies, session);
				} catch {
					// Refresh failed \u2014 keep existing session, token may be stale
				}
			}
		}

		return session;
	} catch {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}
}

export function destroySession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

// ─── OAuth State Cookies ────────────────────────────────────────────

export function setOAuthCookies(
	cookies: Cookies,
	provider: Provider,
	state: string,
	codeVerifier: string
): void {
	const opts = cookieOpts(600); // 10 minutes
	cookies.set(`oauth_state_${provider}`, state, opts);
	cookies.set(`oauth_verifier_${provider}`, codeVerifier, opts);
}

export function getOAuthCookies(
	cookies: Cookies,
	provider: Provider
): { state: string | undefined; codeVerifier: string | undefined } {
	return {
		state: cookies.get(`oauth_state_${provider}`),
		codeVerifier: cookies.get(`oauth_verifier_${provider}`)
	};
}

export function clearOAuthCookies(cookies: Cookies, provider: Provider): void {
	cookies.delete(`oauth_state_${provider}`, { path: '/' });
	cookies.delete(`oauth_verifier_${provider}`, { path: '/' });
}
