import { json } from '@sveltejs/kit';
import { getSession } from '../../../auth';
import { getUserPreferences, upsertUserPreferences } from '$lib/db/afl/service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const session = await getSession(cookies);
	if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

	const prefs = getUserPreferences(session.user.email);
	return json(prefs ?? { prefTheme: 'serika', prefFont: 'ibm-plex-mono', prefDarkMode: 'system' });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const session = await getSession(cookies);
	if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json({ error: 'Invalid body' }, { status: 400 });
	}

	const prefs: Record<string, string> = {};
	if (typeof body.theme === 'string') prefs.prefTheme = body.theme;
	if (typeof body.font === 'string') prefs.prefFont = body.font;
	if (typeof body.darkMode === 'string') prefs.prefDarkMode = body.darkMode;

	if (Object.keys(prefs).length > 0) {
		upsertUserPreferences(session.user.email, prefs);
	}

	return json({ ok: true });
};
