import { parse } from "node-html-parser";

const BASE = "https://www.footywire.com/afl/footy";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

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
  startDatetime: string | null; // "YYYY-MM-DDTHH:MM" AEST, sortable; null if not available
  crowd: number | null;
}

export interface ScrapedTeam {
  id: string; // slug e.g. "sydney-swans"
  name: string;
  shortName: string;
}

export interface ScrapedPlayerStat {
  playerName: string;
  onlineId: string;
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
  _debug?: Record<string, unknown>;
}

// Advanced stats from ft_match_statistics?mid=xxx&advv=Y
// Column order (17 td.statdata): CP UP ED DE% CM GA MI5 1% BO CCL SCL SI MG TO ITC T5 TOG%
export interface ScrapedPlayerAdvancedStat {
  playerName: string;
  onlineId: string;
  teamId: string;
  contestedPossessions: number;
  uncontestedPossessions: number;
  effectiveDisposals: number;
  disposalEfficiencyPct: number;
  contestedMarks: number;
  goalAssists: number;
  marksInside50: number;
  onePercenters: number;
  bounces: number;
  centreClearances: number;
  stoppageClearances: number;
  scoreInvolvements: number;
  metresGained: number;
  turnovers: number;
  intercepts: number;
  tacklesInside50: number;
  timeOnGroundPct: number;
}

