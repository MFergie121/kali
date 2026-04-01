import { resetDailyApiUsage } from "$lib/db/afl/service";
import { requireAdminOrCron } from "$lib/server/admin";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
  await requireAdminOrCron(event.request, event.locals);

  const { resetCount } = await resetDailyApiUsage();

  console.log(`[reset-api-limits] reset daily usage for ${resetCount} keys`);
  return json({ success: true, resetCount });
};
