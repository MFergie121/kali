import { parse } from "node-html-parser";

const BASE = "https://www.footywire.com/afl/footy";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScrapedMatch {
  mid: number;
  round: number;
  year: number;
  homeTeam: ScrapedTeam;
  awayTeam: ScrapedTeam;
  homeScore: number;
  awayScore: number;
  venue: string;
  date: string;
  crowd: number | null;
}

export interface ScrapedTeam {
  id: string; // slug e.g. "sydney-swans"
  name: string;
  shortName: string;
}

export interface ScrapedPlayerStat {
  playerName: string;
  teamId: string;
  kicks: number;
  handballs: number;
  disposals: number;
  marks: number;
  goals: number;
  behinds: number;
  tackles: number;
  hitouts: number;
  goalAssists: number;
  inside50s: number;
  clearances: number;
  clangers: number;
  rebound50s: number;
  freesFor: number;
  freesAgainst: number;
  aflFantasyPts: number;
  supercoachPts: number;
}

export interface ScrapedMatchStats {
  match: ScrapedMatch;
  homeStats: ScrapedPlayerStat[];
  awayStats: ScrapedPlayerStat[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function num(s: string | undefined): number {
  const n = parseInt(s?.trim() ?? "0", 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Convert a Footywire team URL slug (e.g. "th-sydney-swans") to a team ID
 * slug (e.g. "sydney-swans") and a short display name.
 */
function parseTeamHref(href: string): {
  id: string;
  name: string;
  shortName: string;
} {
  // href is like /afl/footy/th-sydney-swans or th-sydney-swans
  const raw = href.split("/").pop() ?? "";
  const id = raw.replace(/^th-/, "");
  // Build a pretty name by title-casing each word
  const name = id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  // Short name = last word (e.g. "Swans"), or "GWS" for western-sydney-giants
  const words = name.split(" ");
  const shortName = words[words.length - 1];
  return { id, name, shortName };
}

// ─── Step 1: Find the latest completed round ──────────────────────────────────

export async function getLatestCompletedRound(
  year = new Date().getFullYear(),
): Promise<number | null> {
  const url = `${BASE}/ft_match_list?year=${year}`;
  console.log(`[afl-scraper] getLatestCompletedRound: fetching ${url}`);

  const res = await fetch(url);
  console.log(`[afl-scraper] getLatestCompletedRound: HTTP ${res.status}`);
  const html = await res.text();
  console.log(
    `[afl-scraper] getLatestCompletedRound: HTML length=${html.length}`,
  );

  const root = parse(html);
  const rows = root.querySelectorAll("table tr");
  console.log(
    `[afl-scraper] getLatestCompletedRound: table rows found=${rows.length}`,
  );

  // null = nothing complete found yet; 0 is a valid round (preseason/Round 0)
  let latestCompletedRound: number | null = null;
  let currentRound: number | null = null;
  let currentRoundComplete = false;
  let currentRoundHasGames = false;

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length === 0) continue;

    const firstCell = cells[0].text.trim();

    const roundMatch = firstCell.match(/^Round\s+(\d+|P\d+|HA?)$/i);
    if (roundMatch) {
      // Save result for the round we just finished scanning
      if (
        currentRound !== null &&
        currentRoundHasGames &&
        currentRoundComplete
      ) {
        console.log(
          `[afl-scraper] getLatestCompletedRound: round ${currentRound} — COMPLETE`,
        );
        latestCompletedRound = currentRound;
      } else if (currentRound !== null) {
        console.log(
          `[afl-scraper] getLatestCompletedRound: round ${currentRound} — incomplete (hasGames=${currentRoundHasGames}, allComplete=${currentRoundComplete})`,
        );
      }
      // Do NOT use || 0 — parseInt("0") = 0, which is a valid preseason round number
      const parsed = parseInt(roundMatch[1], 10);
      currentRound = isNaN(parsed) ? null : parsed;
      currentRoundComplete = true;
      currentRoundHasGames = false;
      console.log(
        `[afl-scraper] getLatestCompletedRound: entered round section: "${firstCell}" → parsed as round ${currentRound}`,
      );
      continue;
    }

    if (cells.length >= 5) {
      const resultCell = cells[4]?.text.trim() ?? "";
      if (resultCell === "") {
        console.log(
          `[afl-scraper] getLatestCompletedRound: round ${currentRound} — game row with EMPTY result (row: ${row.text.trim().slice(0, 80)})`,
        );
        currentRoundComplete = false;
      } else {
        currentRoundHasGames = true;
        console.log(
          `[afl-scraper] getLatestCompletedRound: round ${currentRound} — game row result="${resultCell}"`,
        );
      }
    }
  }

  // Catch the last round
  if (currentRound !== null && currentRoundHasGames && currentRoundComplete) {
    console.log(
      `[afl-scraper] getLatestCompletedRound: round ${currentRound} — COMPLETE (last)`,
    );
    latestCompletedRound = currentRound;
  }

  console.log(
    `[afl-scraper] getLatestCompletedRound: result=${latestCompletedRound}`,
  );
  return latestCompletedRound; // null = no completed round found yet this season
}

// ─── Step 2: Get match IDs for a round ───────────────────────────────────────

export async function getMatchIdsForRound(
  round: number,
  year = new Date().getFullYear(),
): Promise<number[]> {
  const url = `${BASE}/ft_match_list?year=${year}`;
  console.log(
    `[afl-scraper] getMatchIdsForRound: fetching ${url} for round=${round}`,
  );

  const res = await fetch(url);
  console.log(`[afl-scraper] getMatchIdsForRound: HTTP ${res.status}`);
  const html = await res.text();

  const root = parse(html);
  const mids: number[] = [];
  let inTargetRound = false;

  const rows = root.querySelectorAll("table tr");
  console.log(
    `[afl-scraper] getMatchIdsForRound: scanning ${rows.length} table rows`,
  );

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length === 0) continue;

    const firstCell = cells[0].text.trim();
    const roundMatch = firstCell.match(/^Round\s+(\d+|P\d+|HA?)$/i);
    if (roundMatch) {
      // Do NOT use || 0 — parseInt("0") = 0, which is valid for preseason
      const parsed = parseInt(roundMatch[1], 10);
      const r = isNaN(parsed) ? -1 : parsed;
      const wasIn = inTargetRound;
      inTargetRound = r === round;
      console.log(
        `[afl-scraper] getMatchIdsForRound: section "${firstCell}" → r=${r}, inTargetRound=${inTargetRound}`,
      );
      // If we've passed our target round, stop scanning
      if (wasIn && !inTargetRound) {
        console.log(
          `[afl-scraper] getMatchIdsForRound: passed target round, stopping`,
        );
        break;
      }
      continue;
    }

    if (!inTargetRound) continue;

    const statsLink = row.querySelector('a[href*="ft_match_statistics"]');
    if (statsLink) {
      const href = statsLink.getAttribute("href") ?? "";
      const midMatch = href.match(/mid=(\d+)/);
      if (midMatch) {
        const mid = parseInt(midMatch[1], 10);
        console.log(
          `[afl-scraper] getMatchIdsForRound: found mid=${mid} from href="${href}"`,
        );
        mids.push(mid);
      } else {
        console.log(
          `[afl-scraper] getMatchIdsForRound: stats link found but no mid in href="${href}"`,
        );
      }
    } else if (cells.length >= 3) {
      // Log game rows that had no stats link (may mean match not yet played)
      console.log(
        `[afl-scraper] getMatchIdsForRound: game row without stats link: "${row.text.trim().slice(0, 100)}"`,
      );
    }
  }

