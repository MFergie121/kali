import { env } from "$env/dynamic/private";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth();
  if (!session) redirect(303, "/auth/login");
  const isAdmin = session.user?.email === env.ADMIN_EMAIL;
  return { session, isAdmin };
};
