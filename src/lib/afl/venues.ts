// Canonical venue identities for the prediction model. Match rows (footywire)
// and fixtures (Squiggle) name the same grounds differently — "MCG" vs
// "M.C.G.", "Optus Stadium" vs "Perth Stadium" — and sponsor names churn over
// the years ("Etihad" → "Marvel"). Everything model-side goes through
// normalizeVenue() so venue records survive renames, and venueState() feeds
// the interstate-travel factor. Unknown or dirty values (some historical rows
// carry a weekday in the venue column) normalise to null and the model simply
// applies no venue/travel signal for them.

export type AussieState =
  | "VIC"
  | "NSW"
  | "QLD"
  | "SA"
  | "WA"
  | "TAS"
  | "NT"
  | "ACT"
  | "INTL";

interface VenueInfo {
  /** Canonical key, stable across sponsor renames. */
  key: string;
  state: AussieState;
  aliases: string[];
}

const VENUES: VenueInfo[] = [
  { key: "mcg", state: "VIC", aliases: ["mcg", "melbourne cricket ground"] },
  {
    key: "docklands",
    state: "VIC",
    aliases: ["marvel stadium", "docklands", "etihad stadium", "telstra dome", "colonial stadium"],
  },
  {
    key: "kardinia-park",
    state: "VIC",
    aliases: ["gmhba stadium", "kardinia park", "simonds stadium", "skilled stadium", "shell stadium"],
  },
  {
    key: "princes-park",
    state: "VIC",
    aliases: ["princes park", "ikon park", "visy park", "optus oval"],
  },
  { key: "eureka-stadium", state: "VIC", aliases: ["mars stadium", "eureka stadium"] },
  { key: "gabba", state: "QLD", aliases: ["gabba", "the gabba"] },
  {
    key: "carrara",
    state: "QLD",
    aliases: ["people first stadium", "carrara", "heritage bank stadium", "metricon stadium", "gold coast stadium"],
  },
  { key: "cazalys-stadium", state: "QLD", aliases: ["cazaly's stadium", "cazalys stadium"] },
  { key: "riverway-stadium", state: "QLD", aliases: ["riverway stadium"] },
  { key: "scg", state: "NSW", aliases: ["scg", "sydney cricket ground"] },
  {
    key: "sydney-showground",
    state: "NSW",
    aliases: ["engie stadium", "sydney showground", "giants stadium", "spotless stadium", "skoda stadium"],
  },
  {
    key: "stadium-australia",
    state: "NSW",
    aliases: ["accor stadium", "stadium australia", "anz stadium", "telstra stadium"],
  },
  { key: "blacktown", state: "NSW", aliases: ["blacktown international"] },
  { key: "adelaide-oval", state: "SA", aliases: ["adelaide oval"] },
  { key: "football-park", state: "SA", aliases: ["aami stadium", "football park"] },
  { key: "norwood-oval", state: "SA", aliases: ["norwood oval", "coopers stadium"] },
  { key: "barossa-park", state: "SA", aliases: ["barossa park"] },
  { key: "adelaide-hills", state: "SA", aliases: ["adelaide hills", "summit sports park"] },
  { key: "perth-stadium", state: "WA", aliases: ["optus stadium", "perth stadium"] },
  {
    key: "subiaco",
    state: "WA",
    aliases: ["domain stadium", "subiaco", "subiaco oval", "patersons stadium"],
  },
  { key: "hands-oval", state: "WA", aliases: ["hands oval"] },
  {
    key: "york-park",
    state: "TAS",
    aliases: ["utas stadium", "york park", "aurora stadium", "university of tasmania stadium"],
  },
  {
    key: "bellerive-oval",
    state: "TAS",
    aliases: ["ninja stadium", "bellerive oval", "blundstone arena"],
  },
  { key: "marrara-oval", state: "NT", aliases: ["tio stadium", "marrara oval", "marrara"] },
  { key: "traeger-park", state: "NT", aliases: ["tio traeger park", "traeger park"] },
  {
    key: "manuka-oval",
    state: "ACT",
    aliases: ["manuka oval", "startrack oval", "unsw canberra oval"],
  },
  { key: "jiangwan-stadium", state: "INTL", aliases: ["jiangwan stadium", "adelaide arena at jiangwan stadium"] },
  { key: "wellington", state: "INTL", aliases: ["westpac stadium", "wellington"] },
];

/** Where each club is based, for the interstate-travel factor. */
export const TEAM_STATES: Record<string, AussieState> = {
  adelaide: "SA",
  brisbane: "QLD",
  carlton: "VIC",
  collingwood: "VIC",
  essendon: "VIC",
  fremantle: "WA",
  geelong: "VIC",
  "gold-coast": "QLD",
  gws: "NSW",
  hawthorn: "VIC",
  melbourne: "VIC",
  "north-melbourne": "VIC",
  "port-adelaide": "SA",
  richmond: "VIC",
  "st-kilda": "VIC",
  sydney: "NSW",
  "west-coast": "WA",
  "western-bulldogs": "VIC",
};

const WEEKDAYS = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

const aliasIndex = new Map<string, VenueInfo>();
for (const v of VENUES) {
  for (const a of v.aliases) aliasIndex.set(a, v);
}

/** Lowercase, strip punctuation ("M.C.G." → "mcg"), collapse whitespace. */
function cleanVenueName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Canonical venue key for a raw venue string from either data source, or null
 * when the value is unknown, empty, or one of the dirty weekday rows.
 */
export function normalizeVenue(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = cleanVenueName(raw);
  if (cleaned.length === 0 || WEEKDAYS.has(cleaned)) return null;
  return aliasIndex.get(cleaned)?.key ?? null;
}

const stateByKey = new Map(VENUES.map((v) => [v.key, v.state]));

/** State a canonical venue key sits in, or null for unmapped venues. */
export function venueState(venueKey: string | null): AussieState | null {
  if (!venueKey) return null;
  return stateByKey.get(venueKey) ?? null;
}
