import { json } from '@sveltejs/kit';
import { getDbDebugInfo, db } from '$lib/db/afl';
import { sql } from 'drizzle-orm';

export const GET = async () => {
	const info = getDbDebugInfo();

	let connectionTest: Record<string, unknown> = { success: false };

	if (info.status === 'ok') {
		try {
			const result = await db.execute(sql`SELECT 1 as ping`);
			connectionTest = { success: true, result };
		} catch (e: any) {
			connectionTest = {
				success: false,
				error: String(e),
				message: e?.message,
				code: e?.code,
				errno: e?.errno,
				cause: e?.cause ? String(e.cause) : undefined,
				stack: e?.stack?.split('\n').slice(0, 5),
			};
		}
	}

	return json({
		env: info,
		connectionTest,
		nodeEnv: process.env.NODE_ENV,
		timestamp: new Date().toISOString(),
	});
};