export interface ScrapedMatchAdvancedStats {
  match: ScrapedMatch;
  homeAdvStats: ScrapedPlayerAdvancedStat[];
  awayAdvStats: ScrapedPlayerAdvancedStat[];
  _debug?: Record<string, unknown>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function num(s: string | undefined): number {
  const n = parseInt(s?.trim() ?? "0", 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Build a team record from a plain display name string
 * (e.g. "Greater Western Sydney" → id "greater-western-sydney", shortName "Sydney").
 */
function nameToTeamInfo(name: string): {
  id: string;
  name: string;
  shortName: string;
} {
  const id = name.toLowerCase().replace(/\s+/g, "-");
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

  const res = await fetch(url, { headers: HEADERS });
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

    const roundMatch = firstCell.match(
      /^(?:Round\s+(\d+)|P(\d+)|Qualifying\s+Final|Elimination\s+Final|Semi\s+Final|Preliminary\s+Final|Grand\s+Final)$/i
    );
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
      let r = null;
      if (roundMatch[1]) {
        const parsed = parseInt(roundMatch[1], 10);
        r = isNaN(parsed) ? null : parsed;
      } else if (roundMatch[2]) {
        const parsed = parseInt(roundMatch[2], 10);
        r = isNaN(parsed) ? null : -parsed;
      } else if (firstCell.match(/Grand\s+Final/i)) {
        r = 28;
      } else if (firstCell.match(/Preliminary\s+Final/i)) {
        r = 27;
      } else if (firstCell.match(/Semi\s+Final/i)) {
        r = 26;
      } else if (firstCell.match(/(?:Qualifying|Elimination)\s+Final/i)) {
        r = 25;
      }
      currentRound = r;
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

// ─── Step 1b: Find the latest completed match ID ────────────────────────────

export async function getLatestCompletedMatchId(
  year = new Date().getFullYear(),
): Promise<{ mid: number; round: number } | null> {
  const url = `${BASE}/ft_match_list?year=${year}`;
  console.log(`[afl-scraper] getLatestCompletedMatchId: fetching ${url}`);

  const res = await fetch(url, { headers: HEADERS });
  const html = await res.text();
  const root = parse(html);
  const rows = root.querySelectorAll("table tr");

  let currentRound: number | null = null;
  let latest: { mid: number; round: number } | null = null;

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length === 0) continue;

    const firstCell = cells[0].text.trim();
    const roundMatch = firstCell.match(
      /^(?:Round\s+(\d+)|P(\d+)|Qualifying\s+Final|Elimination\s+Final|Semi\s+Final|Preliminary\s+Final|Grand\s+Final)$/i,
    );
    if (roundMatch) {
      if (roundMatch[1]) {
        currentRound = parseInt(roundMatch[1], 10);
      } else if (roundMatch[2]) {
        currentRound = -parseInt(roundMatch[2], 10);
      } else if (firstCell.match(/Grand\s+Final/i)) {
        currentRound = 28;
      } else if (firstCell.match(/Preliminary\s+Final/i)) {
        currentRound = 27;
      } else if (firstCell.match(/Semi\s+Final/i)) {
        currentRound = 26;
      } else if (firstCell.match(/(?:Qualifying|Elimination)\s+Final/i)) {
        currentRound = 25;
      }
      continue;
    }

    if (currentRound === null) continue;

    const statsLink = row.querySelector('a[href*="ft_match_statistics"]');
    if (statsLink) {
      const href = statsLink.getAttribute("href") ?? "";
      const midMatch = href.match(/mid=(\d+)/);
      if (midMatch) {
        latest = { mid: parseInt(midMatch[1], 10), round: currentRound };
      }
    }
  }

  console.log(
    `[afl-scraper] getLatestCompletedMatchId: result=${latest ? `mid=${latest.mid}, round=${latest.round}` : "null"}`,
  );
  return latest;
}

// ─── Step 2: Get match IDs for a round ───────────────────────────────────────

export async function getMatchIdsForRound(
  round: number,
  year = new Date().getFullYear(),
): Promise<{ mid: number; startDatetime: string | null }[]> {
  const url = `${BASE}/ft_match_list?year=${year}`;
  console.log(
    `[afl-scraper] getMatchIdsForRound: fetching ${url} for round=${round}`,
  );

  const res = await fetch(url, { headers: HEADERS });
  console.log(`[afl-scraper] getMatchIdsForRound: HTTP ${res.status}`);
  const html = await res.text();

  const root = parse(html);
  const results: { mid: number; startDatetime: string | null }[] = [];
  let inTargetRound = false;

  const MONTHS: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  function parseDatetimeFromCell(cellText: string): string | null {
    // e.g. "Thu 24 Mar 7:20pm" or "Sat 26 Mar 1:40pm"
    const m = cellText.match(/\w{3}\s+(\d+)\s+(\w{3})\s+(\d+):(\d+)(am|pm)/i);
    if (!m) return null;
    const day = m[1].padStart(2, "0");
    const month = MONTHS[m[2].toLowerCase()];
    if (!month) return null;
    let hour = parseInt(m[3], 10);
    const minute = m[4];
    const ampm = m[5].toLowerCase();
    if (ampm === "pm" && hour !== 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    return `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:${minute}`;
  }

  const rows = root.querySelectorAll("table tr");
  console.log(
    `[afl-scraper] getMatchIdsForRound: scanning ${rows.length} table rows`,
  );

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length === 0) continue;

    const firstCell = cells[0].text.trim();
    const roundMatch = firstCell.match(
      /^(?:Round\s+(\d+)|P(\d+)|Qualifying\s+Final|Elimination\s+Final|Semi\s+Final|Preliminary\s+Final|Grand\s+Final)$/i
    );
    if (roundMatch) {
      let r = -1;
      if (roundMatch[1]) {
        r = parseInt(roundMatch[1], 10);
      } else if (roundMatch[2]) {
        r = -parseInt(roundMatch[2], 10);
      } else if (firstCell.match(/Grand\s+Final/i)) {
        r = 28;
      } else if (firstCell.match(/Preliminary\s+Final/i)) {
        r = 27;
      } else if (firstCell.match(/Semi\s+Final/i)) {
        r = 26;
      } else if (firstCell.match(/(?:Qualifying|Elimination)\s+Final/i)) {
        r = 25;
      }
      const wasIn = inTargetRound;
      inTargetRound = r === round;
      console.log(
        `[afl-scraper] getMatchIdsForRound: section "${firstCell}" → r=${r}, inTargetRound=${inTargetRound}`,
      );
      // Only break if we've moved to a DIFFERENT round number
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
        const startDatetime = parseDatetimeFromCell(firstCell);
        console.log(
          `[afl-scraper] getMatchIdsForRound: found mid=${mid} startDatetime=${startDatetime}`,
        );
        results.push({ mid, startDatetime });
      }
    } else if (cells.length >= 3) {
      console.log(
        `[afl-scraper] getMatchIdsForRound: game row without stats link: "${row.text.trim().slice(0, 100)}"`,
      );
    }
  }

