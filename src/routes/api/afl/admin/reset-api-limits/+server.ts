import { forceResetUserQuota } from "$lib/db/afl/service";
import { requireAdminOrCron } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// Force-reset a single user's daily quota window. The daily reset is otherwise
// self-healing (lazily rolled forward on the first request after 00:00 UTC), so
// this exists only to unblock a specific user before their window rolls over.
export const POST: RequestHandler = async (event) => {
  await requireAdminOrCron(event.request, event.locals);

  const body = await event.request.json().catch(() => null);
  const userId = Number(body?.userId);

  if (!Number.isInteger(userId) || userId < 1) {
    return json({ error: "A valid userId is required." }, { status: 400 });
  }

  await forceResetUserQuota(userId);

  console.log(`[reset-api-limits] force-reset quota for user ${userId}`);
  return json({ success: true, userId });
};
