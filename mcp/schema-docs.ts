// Human-readable schema docs handed to the model via list_tables / describe_table.
//
// This is the single most important file for ANSWER ACCURACY. The model cannot see
// the database — it only knows what these descriptions tell it. The advanced-stats
// columns in particular are meaningless without expansion (CP, UP, DE%, ...).
//
// Only AFL DATA tables are listed here. kali_users, api_keys and api_request_log are
// deliberately excluded and must NOT be granted to the read-only role — they hold
// user emails and key hashes.

interface ColumnDoc {
  name: string;
  type: string;
  description: string;
}

interface TableDoc {
  name: string;
  description: string;
  columns: ColumnDoc[];
}

const TABLES: TableDoc[] = [
  {
    name: "teams",
    description: "The 18 AFL clubs. `id` is a slug used as the foreign key everywhere else.",
    columns: [
      { name: "id", type: "text (PK)", description: "Slug, e.g. 'sydney-swans'. Join target for *_team_id columns." },
      { name: "name", type: "text", description: "Full club name, e.g. 'Sydney Swans'." },
      { name: "short_name", type: "text", description: "Abbreviation, e.g. 'Sydney'." },
    ],
  },
  {
    name: "matches",
    description: "Completed match results (source: footywire). `id` is the footywire match id (mid).",
    columns: [
      { name: "id", type: "integer (PK)", description: "Footywire match id (mid). NOT interchangeable with fixtures.id." },
      { name: "round", type: "integer", description: "Round number within the season." },
      { name: "year", type: "integer", description: "Season year." },
      { name: "home_team_id", type: "text → teams.id", description: "Home club slug." },
      { name: "away_team_id", type: "text → teams.id", description: "Away club slug." },
      { name: "venue", type: "text", description: "Ground name." },
      { name: "date", type: "text", description: "Match date (text)." },
      { name: "start_datetime", type: "text, nullable", description: "Sortable AEST start, e.g. '2016-03-24T19:20'." },
      { name: "home_score", type: "integer, nullable", description: "Final home total points." },
      { name: "away_score", type: "integer, nullable", description: "Final away total points." },
      { name: "crowd", type: "integer, nullable", description: "Attendance." },
    ],
  },
  {
    name: "fixtures",
    description: "Scheduled games incl. upcoming (source: Squiggle). `id` is the Squiggle game id, distinct from matches.id.",
    columns: [
      { name: "id", type: "integer (PK)", description: "Squiggle game id. NOT the same as matches.id." },
      { name: "round", type: "integer", description: "Round number." },
      { name: "year", type: "integer", description: "Season year." },
      { name: "date", type: "text, nullable", description: "AEST datetime '2026-03-15 19:25:00', null if TBC." },
      { name: "hteam / ateam", type: "text, nullable", description: "Home/away club name; null for unconfirmed finals." },
      { name: "hteamid / ateamid", type: "integer, nullable", description: "Squiggle team ids (NOT teams.id slugs)." },
      { name: "venue", type: "text, nullable", description: "Ground name." },
      { name: "hscore / ascore", type: "integer, nullable", description: "Scores if played." },
      { name: "complete", type: "integer", description: "Completion percentage 0–100 (100 = final)." },
      { name: "winner", type: "text, nullable", description: "Winning club name." },
    ],
  },
  {
    name: "tips",
    description: "Per-game tipster predictions (source: Squiggle). One row per (game, tipster).",
    columns: [
      { name: "game_id", type: "integer", description: "Squiggle game id (= fixtures.id)." },
      { name: "year / round", type: "integer", description: "Season + round." },
      { name: "hteam / ateam", type: "text", description: "Home/away club name." },
      { name: "hconfidence", type: "integer", description: "Tipster's % chance the HOME team wins." },
      { name: "source", type: "text", description: "Tipster name." },
    ],
  },
  {
    name: "predictions",
    description: "In-house model predictions, one per (fixture, model_version). Probabilities are integer tenths of a percent.",
    columns: [
      { name: "fixture_id", type: "integer → fixtures.id", description: "The predicted fixture." },
      { name: "year / round", type: "integer", description: "Season + round." },
      { name: "home_team_id / away_team_id", type: "text → teams.id", description: "Club slugs." },
      { name: "home_probability", type: "integer", description: "Home win prob in TENTHS of a percent (723 = 72.3%)." },
      { name: "away_probability", type: "integer", description: "Away win prob in tenths of a percent." },
      { name: "squiggle_consensus", type: "integer, nullable", description: "Consensus home prob (tenths of %), null if no tips." },
      { name: "model_version", type: "text", description: "Model version string." },
      { name: "actual_winner", type: "text, nullable", description: "'home' | 'away' | 'draw' | null (unsettled)." },
    ],
  },
  {
    name: "players",
    description: "Player identities. `current_team_id` is their latest club; use player_team_assignments for history.",
    columns: [
      { name: "id", type: "serial (PK)", description: "Internal player id. Join target for player_stats.player_id." },
      { name: "name", type: "text", description: "Player full name." },
      { name: "current_team_id", type: "text → teams.id", description: "Most recent club slug." },
      { name: "online_id", type: "text, nullable", description: "Footywire profile id (nullable for historical players)." },
    ],
  },
  {
    name: "player_team_assignments",
    description: "Career club history. One row per stint at a club.",
    columns: [
      { name: "player_id", type: "integer → players.id", description: "The player." },
      { name: "team_id", type: "text → teams.id", description: "Club slug." },
      { name: "start_year", type: "integer", description: "First season of this stint." },
      { name: "end_year", type: "integer, nullable", description: "Last season; NULL = currently at this club." },
      { name: "reason", type: "text, nullable", description: "'trade' | 'rookie' | 'delisted' | 'retirement' | ..." },
    ],
  },
  {
    name: "player_stats",
    description: "Basic per-player per-match stat line. One row per (player, match). Join match_id → matches.id for round/year/teams.",
    columns: [
      { name: "player_id", type: "integer → players.id", description: "The player." },
      { name: "match_id", type: "integer → matches.id", description: "The match (gives round/year/venue)." },
      { name: "team_id", type: "text → teams.id, nullable", description: "Club the player represented in this match." },
      { name: "kicks / handballs / disposals", type: "integer", description: "disposals = kicks + handballs." },
      { name: "marks / goals / behinds / tackles / hitouts", type: "integer", description: "Core counting stats." },
      { name: "goal_assists / inside_50s / clearances", type: "integer", description: "Playmaking + midfield stats." },
      { name: "clangers / rebound_50s", type: "integer", description: "Errors / defensive rebounds." },
      { name: "frees_for / frees_against", type: "integer", description: "Free kicks won / conceded." },
      { name: "afl_fantasy_pts / supercoach_pts", type: "integer", description: "Fantasy scoring." },
    ],
  },
  {
    name: "player_stats_advanced",
    description: "Advanced per-player per-match stats. One row per (player, match). Column names below expand the cryptic footywire codes.",
    columns: [
      { name: "player_id", type: "integer → players.id", description: "The player." },
      { name: "match_id", type: "integer → matches.id", description: "The match." },
      { name: "team_id", type: "text → teams.id, nullable", description: "Club represented." },
      { name: "contested_possessions", type: "integer", description: "CP — possessions won under physical pressure." },
      { name: "uncontested_possessions", type: "integer", description: "UP — possessions won without pressure." },
      { name: "effective_disposals", type: "integer", description: "ED — disposals that hit a teammate / retained possession." },
      { name: "disposal_efficiency_pct", type: "integer", description: "DE% — effective disposals as a whole-number percentage." },
      { name: "contested_marks", type: "integer", description: "CM — marks taken under physical pressure." },
      { name: "goal_assists", type: "integer", description: "GA — passes/knock-ons directly leading to a goal." },
      { name: "marks_inside_50", type: "integer", description: "MI5 — marks taken inside attacking 50m arc." },
      { name: "one_percenters", type: "integer", description: "1% — spoils, smothers, knock-ons (defensive effort acts)." },
      { name: "bounces", type: "integer", description: "BO — running bounces." },
      { name: "centre_clearances", type: "integer", description: "CCL — clearances from a centre bounce." },
      { name: "stoppage_clearances", type: "integer", description: "SCL — clearances from a non-centre stoppage." },
      { name: "score_involvements", type: "integer", description: "SI — involvements in a scoring chain." },
      { name: "metres_gained", type: "integer", description: "MG — net metres the ball was advanced by the player." },
      { name: "turnovers", type: "integer", description: "TO — possessions lost to the opposition." },
      { name: "intercepts", type: "integer", description: "ITC — intercepting an opposition disposal." },
      { name: "tackles_inside_50", type: "integer", description: "T5 — tackles laid inside attacking 50m arc." },
      { name: "time_on_ground_pct", type: "integer", description: "TOG% — percentage of game time on the ground." },
    ],
  },
];

const BY_NAME = new Map(TABLES.map((t) => [t.name, t]));

/** Compact listing for the list_tables tool. */
export function listTablesText(): string {
  const lines = TABLES.map((t) => `- ${t.name}: ${t.description}`);
  return [
    "Queryable AFL tables (read-only). Call describe_table(<name>) for columns.",
    ...lines,
    "",
    "Key join notes: *_team_id columns reference teams.id (a slug). player_stats.match_id",
    "and player_stats_advanced.match_id reference matches.id (footywire mid). fixtures.id is",
    "a DIFFERENT id space (Squiggle game id) — do not join it to matches.id.",
  ].join("\n");
}

/** Full column detail for one table, or null if the name is unknown. */
export function describeTableText(name: string): string | null {
  const t = BY_NAME.get(name.trim().toLowerCase());
  if (!t) return null;
  const rows = t.columns.map((c) => `  ${c.name}  [${c.type}]\n    ${c.description}`);
  return [`Table: ${t.name}`, t.description, "", "Columns:", ...rows].join("\n");
}
