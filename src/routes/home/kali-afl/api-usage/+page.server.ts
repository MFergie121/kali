import {
  createApiKey,
  getUserByEmail,
  lazyResetUserQuota,
  listApiKeysForUser,
  revokeApiKey,
} from "$lib/db/afl/service";
import { requireAuth } from "$lib/server/admin";
import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  await requireAuth(locals);
  const session = (await locals.auth())!;

  const user = await getUserByEmail(session.user.email);
  if (!user) error(404, "User not found");

  // Self-heal: if this user's quota window has expired, roll it over now so the
  // page shows the true current-window figures instead of yesterday's stale row.
  await lazyResetUserQuota(user.id);
  const fresh = await getUserByEmail(session.user.email);
  const keys = await listApiKeysForUser(user.id);

  return { user: fresh ?? user, keys };
};

export const actions: Actions = {
  createKey: async ({ request, locals }) => {
    await requireAuth(locals);
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
    await requireAuth(locals);
    const session = (await locals.auth())!;

    const user = await getUserByEmail(session.user.email);
    if (!user) return fail(404, { error: "User not found" });

    const data = await request.formData();
    const id = parseInt(data.get("id") as string, 10);
    if (isNaN(id) || id < 1) return fail(400, { error: "Invalid key ID." });

    const keys = await listApiKeysForUser(user.id);
    if (!keys.some((k) => k.id === id))
      return fail(403, { error: "Forbidden" });

    await revokeApiKey(id);
    return { revoked: true };
  },
};
