import { json } from '@sveltejs/kit';
import { validateApiKey } from '$lib/db/afl/service';
import { rateLimitHeaders } from '$lib/api/quota-window';

/**
 * Gate a public v1 API request behind a Bearer API key. Returns a `Response` to
 * short-circuit (401 missing/invalid, 429 over quota) or `null` to proceed.
 * Quota is consumed here, against the owning user's shared daily bucket; on a
 * valid key the post-update figures are stashed on `locals` so hooks.server.ts
 * can emit the X-RateLimit-* headers and refund 5xx responses.
 *
 * Handler pattern is unchanged:
 *   const denied = await requireApiKey(request, locals);
 *   if (denied) return denied;
 */
export async function requireApiKey(
	request: Request,
	locals?: App.Locals
): Promise<Response | null> {
	const authHeader = request.headers.get('Authorization');
	const key = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

	if (!key) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const result = await validateApiKey(key);

	if (!result.valid) {
		if (result.rateLimited) {
			const h = rateLimitHeaders({
				limit: result.limit ?? null,
				usage: result.limit ?? 0, // remaining is 0 when blocked
				resetAt: result.resetAt!,
			});
			return json(
				{ error: 'Rate limit exceeded' },
				{
					status: 429,
					headers: {
						'Retry-After': String(h.retryAfter),
						'X-RateLimit-Limit': String(h.limit ?? ''),
						'X-RateLimit-Remaining': '0',
						'X-RateLimit-Reset': String(h.resetEpoch)
					}
				}
			);
		}
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Stash identity + quota on locals for hooks.server.ts (analytics + headers).
	if (locals) {
		locals.apiKeyId = result.apiKeyId ?? null;
		locals.userId = result.userId ?? null;
		locals.rateLimit = {
			limit: result.limit ?? null,
			remaining: result.remaining ?? null,
			resetAt: result.resetAt!
		};
	}

	return null;
}
