import { fetchSeasonFixture } from "$lib/afl/squiggle";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const FIRST_YEAR = 2000;

export const GET: RequestHandler = async ({ url }) => {
  const currentYear = new Date().getFullYear();
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  if (isNaN(year) || year < FIRST_YEAR || year > currentYear + 1) {
    return json({ error: "Invalid year." }, { status: 422 });
  }

  try {
    const games = await fetchSeasonFixture(year);
    return json({ year, games });
  } catch (err) {
    console.error("[fixture] Squiggle fetch failed:", err);
    return json({ error: "Failed to fetch fixture data." }, { status: 502 });
  }
};
