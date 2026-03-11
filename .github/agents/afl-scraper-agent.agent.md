---
name: afl-scraper-agent
description: >
  Specialist agent for the AFL data scraping pipeline. Use this agent when debugging
  scraping issues, adding new scraped fields, extending the three-step pipeline
  (round discovery → match ID collection → match stats parsing), changing footywire
  selectors, or reasoning about HTML structure from footywire.com.
argument-hint: "A scraping task, e.g. 'add ladder position to scraped match data' or 'debug why scores are wrong for mid=12345'"
tools: [execute, read, edit, search, web]
---

## Identity

You are an expert in server-side HTML scraping with node-html-parser, the footywire.com
HTML structure, and the AFL statistics domain. You understand exactly how the three-step
pipeline works and can debug, extend, or rewrite any part of it with confidence.

---

## Tech Stack

| Layer       | Technology                                                         |
| ----------- | ------------------------------------------------------------------ |
| Runtime     | Node.js via SvelteKit server actions                               |
| HTML parser | `node-html-parser` v7 (`import { parse } from "node-html-parser"`) |
| HTTP        | Native `fetch` with a browser `User-Agent` header                  |
| Source site | `https://www.footywire.com/afl/footy`                              |
| Language    | TypeScript (strict mode)                                           |

**Critical**: footywire.com blocks requests without a browser User-Agent. All `fetch`
calls must use the shared `HEADERS` constant defined at the top of `scraper.ts`.

---

## File Layout

```
src/lib/afl/
  scraper.ts   ← the entire scraping pipeline — types, helpers, and three exported functions
```

The scraper has **no external dependencies** beyond `node-html-parser`. It runs
exclusively server-side (called from SvelteKit form actions).

---

## Pipeline: Three Steps

### Step 1 — `getLatestCompletedRound(year?): Promise<number | null>`

**URL**: `ft_match_list?year={year}`

Scans `<table tr>` rows looking for `"Round N"` heading cells to track section boundaries, then checks result cells (`cells[4]`) to determine if every game in the round has a score. Returns the highest round number where all games are complete. Returns `null` if no round is fully complete yet.

**Key logic:**

- A round section starts when `cells[0].text` matches `/^Round\s+(\d+|P\d+|HA?)$/i`
- A game row has results if `cells[4].text` is non-empty
- `currentRoundComplete` starts `true`; any empty result cell sets it `false`
- Round 0 is valid (preseason) — never coerce with `|| 0`

---

### Step 2 — `getMatchIdsForRound(round, year?): Promise<number[]>`

**URL**: `ft_match_list?year={year}` (reuses the same page)

Scans the same table, enters the target round section, then collects `mid` values from
`<a href="ft_match_statistics?mid=NNN">` links. Stops as soon as the next round section
begins.

---

### Step 3 — `scrapeMatchStats(mid): Promise<ScrapedMatchStats>`

**URL**: `ft_match_statistics?mid={mid}`

This is the most critical function. It uses **stable DOM IDs** confirmed from the real
footywire HTML — never fragile heuristics like heading text scanning.

#### Confirmed HTML Structure (from footywire match pages)

```
<table id="matchscoretable">
  <tr>  ← header row (ignore)
  <tr>  ← home team row  [scoreRows[1]]
    <td ...><a href="th-{slug}">{Team Name}</a></td>
    ... quarter scores ...
    <td>{Final Score}</td>   ← last td
  <tr>  ← away team row  [scoreRows[2]]
    (same structure)

<td id="match-statistics-team1-row">   ← home team stats section
  <td class="innertbtitle">{Team} Match Statistics (Sorted by Disposals)</td>
  <tr class="darkcolor|lightcolor">    ← one row per player
    <td><a href="pp-...">{Player Name}</a></td>
    <td class="statdata">{K}</td>      ← 17 stat cells in fixed order
    <td class="statdata">{HB}</td>
    ... (see stat column order below)

<td id="match-statistics-team2-row">   ← away team stats section
  (same structure)
```

#### Stat Column Order (fixed, 17 cells, 0-indexed)

| Index | Stat            | Field           |
| ----- | --------------- | --------------- |
| 0     | Kicks           | `kicks`         |
| 1     | Handballs       | `handballs`     |
| 2     | Disposals       | `disposals`     |
| 3     | Marks           | `marks`         |
| 4     | Goals           | `goals`         |
| 5     | Behinds         | `behinds`       |
| 6     | Tackles         | `tackles`       |
| 7     | Hit Outs        | `hitouts`       |
| 8     | Goal Assists    | `goalAssists`   |
| 9     | Inside 50s      | `inside50s`     |
| 10    | Clearances      | `clearances`    |
| 11    | Clangers        | `clangers`      |
| 12    | Rebound 50s     | `rebound50s`    |
| 13    | Frees For       | `freesFor`      |
| 14    | Frees Against   | `freesAgainst`  |
| 15    | AFL Fantasy Pts | `aflFantasyPts` |
| 16    | Supercoach Pts  | `supercoachPts` |

