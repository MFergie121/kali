import {
  createApiKey,
  listAllApiKeys,
  listUsers,
  revokeApiKey,
  setApiLimit,
} from "$lib/db/afl/service";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const [users, keys] = await Promise.all([listUsers(), listAllApiKeys()]);

  // Group keys by userId for easy rendering
  const keysByUser = new Map<number, typeof keys>();
  for (const key of keys) {
    const existing = keysByUser.get(key.userId) ?? [];
    existing.push(key);
    keysByUser.set(key.userId, existing);
  }

  return { users, keysByUser: Object.fromEntries(keysByUser) };
};

export const actions: Actions = {
  createKey: async ({ request }) => {
    const data = await request.formData();
    const userId = parseInt(data.get("userId") as string, 10);
    const name = (data.get("name") as string)?.trim();

    if (isNaN(userId) || userId < 1)
      return fail(400, { error: "Invalid user." });
    if (!name) return fail(400, { error: "Key name is required." });

    const token = await createApiKey(userId, name);
    return { createdToken: token, createdName: name };
  },

  revokeKey: async ({ request }) => {
    const data = await request.formData();
    const id = parseInt(data.get("id") as string, 10);

    if (isNaN(id) || id < 1) return fail(400, { error: "Invalid key ID." });

    await revokeApiKey(id);
    return { revoked: true };
  },

  setLimit: async ({ request }) => {
    const data = await request.formData();
    const keyId = parseInt(data.get("keyId") as string, 10);
    const limitRaw = (data.get("limit") as string)?.trim();

    if (isNaN(keyId) || keyId < 1) return fail(400, { error: "Invalid key." });

    const limit =
      limitRaw === "" || limitRaw === "null" ? null : parseInt(limitRaw, 10);

    if (limit !== null && (isNaN(limit) || limit < 0)) {
      return fail(400, {
        error: "Limit must be a non-negative integer or blank for unlimited.",
      });
    }

    await setApiLimit(keyId, limit);
    return { limitUpdated: true };
  },
};
