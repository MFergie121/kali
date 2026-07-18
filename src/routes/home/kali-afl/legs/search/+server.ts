import { error, json } from "@sveltejs/kit";
import { requireAuth } from "$lib/server/admin";
import { searchPlayer, searchTeam } from "$lib/afl/legs.server";
import type { RequestHandler } from "./$types";

// Session-guarded on-demand projection compute. Reuses the browser-session
// guard (not the public API-key guard) so it stays private like the rest of the
// app, and lets the client drive its own loading skeleton without recomputing
// the page's showcase.
export const GET: RequestHandler = async ({ url, locals }) => {
  await requireAuth(locals);

  const year = new Date().getFullYear();
  const playerParam = url.searchParams.get("player");
  const teamParam = url.searchParams.get("team");

  if (playerParam !== null) {
    const playerId = parseInt(playerParam);
    if (isNaN(playerId)) error(400, "Invalid player id");
    return json(await searchPlayer(year, playerId));
  }

  if (teamParam !== null) {
    if (teamParam.length === 0) error(400, "Invalid team");
    return json(await searchTeam(year, teamParam));
  }

  error(400, "Provide a player or team");
};
