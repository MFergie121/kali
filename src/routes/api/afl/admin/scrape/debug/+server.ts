import { scrapeMatchStats } from '$lib/afl/scraper';
import { requireAdmin } from '$lib/server/admin';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	await requireAdmin(event.locals);

	const body = await event.request.json();
	const mid = parseInt(body.mid, 10);

	if (isNaN(mid) || mid <= 0) {
		return json({ error: 'Invalid match ID.' }, { status: 400 });
	}

	console.log(`[afl-scraper] debug scrape mid=${mid}`);
	const result = await scrapeMatchStats(mid);

	return json({
		_debug: result._debug,
		match: result.match,
		homeStatsCount: result.homeStats.length,
		awayStatsCount: result.awayStats.length,
		homeStatsSample: result.homeStats.slice(0, 3),
		awayStatsSample: result.awayStats.slice(0, 3),
	});
};
