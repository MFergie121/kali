import { listAllApiKeys, revokeApiKey, setApiLimit } from "$lib/db/afl/service";
import { requireAdmin } from "$lib/server/admin";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  await requireAdmin(locals);

  const search = url.searchParams.get("q")?.toLowerCase() ?? "";
  const allKeys = await listAllApiKeys();
  const keys = search
    ? allKeys.filter(
        (k) =>
          k.userEmail.toLowerCase().includes(search) ||
          k.userName.toLowerCase().includes(search),
      )
    : allKeys;

  return { keys, search };
};

export const actions: Actions = {
  revoke: async ({ request, locals }) => {
    await requireAdmin(locals);

    const data = await request.formData();
    const id = parseInt(data.get("id") as string, 10);
    if (isNaN(id) || id < 1) return fail(400, { error: "Invalid key ID." });

    await revokeApiKey(id);
    return { revoked: true };
  },

  setLimit: async ({ request, locals }) => {
    await requireAdmin(locals);

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
