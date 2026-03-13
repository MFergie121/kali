import { getAllPlayerStatsForYear } from "$lib/db/afl/service";
import type { PageServerLoad } from "./$types";

const FIRST_YEAR = 2024;

export const load: PageServerLoad = async ({ url }) => {
  const currentYear = new Date().getFullYear();
  const allYears = Array.from(
    { length: currentYear - FIRST_YEAR + 1 },
    (_, i) => FIRST_YEAR + i,
  );

  const selectedYear = Math.min(
    Math.max(
      parseInt(url.searchParams.get("year") ?? "") || currentYear,
      FIRST_YEAR,
    ),
    currentYear,
  );

  const rows = getAllPlayerStatsForYear(selectedYear);

  return { rows, allYears, selectedYear };
};
