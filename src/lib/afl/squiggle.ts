const SQUIGGLE_BASE = 'https://api.squiggle.com.au';
const HEADERS = { 'User-Agent': 'kali-afl/1.0' };

export interface SquiggleGame {
	id: number;
	round: number;
	roundname: string;
	year: number;
	date: string | null; // "2026-03-15 19:25:00" AEST/AEDT, null if TBC
	hteam: string | null; // null for unconfirmed finals
	ateam: string | null; // null for unconfirmed finals
	hteamid: number | null; // null for unconfirmed finals
	ateamid: number | null; // null for unconfirmed finals
	venue: string | null;
	hscore: number | null;
	ascore: number | null;
	complete: number; // 0–100
	winner: string | null;
}

export interface SquiggleTip {
	hteam: string;
	ateam: string;
	hconfidence: number;
	source: string;
	gameid: number;
}

export async function fetchSeasonFixture(year: number): Promise<SquiggleGame[]> {
	const res = await fetch(`${SQUIGGLE_BASE}/?q=games;year=${year}`, { headers: HEADERS });
	if (!res.ok) throw new Error(`Squiggle API error: ${res.status}`);
	const data = (await res.json()) as { games: SquiggleGame[] };
	return data.games ?? [];
}

export async function fetchTips(year: number, round: number): Promise<SquiggleTip[]> {
	const res = await fetch(`${SQUIGGLE_BASE}/?q=tips;year=${year};round=${round}`, {
		headers: HEADERS,
	});
	if (!res.ok) return [];
	const data = (await res.json()) as { tips: SquiggleTip[] };
	return data.tips ?? [];
}

/** Minimal shape needed by getUpcomingGames / getUpcomingRound — works with both SquiggleGame and DB fixture rows. */
interface GameLike {
	round: number;
	date: string | null;
	complete: number;
}

export function getUpcomingGames<T extends GameLike>(games: T[]): T[] {
	return games
		.filter((g) => g.complete < 100)
		.sort((a, b) => {
			if (!a.date) return 1;
			if (!b.date) return -1;
			return a.date.localeCompare(b.date);
		});
}

/** Returns the lowest round number that has at least one game not yet started. */
export function getUpcomingRound(games: GameLike[]): number | null {
	const now = new Date();
	const upcoming = games.filter((g) => {
		if (g.complete >= 100) return false;
		if (!g.date) return true;
		const gameDate = new Date(g.date.replace(' ', 'T') + '+10:00');
		return gameDate > now;
	});
	if (upcoming.length === 0) return null;
	return Math.min(...upcoming.map((g) => g.round));
}
