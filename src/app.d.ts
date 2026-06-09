declare global {
	namespace App {
		interface Locals {
			auth(): Promise<import('./auth').UserSession | null>;
			// Set by requireApiKey on a valid key; read by hooks.server.ts analytics.
			apiKeyId?: number | null;
			userId?: number | null;
			// Per-user quota figures stashed by requireApiKey for hooks.server.ts to
			// emit as X-RateLimit-* headers. `limit` / `remaining` null = unlimited.
			rateLimit?: {
				limit: number | null;
				remaining: number | null;
				resetAt: string;
			} | null;
		}
		interface PageData {
			session?: import('./auth').UserSession | null;
		}
	}
}

export {};
