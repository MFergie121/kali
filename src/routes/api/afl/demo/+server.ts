import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

/**
 * Demo proxy for the docs "Try it" panels. Accepts a POST body of
 * `{ path: "/teams", params: { limit: "10" } }`, forwards it to the internal
 * `/api/afl/v1` surface with the server-held DEMO_API_KEY bearer token, and
 * returns the upstream response verbatim. The key never reaches the client.
 *
 * Because the forward uses the SvelteKit `fetch`, the internal request re-enters
 * `hooks.server.ts`, so demo usage is recorded by the existing analytics pipeline
 * and the demo key's rate limit is enforced by `validateApiKey` — no extra logic here.
 */
export const POST: RequestHandler = async ({ request, fetch }) => {
	let body: { path?: unknown; params?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const path = body.path;
	// Only allow proxying to the v1 surface. Reject anything that could escape it.
	if (typeof path !== 'string' || !path.startsWith('/') || path.includes('..')) {
		return json({ error: 'Invalid path' }, { status: 400 });
	}

	// Param values arrive as a string map; ignore anything else.
	const params =
		body.params && typeof body.params === 'object'
			? (body.params as Record<string, string>)
			: {};
	const qs = new URLSearchParams(params).toString();

	const target = `/api/afl/v1${path}${qs ? `?${qs}` : ''}`;

	const upstream = await fetch(target, {
		headers: { Authorization: `Bearer ${env.DEMO_API_KEY ?? ''}` }
	});

	const text = await upstream.text();
	return new Response(text, {
		status: upstream.status,
		headers: {
			'content-type': upstream.headers.get('content-type') ?? 'application/json'
		}
	});
};
