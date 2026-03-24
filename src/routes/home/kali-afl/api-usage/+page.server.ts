import {
  createApiKey,
  getUserByEmail,
  listApiKeysForUser,
  revokeApiKey,
  setApiLimit,
} from "$lib/db/afl/service";
import { requireAdmin } from "$lib/server/admin";
import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals);
  const session = (await locals.auth())!;

  const user = await getUserByEmail(session.user.email);
  if (!user) error(404, "User not found");

  const keys = await listApiKeysForUser(user.id);

  return { user, keys };
};

export const actions: Actions = {
  createKey: async ({ request, locals }) => {
    await requireAdmin(locals);
    const session = (await locals.auth())!;

    const user = await getUserByEmail(session.user.email);
    if (!user) return fail(404, { error: "User not found" });

    const data = await request.formData();
    const name = (data.get("name") as string)?.trim();

    if (!name) return fail(400, { error: "Key name is required." });

    const token = await createApiKey(user.id, name);
    return { createdToken: token, createdName: name };
  },

  revokeKey: async ({ request, locals }) => {
    await requireAdmin(locals);
    const session = (await locals.auth())!;

    const user = await getUserByEmail(session.user.email);
    if (!user) return fail(404, { error: "User not found" });

    const data = await request.formData();
    const id = parseInt(data.get("id") as string, 10);
    if (isNaN(id) || id < 1) return fail(400, { error: "Invalid key ID." });

    const keys = await listApiKeysForUser(user.id);
    if (!keys.some((k) => k.id === id)) return fail(403, { error: "Forbidden" });

    await revokeApiKey(id);
    return { revoked: true };
  },

  setLimit: async ({ request, locals }) => {
    await requireAdmin(locals);
    const session = (await locals.auth())!;

    const user = await getUserByEmail(session.user.email);
    if (!user) return fail(404, { error: "User not found" });

    const data = await request.formData();
    const keyId = parseInt(data.get("keyId") as string, 10);
    const limitRaw = (data.get("limit") as string)?.trim();

    if (isNaN(keyId) || keyId < 1) return fail(400, { error: "Invalid key." });

    const keys = await listApiKeysForUser(user.id);
    if (!keys.some((k) => k.id === keyId)) return fail(403, { error: "Forbidden" });

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
