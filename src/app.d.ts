declare global {
	namespace App {
		interface Locals {
			auth(): Promise<import('./auth').UserSession | null>;
		}
		interface PageData {
			session?: import('./auth').UserSession | null;
		}
	}
}

export {};