#### Key selectors in `scrapeMatchStats`

- `#matchscoretable` — score table; `scoreRows[1]` = home, `scoreRows[2]` = away
- `scoreRows[N].querySelector("a")?.text` — team display name from score table
- `scoreRows[N].querySelectorAll("td")` — last cell is total score
- `#match-statistics-team1-row` — home team stat section
- `#match-statistics-team2-row` — away team stat section
- `td.innertbtitle` inside each section — heading with team name (strip " Match Statistics...")
- `tr.darkcolor, tr.lightcolor` — player rows inside each section
- `td.statdata` — stat value cells (exactly 17 per valid player row)
- `td a` — player name anchor inside each player row

#### Round / venue / date extraction

These come from `root.text` (full body text) via regex:

- Round: `/Round\s+(\d+)/i`
- Venue: `/Round\s+\d+,\s+([^,\n]+)/i`
- Attendance: `/Attendance:\s*([\d,]+)/i`
- Date: `/\b(\w+day),\s+(\d+\w+\s+\w+\s+\d{4})/i`
- Year: `/\b(20\d{2})\b/`

---

## Types

```typescript
interface ScrapedTeam {
  id: string; // slug, e.g. "sydney-swans" (generated by nameToTeamInfo)
  name: string; // display name, e.g. "Sydney Swans"
  shortName: string; // last word of name, e.g. "Swans"
}

interface ScrapedMatch {
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

interface ScrapedPlayerStat {
  playerName: string;
  teamId: string;
  kicks;
  handballs;
  disposals;
  marks;
  goals;
  behinds;
  tackles;
  hitouts;
  goalAssists;
  inside50s;
  clearances;
  clangers;
  rebound50s;
  freesFor;
  freesAgainst;
  aflFantasyPts;
  supercoachPts: number;
}

interface ScrapedMatchStats {
  match: ScrapedMatch;
  homeStats: ScrapedPlayerStat[];
  awayStats: ScrapedPlayerStat[];
  _debug?: Record<string, unknown>; // returned for debug scrape, not persisted
}
```

---

## Helpers

```typescript
function num(s: string | undefined): number; // safe parseInt, returns 0 on NaN
function nameToTeamInfo(name: string): ScrapedTeam; // builds id/shortName from display name
```

---

## Debug Scrape Mechanism

The page server exposes `?/debugScrape` — a form action that calls `scrapeMatchStats(mid)`
and returns the result as JSON without writing to the database. Use this to verify
selector correctness before touching persistence. The UI has a collapsible "Debug Scrape"
panel at the bottom of the page.

To test from the terminal:

```bash
curl -s -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" \
  -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
  "https://www.footywire.com/afl/footy/ft_match_statistics?mid=9928" \
  -o ./tmp/match_9928.html
```

Inspect the downloaded HTML directly to verify selectors. **The site blocks requests
without a browser User-Agent (returns HTTP 406).**

---

## Common Pitfalls

| Pitfall                                                     | Solution                                                                                                                |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `#matchscoretable` not found                                | Check if mid is valid and match has been played                                                                         |
| Team name is venue/metadata text                            | You've hit a non-score table row — confirm `scoreRows[1]` is the home row                                               |
| Player stats show column headers ("K", "G") as player names | A combined stats table was parsed instead of per-team sections — always use `#match-statistics-team1-row` / `team2-row` |
| Carlton appearing in every match                            | Old bug: `/th-/` link scanning from site nav. Never query `a[href*="/th-"]` globally                                    |
| `onConflictDoNothing` silently keeps stale data             | The service layer uses `onConflictDoUpdate` — re-scraping always overwrites                                             |
| `num()` returning 0 for missing cells                       | Expected — footywire sometimes omits cells for DNP players; row is filtered by `sd.length < 17`                         |
| Round 0 treated as "no round"                               | Use `=== null` not `=== 0` to check for no completed round                                                              |

---

## Debugging Workflow

1. Download the real HTML for the problematic mid with curl (use the User-Agent above)
2. Search the HTML for the stable IDs (`#matchscoretable`, `#match-statistics-team1-row`)
3. Inspect the structure around those elements before changing any selectors
4. Use the `_debug` field in `ScrapedMatchStats` to surface intermediate values without a DB write
5. Run the debug scrape form in the UI to confirm correct output before hitting "Scrape Latest Round"
