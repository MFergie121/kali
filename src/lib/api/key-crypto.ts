// Pure credential handling for API keys. Deterministic and free of DB/SvelteKit
// imports so it can be unit-tested directly (see key-crypto.test.ts).

import { createHash, randomBytes } from "node:crypto";

/** A fresh API token: 32 random bytes as hex (64 chars). Unchanged format. */
export function generateApiKey(): string {
  return randomBytes(32).toString("hex");
}

/**
 * SHA-256 hex of the raw token. SHA-256 is deliberate: tokens are high-entropy
 * (256 bits of randomness), so a fast hash is cryptographically sufficient and
 * keeps the per-request lookup at microsecond cost. A slow KDF (bcrypt/argon2)
 * is rejected because it would run on every API request.
 */
export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** First 8 characters of the raw token — a non-secret identifier for the UI. */
export function keyPrefix(raw: string): string {
  return raw.slice(0, 8);
}
