import { json } from '@sveltejs/kit';
import { validateApiKey } from '$lib/db/afl/service';

export async function requireApiKey(request: Request): Promise<Response | null> {
	const authHeader = request.headers.get('Authorization');
	const key = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

	if (!key) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const result = await validateApiKey(key);

	if (!result.valid) {
		if (result.rateLimited) {
			return json({ error: 'Rate limit exceeded' }, { status: 429 });
		}
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	return null;
}
