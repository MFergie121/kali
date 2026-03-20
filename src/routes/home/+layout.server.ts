import { getUserPreferences } from "$lib/db/afl/service";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth();

  if (!session) {
    redirect(303, "/auth/login");
  }

  const prefs = await getUserPreferences(session.user.email);

  return { session, prefs };
};
