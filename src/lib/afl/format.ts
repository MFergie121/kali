/** Shared display formatting for rounds and fixture dates. */

/** Compact chip label: 'pre', 'r16', 'QF', 'SF', 'PF', 'GF'. */
export function roundChipLabel(r: number): string {
	if (r === 0) return 'pre';
	if (r === 25) return 'QF';
	if (r === 26) return 'SF';
	if (r === 27) return 'PF';
	if (r === 28) return 'GF';
	return `r${r}`;
}

/** Short label: 'Pre', 'R16', 'QF', 'SF', 'PF', 'GF'. */
export function roundShortLabel(r: number): string {
	if (r === 0) return 'Pre';
	if (r === 25) return 'QF';
	if (r === 26) return 'SF';
	if (r === 27) return 'PF';
	if (r === 28) return 'GF';
	return `R${r}`;
}

/** Long label: 'pre-season', 'round 16', 'finals wk 1', … */
export function roundLongLabel(r: number): string {
	if (r === 0) return 'pre-season';
	if (r === 25) return 'finals wk 1';
	if (r === 26) return 'semi finals';
	if (r === 27) return 'prelim finals';
	if (r === 28) return 'grand final';
	return `round ${r}`;
}

/** Squiggle fixture timestamps are AEST; render in en-AU Sydney time. */
export function formatFixtureDate(dateStr: string | null): string {
	if (!dateStr) return 'TBC';
	const d = new Date(dateStr.replace(' ', 'T') + '+10:00');
	if (isNaN(d.getTime())) return dateStr;
	return new Intl.DateTimeFormat('en-AU', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
		timeZone: 'Australia/Sydney',
	}).format(d);
}
