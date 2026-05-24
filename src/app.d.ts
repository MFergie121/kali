declare global {
	namespace App {
		interface Locals {
			auth(): Promise<import('./auth').UserSession | null>;
			// Set by requireApiKey on a valid key; read by hooks.server.ts analytics.
			apiKeyId?: number | null;
			userId?: number | null;
		}
		interface PageData {
			session?: import('./auth').UserSession | null;
		}
	}
}

export {};