  console.log(
    `[afl-scraper] getMatchIdsForRound: found ${results.length} matches for round ${round}`,
  );
  return results;
}

// ─── Step 3: Scrape player stats for a match ─────────────────────────────────

export async function scrapeMatchStats(
  mid: number,
): Promise<ScrapedMatchStats> {
  const url = `${BASE}/ft_match_statistics?mid=${mid}`;
  console.log(`[afl-scraper] scrapeMatchStats: fetching ${url}`);

  const res = await fetch(url, { headers: HEADERS });
  console.log(`[afl-scraper] scrapeMatchStats: HTTP ${res.status}`);
  const html = await res.text();
  console.log(`[afl-scraper] scrapeMatchStats: HTML length=${html.length}`);

  const root = parse(html);

  // ── Round / venue / date / year from body text ────────────────────────────
  const bodyText = root.text;

  let round = 0;
  const roundNumMatch = bodyText.match(/Round\s+(\d+)/i);
  if (roundNumMatch) {
    round = parseInt(roundNumMatch[1], 10);
  } else if (/Grand\s+Final/i.test(bodyText)) {
    round = 28;
  } else if (/Preliminary\s+Final/i.test(bodyText)) {
    round = 27;
  } else if (/Semi\s+Final/i.test(bodyText)) {
    round = 26;
  } else if (/(?:Qualifying|Elimination)\s+Final/i.test(bodyText)) {
    round = 25;
  }

  // Venue: appears after "Round N," or "Final Type," followed by venue name
  const venueMatch = bodyText.match(
    /(?:Round\s+\d+|Grand\s+Final|Preliminary\s+Final|Semi\s+Final|(?:Qualifying|Elimination)\s+Final),\s+([^,\n]+)/i,
  );
  const venue = venueMatch ? venueMatch[1].trim() : "";

  const attendanceMatch = bodyText.match(/Attendance:\s*([\d,]+)/i);
  const crowd = attendanceMatch
    ? parseInt(attendanceMatch[1].replace(/,/g, ""), 10)
    : null;

  const dateMatch = bodyText.match(/\b(\w+day),\s+(\d+\w+\s+\w+\s+\d{4})/i);
  const date = dateMatch ? `${dateMatch[1]}, ${dateMatch[2]}` : "";

  const yearMatch = bodyText.match(/\b(20\d{2})\b/);
  const year = yearMatch
    ? parseInt(yearMatch[1], 10)
    : new Date().getFullYear();

  console.log(
    `[afl-scraper] scrapeMatchStats: round=${round}, venue="${venue}", date="${date}", year=${year}, crowd=${crowd}`,
  );

  // ── Score table ───────────────────────────────────────────────────────────
  // #matchscoretable: row[1] = home, row[2] = away. Last td = final score.
  // Team name comes from the anchor in the first td of each row.
  let scoreTable = root.querySelector("#matchscoretable");
  if (!scoreTable) {
    // Try alternate selector for older years (2021-2022)
    scoreTable = root.querySelector("table.stats") || root.querySelector("table");
    if (scoreTable) {
      console.log(`[afl-scraper] scrapeMatchStats: using alternate table selector for mid=${mid}`);
    } else {
      throw new Error(`#matchscoretable not found for mid=${mid}`);
    }
  }

  const scoreRows = scoreTable.querySelectorAll("tr");
  if (scoreRows.length < 3) {
    throw new Error(
      `Score table has only ${scoreRows.length} rows for mid=${mid}`,
    );
  }

  const homeScoreCells = scoreRows[1].querySelectorAll("td");
  const awayScoreCells = scoreRows[2].querySelectorAll("td");
  const scoreHomeTeamName =
    scoreRows[1].querySelector("a")?.text.trim() ??
    homeScoreCells[0]?.text.trim() ??
    "";
  const scoreAwayTeamName =
    scoreRows[2].querySelector("a")?.text.trim() ??
    awayScoreCells[0]?.text.trim() ??
    "";
  const homeScore = num(homeScoreCells[homeScoreCells.length - 1]?.text);
  const awayScore = num(awayScoreCells[awayScoreCells.length - 1]?.text);

  console.log(
    `[afl-scraper] scrapeMatchStats: score: home="${scoreHomeTeamName}" ${homeScore}, away="${scoreAwayTeamName}" ${awayScore}`,
  );

  // ── Per-team stat sections ────────────────────────────────────────────────
  // #match-statistics-team1-row = home, #match-statistics-team2-row = away.
  // This matches the score table row order — confirmed from HTML structure.
  let team1Section = root.querySelector("#match-statistics-team1-row");
  let team2Section = root.querySelector("#match-statistics-team2-row");

  // Fallback for older years — try alternate selectors
  if (!team1Section || !team2Section) {
    const allSections = root.querySelectorAll("table");
    if (allSections.length >= 3) {
      // Typically structure: score table, then team1 stats, then team2 stats
      team1Section = team1Section || allSections[1];
      team2Section = team2Section || allSections[2];
      console.log(`[afl-scraper] scrapeMatchStats: using alternate section selectors for mid=${mid}`);
    }
  }

  if (!team1Section || !team2Section) {
    throw new Error(
      `Could not find team stat sections for mid=${mid} (team1=${!!team1Section}, team2=${!!team2Section})`,
    );
  }

  // Extract team display name from "Team Match Statistics (Sorted by Disposals)"
  // heading inside each section.
  function extractSectionTeamName(
    section: ReturnType<typeof root.querySelector>,
  ): string {
    const raw = section!.querySelector("td.innertbtitle")?.text ?? "";
    return raw
      .replace(/\s*match statistics.*/i, "")
      .replace(/\u00a0/g, " ") // nbsp → space
      .trim();
  }

  // Parse all player stat rows from a section.
  // Player rows have class "darkcolor" or "lightcolor".
  // Column layouts vary by era:
  //   17 cols (2010+):  K HB D M G B T HO GA I50 CL CG R50 FF FA AF SC
  //   14 cols (2007-09): K HB D M G B T HO GA I50 FF FA AF SC
  //   10 cols (≤2006):   K HB D M G B T HO FF FA
  function parseStatRows(
    section: ReturnType<typeof root.querySelector>,
    teamId: string,
  ): ScrapedPlayerStat[] {
    const rows = section!.querySelectorAll("tr.darkcolor, tr.lightcolor");
    const stats: ScrapedPlayerStat[] = [];

    for (const row of rows) {
      const anchor = row.querySelector("td a");
      const playerName =
        anchor?.getAttribute("title")?.trim() ?? anchor?.text.trim() ?? "";
      if (!playerName) continue;

      const href = anchor?.getAttribute("href") ?? "";
      // href format: "pp-{team-slug}--{player-name-slug}"
      // The name slug (after "--") is stable even when the player transfers teams.
      // The team slug portion is retroactively updated by footywire on transfers.
      const onlineId = href.includes("--")
        ? href.split("--").pop()!
        : playerName.toLowerCase().replace(/\s+/g, "-");

      const sd = row.querySelectorAll("td.statdata");
      const n = sd.length;
      if (n < 10) continue;

      let stat: ScrapedPlayerStat;

      if (n >= 17) {
        // 2010+ layout: K HB D M G B T HO GA I50 CL CG R50 FF FA AF SC
        stat = {
          playerName, onlineId, teamId,
          kicks: num(sd[0]?.text),
          handballs: num(sd[1]?.text),
          disposals: num(sd[2]?.text),
          marks: num(sd[3]?.text),
          goals: num(sd[4]?.text),
          behinds: num(sd[5]?.text),
          tackles: num(sd[6]?.text),
          hitouts: num(sd[7]?.text),
          goalAssists: num(sd[8]?.text),
          inside50s: num(sd[9]?.text),
          clearances: num(sd[10]?.text),
          clangers: num(sd[11]?.text),
          rebound50s: num(sd[12]?.text),
          freesFor: num(sd[13]?.text),
          freesAgainst: num(sd[14]?.text),
          aflFantasyPts: num(sd[15]?.text),
          supercoachPts: num(sd[16]?.text),
        };
      } else if (n >= 14) {
        // 2007-2009 layout: K HB D M G B T HO GA I50 FF FA AF SC
        stat = {
          playerName, onlineId, teamId,
          kicks: num(sd[0]?.text),
          handballs: num(sd[1]?.text),
          disposals: num(sd[2]?.text),
          marks: num(sd[3]?.text),
          goals: num(sd[4]?.text),
          behinds: num(sd[5]?.text),
          tackles: num(sd[6]?.text),
          hitouts: num(sd[7]?.text),
          goalAssists: num(sd[8]?.text),
          inside50s: num(sd[9]?.text),
          clearances: 0,
          clangers: 0,
          rebound50s: 0,
          freesFor: num(sd[10]?.text),
          freesAgainst: num(sd[11]?.text),
          aflFantasyPts: num(sd[12]?.text),
          supercoachPts: num(sd[13]?.text),
        };
      } else {
        // ≤2006 layout: K HB D M G B T HO FF FA
        stat = {
          playerName, onlineId, teamId,
          kicks: num(sd[0]?.text),
          handballs: num(sd[1]?.text),
          disposals: num(sd[2]?.text),
          marks: num(sd[3]?.text),
          goals: num(sd[4]?.text),
          behinds: num(sd[5]?.text),
          tackles: num(sd[6]?.text),
          hitouts: num(sd[7]?.text),
          goalAssists: 0,
          inside50s: 0,
          clearances: 0,
          clangers: 0,
          rebound50s: 0,
          freesFor: num(sd[8]?.text),
          freesAgainst: num(sd[9]?.text),
          aflFantasyPts: 0,
          supercoachPts: 0,
        };
      }

      stats.push(stat);
    }

    return stats;
  }

  const section1Name = extractSectionTeamName(team1Section);
  const section2Name = extractSectionTeamName(team2Section);

  console.log(
    `[afl-scraper] scrapeMatchStats: section1="${section1Name}", section2="${section2Name}"`,
  );

  // Build team info from section headings (more precise than score table names).
  // Fall back to score table name if heading extraction failed.
  const homeTeamInfo = nameToTeamInfo(section1Name || scoreHomeTeamName);
  const awayTeamInfo = nameToTeamInfo(section2Name || scoreAwayTeamName);

  const homeStats = parseStatRows(team1Section, homeTeamInfo.id);
  const awayStats = parseStatRows(team2Section, awayTeamInfo.id);

  console.log(
    `[afl-scraper] scrapeMatchStats: homeTeam=${JSON.stringify(homeTeamInfo)}, homeStats=${homeStats.length}`,
  );
  console.log(
    `[afl-scraper] scrapeMatchStats: awayTeam=${JSON.stringify(awayTeamInfo)}, awayStats=${awayStats.length}`,
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
    startDatetime: null, // not available on individual match page; set by caller if known
    crowd,
  };

  const _debug = {
    scoreHomeTeamName,
    scoreAwayTeamName,
    section1Name,
    section2Name,
    homeScore,
    awayScore,
  };

  console.log(
    `[afl-scraper] scrapeMatchStats: final match=${JSON.stringify(match)}`,
  );
  return { match, homeStats, awayStats, _debug };
}

