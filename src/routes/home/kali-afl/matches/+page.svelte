<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Select from '$lib/components/ui/select';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let expandedMatch = $state<number | null>(null);
	let showAdvanced = $state(false);

	const STAT_COLS = [
		{ key: 'kicks',        label: 'K'   },
		{ key: 'handballs',    label: 'HB'  },
		{ key: 'disposals',    label: 'D'   },
		{ key: 'marks',        label: 'M'   },
		{ key: 'goals',        label: 'G'   },
		{ key: 'behinds',      label: 'B'   },
		{ key: 'tackles',      label: 'T'   },
		{ key: 'hitouts',      label: 'HO'  },
		{ key: 'goalAssists',  label: 'GA'  },
		{ key: 'inside50s',    label: 'I50' },
		{ key: 'clearances',   label: 'CL'  },
		{ key: 'clangers',     label: 'CG'  },
		{ key: 'rebound50s',   label: 'R50' },
		{ key: 'freesFor',     label: 'FF'  },
		{ key: 'freesAgainst', label: 'FA'  },
		{ key: 'aflFantasyPts',label: 'AF'  },
		{ key: 'supercoachPts',label: 'SC'  },
	] as const;

	const ADV_STAT_COLS = [
		{ key: 'contestedPossessions',   label: 'CP'   },
		{ key: 'uncontestedPossessions', label: 'UP'   },
		{ key: 'effectiveDisposals',     label: 'ED'   },
		{ key: 'disposalEfficiencyPct',  label: 'DE%'  },
		{ key: 'contestedMarks',         label: 'CM'   },
		{ key: 'goalAssists',            label: 'GA'   },
		{ key: 'marksInside50',          label: 'MI5'  },
		{ key: 'onePercenters',          label: '1%'   },
		{ key: 'bounces',                label: 'BO'   },
		{ key: 'centreClearances',       label: 'CCL'  },
		{ key: 'stoppageClearances',     label: 'SCL'  },
		{ key: 'scoreInvolvements',      label: 'SI'   },
		{ key: 'metresGained',           label: 'MG'   },
		{ key: 'turnovers',              label: 'TO'   },
		{ key: 'intercepts',             label: 'ITC'  },
		{ key: 'tacklesInside50',        label: 'T5'   },
		{ key: 'timeOnGroundPct',        label: 'TOG%' },
	] as const;

	const activeCols = $derived(showAdvanced ? ADV_STAT_COLS : STAT_COLS);

	function roundLabel(r: number): string {
		return r === 0 ? 'pre-season' : `round ${r}`;
	}

	function teamSlug(name: string): string {
		return name.toLowerCase().replace(/\s+/g, '-');
	}

	function formatFixtureDate(dateStr: string | null): string {
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

	function roundChipClass(r: number): string {
		if (r === data.selectedRound) return 'round-chip round-chip-on';
		if (data.storedRounds.includes(r)) return 'round-chip round-chip-scraped';
		if (data.upcomingByRound[r]?.length) return 'round-chip round-chip-upcoming';
		return 'round-chip';
	}

	// Average hconfidence per gameid across all tipsters
	const tipsByGame = $derived.by(() => {
		const map = new Map<number, number>();
		if (!data.roundTips.length) return map;
		const groups = new Map<number, number[]>();
		for (const tip of data.roundTips) {
			if (!groups.has(tip.gameid)) groups.set(tip.gameid, []);
			groups.get(tip.gameid)!.push(tip.hconfidence);
		}
		for (const [gameid, confs] of groups) {
			map.set(gameid, confs.reduce((a, b) => a + b, 0) / confs.length);
		}
		return map;
	});

	// Show inline fixture when the selected round has upcoming games but no scraped data
	const isUpcomingRound = $derived(
		!data.hasData && !!(data.upcomingByRound[data.selectedRound]?.length)
	);

	const upcomingGames = $derived(data.upcomingByRound[data.selectedRound] ?? []);
</script>

<div class="page">

	<!-- ── Toolbar ── -->
	<div class="toolbar">
		<div class="toolbar-left">
			<h1 class="page-title">matches & stats</h1>
			<span class="page-sub">footywire</span>
		</div>

		<div class="toolbar-right">
			<button
				class="adv-toggle"
				class:adv-toggle-active={showAdvanced}
				onclick={() => (showAdvanced = !showAdvanced)}
				title={showAdvanced ? 'showing advanced stats' : 'showing standard stats'}
			>
				{showAdvanced ? 'adv' : 'std'}
			</button>

			<Select.Root
				type="single"
				value={String(data.selectedYear)}
				onValueChange={(v) => { if (v) goto(`?year=${v}&round=${data.selectedRound}`); }}
			>
				<Select.Trigger class="select-trigger w-24">{data.selectedYear}</Select.Trigger>
				<Select.Content>
					{#each data.allYears as year (year)}
						<Select.Item value={String(year)} label={String(year)}>{year}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<!-- ── Round chip bar ── -->
	<div class="round-chips-panel">
		<div class="round-chips-header">
			<span class="round-chips-label">round</span>
			<div class="round-chips-legend">
				<span class="legend-item">
					<span class="legend-swatch legend-swatch-scraped"></span>scraped
				</span>
				<span class="legend-item">
					<span class="legend-swatch legend-swatch-upcoming"></span>upcoming
				</span>
			</div>
		</div>
		<div class="round-chips-grid">
			{#each data.allRounds as r (r)}
				<button
					class={roundChipClass(r)}
					onclick={() => goto(`?year=${data.selectedYear}&round=${r}`)}
				>{r === 0 ? 'pre' : `r${r}`}</button>
			{/each}
		</div>
	</div>

	<!-- ── Content ── -->
	{#if isUpcomingRound}

		<!-- Upcoming fixture (inline) -->
		<div class="match-list">
			<p class="list-meta">
				upcoming · {roundLabel(data.selectedRound)}, {data.selectedYear}
				<span class="list-count">{upcomingGames.length} game{upcomingGames.length === 1 ? '' : 's'}</span>
				<span class="list-source">squiggle.com.au</span>
			</p>

			{#each upcomingGames as game (game.id)}
				{@const homeConf = tipsByGame.get(game.id)}
				{@const awayConf = homeConf != null ? 100 - homeConf : null}

				<div class="match-card">
					<div class="upcoming-header">
						<div class="team team-home">
							<span class="team-name">{game.hteam}</span>
						</div>
						<div class="score-block">
							<span class="upcoming-vs">vs</span>
							{#if game.venue}<span class="score-venue">{game.venue}</span>{/if}
							<span class="score-venue">{formatFixtureDate(game.date)}</span>
						</div>
						<div class="team team-away">
							<span class="team-name">{game.ateam}</span>
						</div>
					</div>

					{#if homeConf != null && awayConf != null}
						<div class="prob-wrap">
							<span class="prob-pct prob-pct-home">{homeConf.toFixed(0)}%</span>
							<div class="prob-bar">
								<div class="prob-bar-fill" style="width: {homeConf}%"></div>
							</div>
							<span class="prob-pct prob-pct-away">{awayConf.toFixed(0)}%</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>

	{:else if !data.hasData}

		<div class="empty-state">
			<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
				<ellipse cx="12" cy="5" rx="9" ry="3"/>
				<path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
				<path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
			</svg>
			<p class="empty-title">no data for {roundLabel(data.selectedRound)}, {data.selectedYear}</p>
			<p class="empty-sub">this round hasn't been scraped yet</p>
		</div>

	{:else}

		<div class="match-list">
			<p class="list-meta">
				{roundLabel(data.selectedRound)}, {data.selectedYear}
				<span class="list-count">{data.matches.length} match{data.matches.length === 1 ? '' : 'es'}</span>
			</p>

			{#each data.matches as match (match.id)}
				{@const isExpanded = expandedMatch === match.id}
				{@const homeWon = (match.homeScore ?? 0) > (match.awayScore ?? 0)}
				{@const awayWon = (match.awayScore ?? 0) > (match.homeScore ?? 0)}
				{@const homeSlug = teamSlug(match.homeTeam)}
				{@const awaySlug = teamSlug(match.awayTeam)}
				{@const activeStats = showAdvanced ? match.advStats : match.stats}
				{@const homeStats = activeStats.filter((s) => s.teamId === homeSlug)}
				{@const awayStats = activeStats.filter((s) => s.teamId === awaySlug)}

				<div class="match-card">
					<button
						class="match-header"
						onclick={() => (expandedMatch = isExpanded ? null : match.id)}
					>
						<div class="team team-home">
							<span class="team-name" class:team-winner={homeWon} class:team-loser={awayWon}>
								{match.homeShortName}
							</span>
						</div>

						<div class="score-block">
							<span class="score-main">
								{match.homeScore ?? '–'}<span class="score-sep"> – </span>{match.awayScore ?? '–'}
							</span>
							<span class="score-venue">{match.venue}</span>
						</div>

						<div class="team team-away">
							<span class="team-name" class:team-winner={awayWon} class:team-loser={homeWon}>
								{match.awayShortName}
							</span>
						</div>

						<div class="match-meta">
							<span class="match-date">{match.date}</span>
							{#if match.crowd}
								<span class="match-crowd">{match.crowd.toLocaleString()}</span>
							{/if}
							<span class="chevron" class:chevron-open={isExpanded}>▼</span>
						</div>
					</button>

					{#if isExpanded}
						{#each [{ name: match.homeTeam, stats: homeStats }, { name: match.awayTeam, stats: awayStats }] as team (team.name)}
							{#if team.stats.length > 0}
								<div class="stats-panel">
									<p class="stats-team-label">{team.name}</p>
									<div class="stats-scroll">
										<table class="stats-table">
											<thead>
												<tr>
													<th class="col-player">player</th>
													{#each activeCols as col (col.key)}
														<th class="col-stat" title={col.key}>{col.label}</th>
													{/each}
												</tr>
											</thead>
											<tbody>
												{#each team.stats as stat (stat.playerName)}
													<tr>
														<td class="col-player cell-player">{stat.playerName}</td>
														{#each activeCols as col (col.key)}
															<td class="col-stat cell-stat">{(stat as Record<string, unknown>)[col.key] ?? '–'}</td>
														{/each}
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								</div>
							{/if}
						{/each}
					{/if}
				</div>
			{/each}
		</div>

	{/if}

</div>

<style>
	/* ── Layout ── */
	.page {
		max-width: 72rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* ── Toolbar ── */
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.toolbar-left {
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--foreground);
		letter-spacing: -0.02em;
	}

	.page-sub {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		letter-spacing: 0.03em;
	}

	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex-wrap: wrap;
	}

	/* ── Adv toggle ── */
	.adv-toggle {
		font-size: 0.6875rem;
		font-weight: 600;
		font-family: inherit;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0.25rem 0.625rem;
		border-radius: 0.375rem;
		border: 1px solid var(--border);
		background: none;
		color: var(--muted-foreground);
		cursor: pointer;
		transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;
	}

	.adv-toggle:hover {
		background-color: var(--secondary);
		color: var(--foreground);
	}

	.adv-toggle-active {
		background-color: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.adv-toggle-active:hover {
		background-color: color-mix(in oklch, var(--primary), black 10%);
	}

	/* ── Round chip bar ── */
	.round-chips-panel {
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		padding: 0.75rem 0.875rem;
		background-color: color-mix(in oklch, var(--muted), transparent 65%);
	}

	.round-chips-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.625rem;
	}

	.round-chips-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	.round-chips-legend {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.625rem;
		color: var(--muted-foreground);
		letter-spacing: 0.03em;
	}

	.legend-swatch {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 0.15rem;
		flex-shrink: 0;
	}

	.legend-swatch-scraped {
		background-color: var(--foreground);
		opacity: 0.6;
	}

	.legend-swatch-upcoming {
		background-color: var(--primary);
		opacity: 0.7;
	}

	.round-chips-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.round-chip {
		font-size: 0.6875rem;
		font-family: inherit;
		padding: 0.2rem 0.5rem;
		border-radius: 0.3rem;
		border: 1px solid var(--border);
		background: var(--card);
		color: var(--muted-foreground);
		cursor: pointer;
		transition: all 0.1s ease;
		opacity: 0.4;
	}

	.round-chip:hover {
		border-color: var(--foreground);
		color: var(--foreground);
		opacity: 1;
	}

	.round-chip-on {
		background-color: var(--foreground);
		color: var(--background);
		border-color: var(--foreground);
		font-weight: 600;
		opacity: 1;
	}

	.round-chip-on:hover {
		opacity: 0.85;
	}

	.round-chip-scraped {
		border-color: color-mix(in oklch, var(--primary), transparent 50%);
		color: var(--foreground);
		opacity: 1;
	}

	.round-chip-upcoming {
		border-color: var(--primary);
		color: var(--primary);
		background: color-mix(in oklch, var(--primary), transparent 90%);
		opacity: 1;
	}

	/* ── Empty state ── */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		padding: 5rem 2rem;
		border: 1px dashed var(--border);
		border-radius: 0.75rem;
		text-align: center;
	}

	.empty-icon {
		color: var(--muted-foreground);
		opacity: 0.4;
		margin-bottom: 0.25rem;
	}

	.empty-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--foreground);
	}

	.empty-sub {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		margin-bottom: 0.5rem;
	}

	/* ── Match list ── */
	.list-meta {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	.list-count {
		background-color: var(--secondary);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 0.1rem 0.45rem;
		font-size: 0.6875rem;
		letter-spacing: 0.02em;
	}

	.list-source {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		opacity: 0.6;
		text-transform: none;
		font-weight: 400;
		letter-spacing: 0;
	}

	.match-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* ── Match card ── */
	.match-card {
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		background-color: var(--card);
		overflow: hidden;
	}

	.match-header {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto 1fr auto;
		align-items: center;
		gap: 1rem;
		padding: 0.875rem 1.25rem;
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		transition: background-color 0.12s ease;
	}

	.match-header:hover {
		background-color: var(--secondary);
	}

	.team {
		display: flex;
	}

	.team-home { justify-content: flex-end; }
	.team-away { justify-content: flex-start; }

	.team-name {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--muted-foreground);
		transition: color 0.12s ease;
	}

	.team-winner { color: var(--foreground); }

	.team-loser {
		color: var(--muted-foreground);
		opacity: 0.65;
	}

	.score-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
		min-width: 7rem;
	}

	.score-main {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--foreground);
		letter-spacing: -0.02em;
		white-space: nowrap;
	}

	.score-sep {
		color: var(--muted-foreground);
		font-weight: 400;
	}

	.score-venue {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		letter-spacing: 0.02em;
		text-align: center;
	}

	.match-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.125rem;
	}

	.match-date,
	.match-crowd {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		white-space: nowrap;
	}

	.chevron {
		font-size: 0.625rem;
		color: var(--muted-foreground);
		opacity: 0.5;
		transition: transform 0.2s ease;
		margin-top: 0.25rem;
	}

	.chevron-open {
		transform: rotate(180deg);
	}

	/* ── Stats panel ── */
	.stats-panel {
		border-top: 1px solid var(--border);
	}

	.stats-team-label {
		padding: 0.5rem 1.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
		background-color: color-mix(in oklch, var(--muted), transparent 60%);
	}

	.stats-scroll {
		overflow-x: auto;
	}

	.stats-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.col-player {
		text-align: left;
		padding: 0.375rem 1.25rem 0.375rem 1.25rem;
		white-space: nowrap;
		position: sticky;
		left: 0;
		background-color: var(--card);
		z-index: 1;
	}

	.col-stat {
		text-align: center;
		padding: 0.375rem 0.5rem;
		white-space: nowrap;
		min-width: 2rem;
	}

	thead tr {
		border-bottom: 1px solid var(--border);
	}

	thead .col-player,
	thead .col-stat {
		font-weight: 600;
		color: var(--muted-foreground);
		background-color: color-mix(in oklch, var(--muted), transparent 75%);
	}

	.cell-player {
		font-weight: 500;
		color: var(--card-foreground);
	}

	.cell-stat {
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}

	tbody tr {
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 50%);
		transition: background-color 0.1s ease;
	}

	tbody tr:last-child {
		border-bottom: none;
	}

	tbody tr:hover .col-player,
	tbody tr:hover .col-stat {
		background-color: color-mix(in oklch, var(--accent), transparent 85%);
	}

	/* ── Upcoming fixture cards ── */
	.upcoming-header {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 1rem;
		padding: 0.875rem 1.25rem;
	}

	.upcoming-vs {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--muted-foreground);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* ── Win probability bar ── */
	.prob-wrap {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 1.25rem 0.75rem;
		border-top: 1px solid color-mix(in oklch, var(--border), transparent 50%);
	}

	.prob-pct {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--muted-foreground);
		white-space: nowrap;
		min-width: 2.25rem;
		font-variant-numeric: tabular-nums;
	}

	.prob-pct-home { text-align: right; }
	.prob-pct-away { text-align: left; }

	.prob-bar {
		flex: 1;
		height: 0.25rem;
		border-radius: 9999px;
		background-color: color-mix(in oklch, var(--muted), transparent 30%);
		overflow: hidden;
	}

	.prob-bar-fill {
		height: 100%;
		background-color: var(--primary);
		border-radius: 9999px;
		transition: width 0.4s ease;
	}
</style>
