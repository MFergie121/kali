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

const socketPath = getSocketPath(env.DATABASE_URL);

const client = postgres(env.DATABASE_URL, {
	...(socketPath && { host: socketPath })
});

export const db = drizzle(client, { schema });
