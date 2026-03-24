import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

function getSocketPath(url: string) {
	try {
		return new URL(url).searchParams.get('host');
	} catch {
		return null;
	}
}

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_target, prop, receiver) {
		if (!_db) {
			const url = env.DATABASE_URL;
			if (!url) throw new Error('DATABASE_URL is not set');
			const socketPath = getSocketPath(url);
			const client = postgres(url, {
				...(socketPath && { host: socketPath })
			});
			_db = drizzle(client, { schema });
		}
		return Reflect.get(_db, prop, receiver);
	}
});
