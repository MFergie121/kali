import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

/**
 * Parse a Cloud SQL–style DATABASE_URL into postgres.js options.
 *
 * Cloud SQL URLs like `postgresql://user:pass@/dbname?host=/cloudsql/proj:region:inst`
 * have no hostname after the `@`, which makes them invalid per the URL spec.
 * Node's `new URL()` (used internally by postgres.js) rejects them.
 *
 * We parse the URL ourselves and pass an options object instead.
 */
function parseDbUrl(raw: string) {
	// If the URL has an empty host (e.g. ://user:pass@/db), insert a dummy
	// host so that `new URL()` can parse it. The dummy is never used for
	// connecting when a unix-socket path is present.
	const fixedUrl = raw.includes('@/')
		? raw.replace('@/', '@localhost/')
		: raw;

	const url = new URL(fixedUrl);

	const socketPath = url.searchParams.get('host'); // Cloud SQL socket path

	const opts: Record<string, unknown> = {
		user: decodeURIComponent(url.username),
		pass: decodeURIComponent(url.password),
		database: url.pathname.replace(/^\//, ''),
	};

	if (socketPath) {
		// Unix socket connection (Cloud SQL proxy on Cloud Run).
		// Use `host` (not `path`) so postgres.js auto-appends /.s.PGSQL.5432
		opts.host = socketPath;
	} else {
		// TCP connection (local dev / direct IP)
		opts.host = url.hostname;
		if (url.port) opts.port = Number(url.port);
	}

	return opts;
}

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

/** The parsed DATABASE_URL (sanitised — password replaced). Available after first db access. */
export function getDbDebugInfo() {
	const raw = env.DATABASE_URL;
	if (!raw) return { status: 'DATABASE_URL is not set', parsed: null };
	try {
		const safe = raw.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
		const opts = parseDbUrl(raw);
		return {
			status: 'ok',
			sanitisedUrl: safe,
			parsed: { ...opts, pass: '***' },
			connected: !!_db,
		};
	} catch (e) {
		return { status: 'parse error', error: String(e), rawLength: raw.length };
	}
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_target, prop, receiver) {
		if (!_db) {
			const url = env.DATABASE_URL;
			if (!url) throw new Error('DATABASE_URL is not set');
			const opts = parseDbUrl(url);
			const client = postgres(opts as any);
			_db = drizzle(client, { schema });
		}
		return Reflect.get(_db, prop, receiver);
	}
});