// ─── Step 3b: Scrape advanced player stats for a match ────────────────────────

export async function scrapeMatchAdvancedStats(
  mid: number,
): Promise<ScrapedMatchAdvancedStats> {
  const url = `${BASE}/ft_match_statistics?mid=${mid}&advv=Y`;
  console.log(`[afl-scraper] scrapeMatchAdvancedStats: fetching ${url}`);

  const res = await fetch(url, { headers: HEADERS });
  console.log(`[afl-scraper] scrapeMatchAdvancedStats: HTTP ${res.status}`);
  const html = await res.text();
  console.log(
    `[afl-scraper] scrapeMatchAdvancedStats: HTML length=${html.length}`,
  );

  const root = parse(html);

  // ── Score table — same structure as base page ─────────────────────────────
  let scoreTable = root.querySelector("#matchscoretable");
  if (!scoreTable) {
    // Try alternate selector for older years
    scoreTable = root.querySelector("table.stats") || root.querySelector("table");
    if (scoreTable) {
      console.log(`[afl-scraper] scrapeMatchAdvancedStats: using alternate table selector for mid=${mid}`);
    } else {
      throw new Error(`#matchscoretable not found for mid=${mid} (advv=Y)`);
    }
  }

  const scoreRows = scoreTable.querySelectorAll("tr");
  if (scoreRows.length < 3) {
    throw new Error(
      `Score table has only ${scoreRows.length} rows for mid=${mid} (advv=Y)`,
    );
  }

  const homeScoreCells = scoreRows[1].querySelectorAll("td");
  const awayScoreCells = scoreRows[2].querySelectorAll("td");
  const scoreHomeTeamName =
    scoreRows[1].querySelector("a")?.text.trim() ??
    homeScoreCells[0]?.text.trim() ??
    "";
  const scoreAwayTeamName =
    scoreRows[2].querySelector("a")?.text.trim() ??
    awayScoreCells[0]?.text.trim() ??
    "";
  const homeScore = num(homeScoreCells[homeScoreCells.length - 1]?.text);
  const awayScore = num(awayScoreCells[awayScoreCells.length - 1]?.text);

  // ── Body text for match metadata ─────────────────────────────────────────
  const bodyText = root.text;
  let round = 0;
  const roundNumMatch = bodyText.match(/Round\s+(\d+)/i);
  if (roundNumMatch) {
    round = parseInt(roundNumMatch[1], 10);
  } else if (/Grand\s+Final/i.test(bodyText)) {
    round = 28;
  } else if (/Preliminary\s+Final/i.test(bodyText)) {
    round = 27;
  } else if (/Semi\s+Final/i.test(bodyText)) {
    round = 26;
  } else if (/(?:Qualifying|Elimination)\s+Final/i.test(bodyText)) {
    round = 25;
  }
  const venueMatch = bodyText.match(
    /(?:Round\s+\d+|Grand\s+Final|Preliminary\s+Final|Semi\s+Final|(?:Qualifying|Elimination)\s+Final),\s+([^,\n]+)/i,
  );
  const venue = venueMatch ? venueMatch[1].trim() : "";
  const attendanceMatch = bodyText.match(/Attendance:\s*([\d,]+)/i);
  const crowd = attendanceMatch
    ? parseInt(attendanceMatch[1].replace(/,/g, ""), 10)
    : null;
  const dateMatch = bodyText.match(/\b(\w+day),\s+(\d+\w+\s+\w+\s+\d{4})/i);
  const date = dateMatch ? `${dateMatch[1]}, ${dateMatch[2]}` : "";
  const yearMatch = bodyText.match(/\b(20\d{2})\b/);
  const year = yearMatch
    ? parseInt(yearMatch[1], 10)
    : new Date().getFullYear();

  // ── Per-team stat sections ────────────────────────────────────────────────
  let team1Section = root.querySelector("#match-statistics-team1-row");
  let team2Section = root.querySelector("#match-statistics-team2-row");

  // Fallback for older years
  if (!team1Section || !team2Section) {
    const allSections = root.querySelectorAll("table");
    if (allSections.length >= 3) {
      team1Section = team1Section || allSections[1];
      team2Section = team2Section || allSections[2];
      console.log(`[afl-scraper] scrapeMatchAdvancedStats: using alternate section selectors for mid=${mid}`);
    }
  }

  if (!team1Section || !team2Section) {
    throw new Error(
      `Could not find team stat sections for mid=${mid} (advv=Y, team1=${!!team1Section}, team2=${!!team2Section})`,
    );
  }

  function extractSectionTeamName(
    section: ReturnType<typeof root.querySelector>,
  ): string {
    const raw = section!.querySelector("td.innertbtitle")?.text ?? "";
    return raw
      .replace(/\s*match statistics.*/i, "")
      .replace(/\u00a0/g, " ")
      .trim();
  }

  // Advanced stat column order (17 td.statdata cells, 2015+):
  // 0:CP 1:UP 2:ED 3:DE% 4:CM 5:GA 6:MI5 7:1% 8:BO 9:CCL 10:SCL 11:SI 12:MG 13:TO 14:ITC 15:T5 16:TOG%
  // Pre-2015: the advv=Y page shows the same basic stats, not advanced — return empty.
  function parseAdvancedStatRows(
    section: ReturnType<typeof root.querySelector>,
    teamId: string,
  ): ScrapedPlayerAdvancedStat[] {
    const rows = section!.querySelectorAll("tr.darkcolor, tr.lightcolor");
    const stats: ScrapedPlayerAdvancedStat[] = [];

    for (const row of rows) {
      const anchor = row.querySelector("td a");
      const playerName =
        anchor?.getAttribute("title")?.trim() ?? anchor?.text.trim() ?? "";
      if (!playerName) continue;

      const href = anchor?.getAttribute("href") ?? "";
      const onlineId = href.includes("--")
        ? href.split("--").pop()!
        : playerName.toLowerCase().replace(/\s+/g, "-");

      const sd = row.querySelectorAll("td.statdata");
      if (sd.length < 17) continue; // pre-2015 pages won't have 17 advanced columns

      stats.push({
        playerName,
        onlineId,
        teamId,
        contestedPossessions: num(sd[0]?.text),
        uncontestedPossessions: num(sd[1]?.text),
        effectiveDisposals: num(sd[2]?.text),
        disposalEfficiencyPct: num(sd[3]?.text),
        contestedMarks: num(sd[4]?.text),
        goalAssists: num(sd[5]?.text),
        marksInside50: num(sd[6]?.text),
        onePercenters: num(sd[7]?.text),
        bounces: num(sd[8]?.text),
        centreClearances: num(sd[9]?.text),
        stoppageClearances: num(sd[10]?.text),
        scoreInvolvements: num(sd[11]?.text),
        metresGained: num(sd[12]?.text),
        turnovers: num(sd[13]?.text),
        intercepts: num(sd[14]?.text),
        tacklesInside50: num(sd[15]?.text),
        timeOnGroundPct: num(sd[16]?.text),
      });
    }

    return stats;
  }

  const section1Name = extractSectionTeamName(team1Section);
  const section2Name = extractSectionTeamName(team2Section);

  const homeTeamInfo = nameToTeamInfo(section1Name || scoreHomeTeamName);
  const awayTeamInfo = nameToTeamInfo(section2Name || scoreAwayTeamName);

  const homeAdvStats = parseAdvancedStatRows(team1Section, homeTeamInfo.id);
  const awayAdvStats = parseAdvancedStatRows(team2Section, awayTeamInfo.id);

  console.log(
    `[afl-scraper] scrapeMatchAdvancedStats: homeTeam=${homeTeamInfo.id}, homeAdv=${homeAdvStats.length}, awayAdv=${awayAdvStats.length}`,
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
    startDatetime: null,
    crowd,
  };

  const _debug = { section1Name, section2Name, homeScore, awayScore };

  return { match, homeAdvStats, awayAdvStats, _debug };
}