  console.log(
    `[afl-scraper] getMatchIdsForRound: found ${mids.length} mids for round ${round}: [${mids.join(", ")}]`,
  );
  return mids;
}

// ─── Step 3: Scrape player stats for a match ─────────────────────────────────

export async function scrapeMatchStats(
  mid: number,
): Promise<ScrapedMatchStats> {
  const url = `${BASE}/ft_match_statistics?mid=${mid}`;
  console.log(`[afl-scraper] scrapeMatchStats: fetching ${url}`);

  const res = await fetch(url);
  console.log(`[afl-scraper] scrapeMatchStats: HTTP ${res.status}`);
  const html = await res.text();
  console.log(`[afl-scraper] scrapeMatchStats: HTML length=${html.length}`);

  const root = parse(html);

  // ── Match metadata ────────────────────────────────────────────────────────
  const metaBlock = root.querySelector(".statdata")?.text ?? "";
  console.log(
    `[afl-scraper] scrapeMatchStats: metaBlock=${JSON.stringify(metaBlock.slice(0, 200))}`,
  );

  const scoreTables = root.querySelectorAll("table");
  console.log(
    `[afl-scraper] scrapeMatchStats: total tables found=${scoreTables.length}`,
  );

  let homeScore = 0;
  let awayScore = 0;
  let venue = "";
  let date = "";
  let crowd: number | null = null;
  let round = 0;
  let year = new Date().getFullYear();

  // The score table has exactly 6 columns: Team Q1 Q2 Q3 Q4 Final
  for (const table of scoreTables) {
    const headerRow = table.querySelector("tr");
    if (!headerRow) continue;
    const headers = headerRow
      .querySelectorAll("th, td")
      .map((c) => c.text.trim());
    if (
      headers.includes("Q1") &&
      headers.includes("Q4") &&
      headers.includes("Final")
    ) {
      console.log(
        `[afl-scraper] scrapeMatchStats: found score table, headers=${JSON.stringify(headers)}`,
      );
      const rows = table.querySelectorAll("tr");
      if (rows.length >= 3) {
        const homeRow = rows[1].querySelectorAll("td");
        const awayRow = rows[2].querySelectorAll("td");
        homeScore = num(homeRow[homeRow.length - 1]?.text);
        awayScore = num(awayRow[awayRow.length - 1]?.text);
        console.log(
          `[afl-scraper] scrapeMatchStats: homeScore=${homeScore}, awayScore=${awayScore}`,
        );
        console.log(
          `[afl-scraper] scrapeMatchStats: homeRow cells=${homeRow.map((c) => c.text.trim()).join(" | ")}`,
        );
        console.log(
          `[afl-scraper] scrapeMatchStats: awayRow cells=${awayRow.map((c) => c.text.trim()).join(" | ")}`,
        );
      } else {
        console.log(
          `[afl-scraper] scrapeMatchStats: score table only has ${rows.length} rows (expected >=3)`,
        );
      }
      break;
    }
  }

  // Parse meta text from the page header paragraph
  const bodyText = root.text;
  const bodySnippet = bodyText.slice(0, 500).replace(/\s+/g, " ");
  console.log(
    `[afl-scraper] scrapeMatchStats: bodyText snippet=${JSON.stringify(bodySnippet)}`,
  );

  const roundMatch = bodyText.match(/Round\s+(\d+)/i);
  round = roundMatch ? parseInt(roundMatch[1], 10) : 0;
  console.log(
    `[afl-scraper] scrapeMatchStats: round=${round} (match=${JSON.stringify(roundMatch?.[0])})`,
  );

  const venueMatch = bodyText.match(/Round\s+\d+,\s+([^,\n]+)/i);
  venue = venueMatch ? venueMatch[1].trim() : "";
  console.log(`[afl-scraper] scrapeMatchStats: venue="${venue}"`);

  const attendanceMatch = bodyText.match(/Attendance:\s*([\d,]+)/i);
  crowd = attendanceMatch
    ? parseInt(attendanceMatch[1].replace(/,/g, ""), 10)
    : null;
  console.log(`[afl-scraper] scrapeMatchStats: crowd=${crowd}`);

  const dateMatch = bodyText.match(/\b(\w+day),\s+(\d+\w+\s+\w+\s+\d{4})/i);
  date = dateMatch ? `${dateMatch[1]}, ${dateMatch[2]}` : "";
  console.log(`[afl-scraper] scrapeMatchStats: date="${date}"`);

  const yearMatch = bodyText.match(/\b(20\d{2})\b/);
  year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
  console.log(`[afl-scraper] scrapeMatchStats: year=${year}`);

  // ── Team identity from coach links & stat table headings ─────────────────
  // Each team stat table is preceded by a heading like "Sydney Match Statistics"
  // and coach link hrefs contain the team slug.
  const coachLinks = root.querySelectorAll('a[href*="/cp-"]');
  const teamSlugs: string[] = [];

  // The coach link is on the same line as "Coach:" text near each stat table
  // Walk stat table sections — each has a heading "XXX Match Statistics"
  const statHeadings = root
    .querySelectorAll("*")
    .filter((el) => /Match Statistics/.test(el.text) && el.tagName !== "HTML");

  // Get team slugs from ft_team_home links that appear near each stat table
  const teamHomeLinks = root.querySelectorAll('a[href*="ft_team_home"]');
  const teamIds: string[] = [];
  for (const link of teamHomeLinks) {
    const href = link.getAttribute("href") ?? "";
    // href: /afl/footy/ft_team_home?tid=17 — not a slug, so we get team info differently
    // Instead, use the coach link which has the team slug embedded
  }

  // Better approach: the coach links are like /afl/footy/cp-dean-cox--384
  // These don't help either. Instead, look for links with th- pattern
  // which appear in the team name heading area.
  const thLinks = root.querySelectorAll('a[href*="/th-"]');
  console.log(
    `[afl-scraper] scrapeMatchStats: /th- links found=${thLinks.length}`,
  );
  for (const link of thLinks) {
    const href = link.getAttribute("href") ?? "";
    const slug = href.split("/th-")[1]?.split("?")[0]?.split("/")[0];
    console.log(
      `[afl-scraper] scrapeMatchStats: th- link href="${href}" → slug="${slug}"`,
    );
    if (slug && !teamIds.includes(slug)) {
      teamIds.push(slug);
    }
  }
  console.log(
    `[afl-scraper] scrapeMatchStats: teamIds after th- scan=${JSON.stringify(teamIds)}`,
  );

  // Fallback: parse stat table heading text to extract team name from "X Match Statistics"
  const tableHeadings: string[] = [];
  for (const el of root.querySelectorAll("*")) {
    if (el.childNodes.length === 1 && /Match Statistics/.test(el.text)) {
      const heading = el.text
        .replace("Match Statistics", "")
        .replace("(Sorted by Disposals)", "")
        .trim();
      if (heading) tableHeadings.push(heading);
    }
  }

  // ── Parse player stat tables ──────────────────────────────────────────────
  // Each team has a table with headers: Player K HB D M G B T HO GA I50 CL CG R50 FF FA AF SC
  const statTables: ScrapedPlayerStat[][] = [];

  for (const [tableIdx, table] of scoreTables.entries()) {
    const headerRow = table.querySelector("tr");
    if (!headerRow) continue;
    const headers = headerRow
      .querySelectorAll("th, td")
      .map((c) => c.text.trim().toUpperCase());

    // Identify a player stat table by its headers
    if (
      !headers.includes("K") ||
      !headers.includes("HB") ||
      !headers.includes("AF")
    ) {
      console.log(
        `[afl-scraper] scrapeMatchStats: table[${tableIdx}] skipped — headers=${JSON.stringify(headers.slice(0, 8))}`,
      );
      continue;
    }
    console.log(
      `[afl-scraper] scrapeMatchStats: table[${tableIdx}] identified as stat table, headers=${JSON.stringify(headers)}`,
    );

    const colIndex = {
      player: headers.indexOf("PLAYER") !== -1 ? headers.indexOf("PLAYER") : 0,
      k: headers.indexOf("K"),
      hb: headers.indexOf("HB"),
      d: headers.indexOf("D"),
      m: headers.indexOf("M"),
      g: headers.indexOf("G"),
      b: headers.indexOf("B"),
      t: headers.indexOf("T"),
      ho: headers.indexOf("HO"),
      ga: headers.indexOf("GA"),
      i50: headers.indexOf("I50"),
      cl: headers.indexOf("CL"),
      cg: headers.indexOf("CG"),
      r50: headers.indexOf("R50"),
      ff: headers.indexOf("FF"),
      fa: headers.indexOf("FA"),
      af: headers.indexOf("AF"),
      sc: headers.indexOf("SC"),
    };

    const rows = table.querySelectorAll("tr");
    const teamStats: ScrapedPlayerStat[] = [];

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll("td");
      if (cells.length < 10) continue;

      const playerName = cells[colIndex.player]?.text.trim();
      if (!playerName) continue;

      teamStats.push({
        playerName,
        teamId: "", // will be filled after table parsing
        kicks: num(cells[colIndex.k]?.text),
        handballs: num(cells[colIndex.hb]?.text),
        disposals: num(cells[colIndex.d]?.text),
        marks: num(cells[colIndex.m]?.text),
        goals: num(cells[colIndex.g]?.text),
        behinds: num(cells[colIndex.b]?.text),
        tackles: num(cells[colIndex.t]?.text),
        hitouts: num(cells[colIndex.ho]?.text),
        goalAssists: num(cells[colIndex.ga]?.text),
        inside50s: num(cells[colIndex.i50]?.text),
        clearances: num(cells[colIndex.cl]?.text),
        clangers: num(cells[colIndex.cg]?.text),
        rebound50s: num(cells[colIndex.r50]?.text),
        freesFor: num(cells[colIndex.ff]?.text),
        freesAgainst: num(cells[colIndex.fa]?.text),
        aflFantasyPts: num(cells[colIndex.af]?.text),
        supercoachPts: num(cells[colIndex.sc]?.text),
      });
    }

    console.log(
      `[afl-scraper] scrapeMatchStats: table[${tableIdx}] parsed ${teamStats.length} player rows`,
    );
    if (teamStats.length > 0) {
      statTables.push(teamStats);
    }
  }

  console.log(
    `[afl-scraper] scrapeMatchStats: stat tables found=${statTables.length}`,
  );

  if (statTables.length < 2) {
    throw new Error(
      `Could not parse two stat tables from match mid=${mid}. Got ${statTables.length}.`,
    );
  }

  // We now have two stat tables. Assign team IDs.
  // teamIds[0] = home, teamIds[1] = away (from /th- links in page order)
  const homeTeamInfo = teamIds[0]
    ? parseTeamHref(`th-${teamIds[0]}`)
    : { id: "unknown", name: "Unknown", shortName: "???" };
  const awayTeamInfo = teamIds[1]
    ? parseTeamHref(`th-${teamIds[1]}`)
    : { id: "unknown", name: "Unknown", shortName: "???" };

  const homeStats = statTables[0].map((s) => ({
    ...s,
    teamId: homeTeamInfo.id,
  }));
  const awayStats = statTables[1].map((s) => ({
    ...s,
    teamId: awayTeamInfo.id,
  }));

  console.log(
    `[afl-scraper] scrapeMatchStats: homeTeam=${JSON.stringify(homeTeamInfo)}, awayTeam=${JSON.stringify(awayTeamInfo)}`,
  );
  console.log(
    `[afl-scraper] scrapeMatchStats: homeStats=${homeStats.length} players, awayStats=${awayStats.length} players`,
  );

  const match: ScrapedMatch = {
    mid,
    round,
    year,
    homeTeam: homeTeamInfo,
    awayTeam: awayTeamInfo,
    homeScore,
    awayScore,
    venue,
    date,
    crowd,
  };

  console.log(
    `[afl-scraper] scrapeMatchStats: final match=${JSON.stringify(match)}`,
  );
  return { match, homeStats, awayStats };
}
