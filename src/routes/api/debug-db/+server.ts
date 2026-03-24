import { json } from '@sveltejs/kit';
import { getDbDebugInfo, db } from '$lib/db/afl';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const info = getDbDebugInfo();

	let connectionTest: { success: boolean; error?: string; result?: unknown } = {
		success: false,
	};

	if (info.status === 'ok') {
		try {
			const result = await db.execute(sql`SELECT 1 as ping`);
			connectionTest = { success: true, result };
		} catch (e) {
			connectionTest = { success: false, error: String(e) };
		}
	}

	return json({
		env: info,
		connectionTest,
		nodeEnv: process.env.NODE_ENV,
		timestamp: new Date().toISOString(),
	});
};
