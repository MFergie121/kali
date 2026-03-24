import { ADMIN_EMAIL, SCRAPE_SECRET } from "$env/static/private";
import { error } from "@sveltejs/kit";

export async function requireAdmin(locals: App.Locals): Promise<void> {
  const session = await locals.auth();
  if (!session || session.user.email !== ADMIN_EMAIL) {
    error(403, "Forbidden");
  }
}

/**
 * Accepts either an admin session (browser) or a Bearer SCRAPE_SECRET (cron).
 * Use this on scrape endpoints that need to run on a schedule.
 */
export async function requireAdminOrCron(
  request: Request,
  locals: App.Locals,
): Promise<void> {
  const bearer = request.headers
    .get("Authorization")
    ?.replace(/^Bearer\s+/, "");
  if (bearer && bearer === SCRAPE_SECRET) return;

  const session = await locals.auth();
  if (!session || session.user.email !== ADMIN_EMAIL) {
    error(403, "Forbidden");
  }
}
