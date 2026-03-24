import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const databaseUrl = new URL(env.DATABASE_URL);
const socketPath = databaseUrl.searchParams.get('host');

const client = postgres(env.DATABASE_URL, {
	...(socketPath && { host: socketPath })
});

export const db = drizzle(client, { schema });
