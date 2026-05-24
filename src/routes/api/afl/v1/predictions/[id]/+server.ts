import { requireApiKey } from "$lib/api/auth";
import { getPredictionById } from "$lib/db/afl/service";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, locals, params }) => {
  const denied = await requireApiKey(request, locals);
  if (denied) return denied;

  const id = parseInt(params.id, 10);
  if (isNaN(id) || id < 1) {
    return json(
      { error: "Bad request: id must be a positive integer" },
      { status: 400 },
    );
  }

  const prediction = await getPredictionById(id);
  if (!prediction) {
    return json({ error: "Prediction not found" }, { status: 404 });
  }

  return json({ data: prediction });
};
