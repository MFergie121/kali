import { db } from '$lib/db/afl';
import { matches, players, playerStats, teams } from '$lib/db/afl/schema';
import { getAllTeams } from '$lib/db/afl/service';
import type { Team } from '$lib/db/afl/schema';
import { and, desc, eq, inArray, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const FIRST_YEAR = 2024;

export interface TeamGameRow {
	matchId: number;
	round: number;
	year: number;
	date: string;
	venue: string;
	isHome: boolean;
	opponentId: string;
	opponentName: string;
	opponentShort: string;
	teamScore: number | null;
	oppScore: number | null;
	margin: number | null;
	result: 'W' | 'L' | 'D' | null;
	crowd: number | null;
}

export interface StatTotals {
	kicks: number; handballs: number; disposals: number; marks: number;
	goals: number; behinds: number; tackles: number; hitouts: number;
	inside50s: number; clearances: number; clangers: number; rebound50s: number;
	freesFor: number; freesAgainst: number;
}

export interface GameDetail {
	matchId: number;
	teamTotals: StatTotals;
	oppTotals: StatTotals;
	topDisposals: { name: string; val: number }[];
	topGoals: { name: string; val: number }[];
	topTackles: { name: string; val: number }[];
}

export interface TeamSummary {
	wins: number; losses: number; draws: number; played: number;
	avgFor: number; avgAgainst: number; avgMargin: number;
	pct: number;
	form: ('W' | 'L' | 'D')[];
	ladderPos: number;
}

type RawMatch = {
	id: number; round: number; year: number; date: string; venue: string;
	homeTeamId: string; awayTeamId: string;
	homeScore: number | null; awayScore: number | null; crowd: number | null;
};

function makeTeamGames(rows: RawMatch[], teamId: string, teamMap: Map<string, Team>): TeamGameRow[] {
	return rows.map(r => {
		const isHome = r.homeTeamId === teamId;
		const teamScore = isHome ? r.homeScore : r.awayScore;
		const oppScore  = isHome ? r.awayScore : r.homeScore;
		const oppId     = isHome ? r.awayTeamId : r.homeTeamId;
		const margin    = teamScore != null && oppScore != null ? teamScore - oppScore : null;
		const result    = margin == null ? null : margin > 0 ? 'W' : margin < 0 ? 'L' : 'D';
		return {
			matchId: r.id, round: r.round, year: r.year, date: r.date, venue: r.venue,
			isHome, opponentId: oppId,
			opponentName:  teamMap.get(oppId)?.name      ?? oppId,
			opponentShort: teamMap.get(oppId)?.shortName ?? oppId,
			teamScore, oppScore, margin, result, crowd: r.crowd,
		};
	});
}

function buildSummary(games: TeamGameRow[], ladderPos: number): TeamSummary {
	const fin  = games.filter(g => g.result != null);
	const wins = fin.filter(g => g.result === 'W').length;
	const losses = fin.filter(g => g.result === 'L').length;
	const draws  = fin.filter(g => g.result === 'D').length;
	const played = fin.length;
	const totalFor     = fin.reduce((s, g) => s + (g.teamScore ?? 0), 0);
	const totalAgainst = fin.reduce((s, g) => s + (g.oppScore  ?? 0), 0);
	return {
		wins, losses, draws, played,
		avgFor:     played > 0 ? totalFor     / played : 0,
		avgAgainst: played > 0 ? totalAgainst / played : 0,
		avgMargin:  played > 0 ? fin.reduce((s, g) => s + (g.margin ?? 0), 0) / played : 0,
		pct: totalAgainst > 0 ? (totalFor / totalAgainst) * 100 : 0,
		form: fin.slice(0, 5).map(g => g.result as 'W' | 'L' | 'D'),
		ladderPos,
	};
}

export const load: PageServerLoad = async ({ url }) => {
	const currentYear = new Date().getFullYear();
	const allYears    = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
	const allTeams    = await getAllTeams();
	const teamMap     = new Map(allTeams.map(t => [t.id, t]));

	if (allTeams.length === 0) {
		return {
			allTeams, allYears, selectedTeamId: '', selectedYear: currentYear, compareTeamId: null,
			teamGames: [], teamSummary: null, gameDetails: {}, compareGames: [], compareSummary: null, h2hGames: [],
		};
	}

	const selectedTeamId = url.searchParams.get('team') ?? allTeams[0].id;
	const selectedYear   = parseInt(url.searchParams.get('year') ?? '') || currentYear;
	const compareTeamId  = url.searchParams.get('compare') || null;

	// All matches for the year (for standings + team games)
	const yearMatches = await db.select({
		id: matches.id, round: matches.round, year: matches.year,
		date: matches.date, venue: matches.venue,
		homeTeamId: matches.homeTeamId, awayTeamId: matches.awayTeamId,
		homeScore: matches.homeScore, awayScore: matches.awayScore, crowd: matches.crowd,
	}).from(matches).where(eq(matches.year, selectedYear)).orderBy(desc(matches.round));

	// Compute standings
	const pts = new Map<string, { wins: number; for: number; against: number }>();
	for (const m of yearMatches) {
		if (m.homeScore == null || m.awayScore == null) continue;
		for (const [tid, scored, conceded] of [
			[m.homeTeamId, m.homeScore, m.awayScore],
			[m.awayTeamId, m.awayScore, m.homeScore],
		] as [string, number, number][]) {
			const s = pts.get(tid) ?? { wins: 0, for: 0, against: 0 };
			if (scored > conceded) s.wins++;
			s.for += scored; s.against += conceded;
			pts.set(tid, s);
		}
	}
	const ladder = [...pts.entries()].sort(([, a], [, b]) => {
		if (b.wins !== a.wins) return b.wins - a.wins;
		const pA = a.against > 0 ? a.for / a.against : 0;
		const pB = b.against > 0 ? b.for / b.against : 0;
		return pB - pA;
	});
	const ladderPos = (id: string) => { const i = ladder.findIndex(([t]) => t === id); return i >= 0 ? i + 1 : 99; };

	// Team games
	const teamMatchRows = yearMatches.filter(r => r.homeTeamId === selectedTeamId || r.awayTeamId === selectedTeamId);
	const teamGames     = makeTeamGames(teamMatchRows, selectedTeamId, teamMap);
	const teamSummary   = buildSummary(teamGames, ladderPos(selectedTeamId));

	// Game details — one query for all matches
	const matchIds = teamGames.map(g => g.matchId);
	const gameDetails: Record<number, GameDetail> = {};

	if (matchIds.length > 0) {
		const statsRows = await db.select({
			matchId: playerStats.matchId, playerName: players.name, teamId: players.currentTeamId,
			kicks: playerStats.kicks, handballs: playerStats.handballs, disposals: playerStats.disposals,
			marks: playerStats.marks, goals: playerStats.goals, behinds: playerStats.behinds,
			tackles: playerStats.tackles, hitouts: playerStats.hitouts, inside50s: playerStats.inside50s,
			clearances: playerStats.clearances, clangers: playerStats.clangers,
			rebound50s: playerStats.rebound50s, freesFor: playerStats.freesFor, freesAgainst: playerStats.freesAgainst,
		}).from(playerStats).innerJoin(players, eq(playerStats.playerId, players.id))
		  .where(inArray(playerStats.matchId, matchIds));

		const byMatch = new Map<number, typeof statsRows>();
		for (const r of statsRows) {
			if (!byMatch.has(r.matchId)) byMatch.set(r.matchId, []);
			byMatch.get(r.matchId)!.push(r);
		}

		const sum = (rows: typeof statsRows): StatTotals => ({
			kicks:       rows.reduce((s, r) => s + r.kicks, 0),
			handballs:   rows.reduce((s, r) => s + r.handballs, 0),
			disposals:   rows.reduce((s, r) => s + r.disposals, 0),
			marks:       rows.reduce((s, r) => s + r.marks, 0),
			goals:       rows.reduce((s, r) => s + r.goals, 0),
			behinds:     rows.reduce((s, r) => s + r.behinds, 0),
			tackles:     rows.reduce((s, r) => s + r.tackles, 0),
			hitouts:     rows.reduce((s, r) => s + r.hitouts, 0),
			inside50s:   rows.reduce((s, r) => s + r.inside50s, 0),
			clearances:  rows.reduce((s, r) => s + r.clearances, 0),
			clangers:    rows.reduce((s, r) => s + r.clangers, 0),
			rebound50s:  rows.reduce((s, r) => s + r.rebound50s, 0),
			freesFor:    rows.reduce((s, r) => s + r.freesFor, 0),
			freesAgainst:rows.reduce((s, r) => s + r.freesAgainst, 0),
		});
		const top5 = (key: string, rows: typeof statsRows) =>
			[...rows].sort((a, b) => ((b as any)[key] ?? 0) - ((a as any)[key] ?? 0))
			         .slice(0, 5).map(r => ({ name: r.playerName, val: (r as any)[key] ?? 0 }))
			         .filter(r => r.val > 0);

		for (const game of teamGames) {
			const all  = byMatch.get(game.matchId) ?? [];
			const mine = all.filter(r => r.teamId === selectedTeamId);
			const opp  = all.filter(r => r.teamId === game.opponentId);
			gameDetails[game.matchId] = {
				matchId: game.matchId,
				teamTotals: sum(mine), oppTotals: sum(opp),
				topDisposals: top5('disposals', mine),
				topGoals:     top5('goals', mine),
				topTackles:   top5('tackles', mine),
			};
		}
	}

	// Compare team
	let compareGames: TeamGameRow[]   = [];
	let compareSummary: TeamSummary | null = null;
	let h2hGames: TeamGameRow[]       = [];

	if (compareTeamId && compareTeamId !== selectedTeamId) {
		const cmpRows = yearMatches.filter(r => r.homeTeamId === compareTeamId || r.awayTeamId === compareTeamId);
		compareGames   = makeTeamGames(cmpRows, compareTeamId, teamMap);
		compareSummary = buildSummary(compareGames, ladderPos(compareTeamId));

		const h2hRows = await db.select({
			id: matches.id, round: matches.round, year: matches.year,
			date: matches.date, venue: matches.venue,
			homeTeamId: matches.homeTeamId, awayTeamId: matches.awayTeamId,
			homeScore: matches.homeScore, awayScore: matches.awayScore, crowd: matches.crowd,
		}).from(matches).where(or(
			and(eq(matches.homeTeamId, selectedTeamId), eq(matches.awayTeamId, compareTeamId)),
			and(eq(matches.homeTeamId, compareTeamId), eq(matches.awayTeamId, selectedTeamId)),
		)).orderBy(desc(matches.year), desc(matches.round));

		h2hGames = makeTeamGames(h2hRows, selectedTeamId, teamMap);
	}

	return {
		allTeams, allYears, selectedTeamId, selectedYear, compareTeamId,
		teamGames, teamSummary, gameDetails, compareGames, compareSummary, h2hGames,
	};
};
