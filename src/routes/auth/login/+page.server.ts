import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event: {
  locals: { auth: () => any };
}) => {
  const session = await event.locals.auth();
  if (session) {
    throw redirect(303, "/home");
  }
};
