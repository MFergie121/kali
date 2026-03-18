<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type PerformerTab = 'disposals' | 'goals' | 'fantasy';
	let activeTab = $state<PerformerTab>('disposals');

	const ROUNDS_PER_SEASON = 24;

	const navItems = $derived([
		{
			href: '/home/kali-afl-scraper/matches',
			label: 'matches & stats',
			description: 'Browse scraped matches and player performance by round',
			badge: `${data.snapshot.totalMatches.toLocaleString()} matches`
		},
		{
			href: '/home/kali-afl-scraper/players',
			label: 'players & stats',
			description: 'Player stat matrix across all rounds for any season',
			badge: `${data.snapshot.totalPlayers.toLocaleString()} players`
		},
		{
			href: '/home/kali-afl-scraper/section-2',
			label: 'teams & stats',
			description: 'Season-level breakdowns by team',
			badge: 'season breakdowns'
		},
		{
			href: '/home/kali-afl-scraper/api-docs',
			label: 'api docs',
			description: 'REST API reference and endpoint guide',
			badge: 'REST API reference'
		},
		{
			href: '/home/kali-afl-scraper/api-usage',
			label: 'api usage',
			description: 'Manage API keys and monitor usage',
			badge: 'key management'
		}
	]);

	const snapshotTiles = $derived([
		{ label: 'matches', value: data.snapshot.totalMatches.toLocaleString() },
		{ label: 'players', value: data.snapshot.totalPlayers.toLocaleString() },
		{ label: 'stat records', value: data.snapshot.totalStatRecords.toLocaleString() },
		{ label: 'seasons', value: String(data.snapshot.yearsCount) }
	]);

	function roundLabelFull(r: number): string {
		return r === 0 ? 'Pre-Season' : `Round ${r}`;
	}

	const activePerformers = $derived(
		activeTab === 'disposals'
			? data.topPerformers.disposals
			: activeTab === 'goals'
				? data.topPerformers.goals
				: data.topPerformers.fantasy
	);

	function usagePct(usage: number, limit: number | null): number {
		if (!limit) return 0;
		return Math.min(100, Math.round((usage / limit) * 100));
	}
</script>

<div class="page">

	<!-- ── Toolbar ── -->
	<div class="toolbar" style="animation-delay: 0ms">
		<div class="toolbar-left">
			<h1 class="page-title">dashboard</h1>
			<span class="page-sub">afl stats hub</span>
		</div>
	</div>

	<!-- ── Snapshot Tiles ── -->
	<div class="snapshot-grid">
		{#each snapshotTiles as tile, i (tile.label)}
			<div class="snapshot-tile card" style="animation-delay: {60 + i * 40}ms">
				<span class="snapshot-value">{tile.value}</span>
				<span class="snapshot-label">{tile.label}</span>
			</div>
		{/each}
	</div>

	<!-- ── Mid Row: Latest Round + Top Performers ── -->
	<div class="mid-grid">

		<!-- Latest Round Summary -->
		{#if data.latestRound}
			<div class="card latest-card" style="animation-delay: 220ms">
				<div class="card-header">
					<div class="card-header-left">
						<span class="section-label">{roundLabelFull(data.latestRound.round)}, {data.latestRound.year}</span>
						<span class="chip">{data.latestRound.matches.length} match{data.latestRound.matches.length === 1 ? '' : 'es'}</span>
					</div>
					<a
						href="/home/kali-afl-scraper/matches?year={data.latestRound.year}&round={data.latestRound.round}"
						class="view-link"
					>view all →</a>
				</div>
				<div class="match-list">
					{#each data.latestRound.matches as match (match.id)}
						{@const homeWon = (match.homeScore ?? 0) > (match.awayScore ?? 0)}
						{@const awayWon = (match.awayScore ?? 0) > (match.homeScore ?? 0)}
						<div class="match-row">
							<span class="match-team" class:team-winner={homeWon} class:team-loser={awayWon && !homeWon}>
								{match.homeShortName}
							</span>
							<span class="match-score">
								{match.homeScore ?? '–'}<span class="score-sep">–</span>{match.awayScore ?? '–'}
							</span>
							<span class="match-team team-right" class:team-winner={awayWon} class:team-loser={homeWon && !awayWon}>
								{match.awayShortName}
							</span>
							<span class="match-venue">{match.venue}</span>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="card latest-card empty-card" style="animation-delay: 220ms">
				<p class="empty-text">no rounds scraped yet</p>
			</div>
		{/if}

		<!-- Top Performers -->
		<div class="card performers-card" style="animation-delay: 260ms">
			<div class="card-header">
				<span class="section-label">top performers</span>
				<span class="performers-season">season totals — {data.topPerformers.currentYear}</span>
			</div>

			<div class="tab-row">
				{#each (['disposals', 'goals', 'fantasy'] as PerformerTab[]) as tab (tab)}
					<button
						class="tab-btn"
						class:tab-active={activeTab === tab}
						onclick={() => (activeTab = tab)}
					>
						{tab === 'fantasy' ? 'fantasy' : tab}
					</button>
				{/each}
			</div>

			<div class="performers-list">
				{#if activePerformers.length === 0}
					<p class="empty-text">no data for {data.topPerformers.currentYear}</p>
				{:else}
					{#each activePerformers as player, i (player.playerName + player.teamId)}
						<div class="performer-row">
							<span class="performer-rank">{i + 1}</span>
							<div class="performer-info">
								<span class="performer-name">{player.playerName}</span>
								<span class="performer-team">{player.teamId}</span>
							</div>
							<span class="performer-total">{player.total.toLocaleString()}</span>
						</div>
					{/each}
				{/if}
			</div>
		</div>

	</div>

	<!-- ── Season Coverage Grid ── -->
	{#if data.seasonGrid.length > 0}
		<div class="card coverage-card" style="animation-delay: 300ms">
			<div class="card-header">
				<span class="section-label">season coverage</span>
			</div>
			<div class="coverage-list">
				{#each data.seasonGrid as season (season.year)}
					{@const hasPreSeason = season.rounds.includes(0)}
					{@const regularRounds = Array.from({ length: ROUNDS_PER_SEASON }, (_, i) => i + 1)}
					{@const scraped = new Set(season.rounds)}
					{@const scrapedRegular = regularRounds.filter((r) => scraped.has(r)).length}

					<div class="coverage-row">
						<div class="coverage-meta">
							<span class="coverage-year">{season.year}</span>
							<span class="chip">{scrapedRegular} / {ROUNDS_PER_SEASON}</span>
						</div>
						<div class="round-grid">
							{#if hasPreSeason}
								<div class="round-dot round-scraped" title="Pre-Season">
									<span class="round-dot-label">P</span>
								</div>
							{/if}
							{#each regularRounds as r (r)}
								<div
									class="round-dot"
									class:round-scraped={scraped.has(r)}
									class:round-empty={!scraped.has(r)}
									title="Round {r}"
								>
									<span class="round-dot-label">{r}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Navigation Cards ── -->
	<div class="nav-grid">
		{#each navItems as item, i (item.href)}
			<a href={item.href} class="nav-card card" style="animation-delay: {340 + i * 40}ms">
				<div class="nav-card-top">
					<span class="nav-card-label">{item.label}</span>
					<span class="nav-arrow">→</span>
				</div>
				<p class="nav-card-desc">{item.description}</p>
				<span class="chip nav-chip">{item.badge}</span>
			</a>
		{/each}
	</div>

	<!-- ── API Usage Snapshot ── -->
	{#if data.apiSnapshot}
		{@const pct = usagePct(data.apiSnapshot.apiUsage, data.apiSnapshot.apiLimit)}
		<div class="api-row" style="animation-delay: 540ms">
			<div class="card api-card">
				<div class="card-header">
					<span class="section-label">api usage</span>
					<a href="/home/kali-afl-scraper/api-usage" class="view-link">manage →</a>
				</div>
				<div class="api-body">
					<div class="api-stat-row">
						<span class="api-usage-text">
							{data.apiSnapshot.apiUsage.toLocaleString()}
							{#if data.apiSnapshot.apiLimit !== null}
								/ {data.apiSnapshot.apiLimit.toLocaleString()} calls
							{:else}
								calls · unlimited
							{/if}
						</span>
						{#if data.apiSnapshot.apiLimit !== null}
							<span class="api-pct" class:api-pct-critical={pct >= 90}>{pct}%</span>
						{/if}
					</div>
					{#if data.apiSnapshot.apiLimit !== null}
						<div class="api-bar-track">
							<div
								class="api-bar-fill"
								class:api-bar-critical={pct >= 90}
								style="width: {pct}%"
							></div>
						</div>
					{/if}
					<p class="api-keys-info">
						{data.apiSnapshot.activeKeys} active key{data.apiSnapshot.activeKeys === 1 ? '' : 's'} of {data.apiSnapshot.totalKeys} total
					</p>
				</div>
			</div>
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

	@keyframes rise {
		from { opacity: 0; transform: translateY(8px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── Card base ── */
	.card {
		background-color: var(--card);
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		overflow: hidden;
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	/* ── Toolbar ── */
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
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
		margin: 0;
	}

	.page-sub {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		letter-spacing: 0.03em;
	}

	/* ── Shared ── */
	.section-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	.chip {
		background-color: var(--secondary);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 0.1rem 0.45rem;
		font-size: 0.6875rem;
		letter-spacing: 0.02em;
		color: var(--muted-foreground);
		white-space: nowrap;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.875rem 1.25rem;
		border-bottom: 1px solid var(--border);
	}

	.card-header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.view-link {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		text-decoration: none;
		transition: color 0.12s ease;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.view-link:hover {
		color: var(--primary);
	}

	.empty-text {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		padding: 2.5rem 1.25rem;
		text-align: center;
		margin: 0;
	}

	/* ── Snapshot tiles ── */
	.snapshot-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}

	@media (max-width: 640px) {
		.snapshot-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.snapshot-tile {
		padding: 1.375rem 1.5rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.snapshot-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--foreground);
		letter-spacing: -0.03em;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.snapshot-label {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-weight: 500;
	}

	/* ── Mid grid ── */
	.mid-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	@media (max-width: 768px) {
		.mid-grid {
			grid-template-columns: 1fr;
		}
	}

	/* ── Latest round ── */
	.latest-card,
	.performers-card {
		display: flex;
		flex-direction: column;
	}

	.match-list {
		display: flex;
		flex-direction: column;
	}

	.match-row {
		display: grid;
		grid-template-columns: 1fr auto 1fr auto;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1.25rem;
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 50%);
		transition: background-color 0.1s ease;
	}

	.match-row:last-child {
		border-bottom: none;
	}

	.match-row:hover {
		background-color: var(--secondary);
	}

	.match-team {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--muted-foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.team-right {
		text-align: right;
	}

	.team-winner {
		color: var(--foreground);
		font-weight: 600;
	}

	.team-loser {
		opacity: 0.55;
	}

	.match-score {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--foreground);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.01em;
		text-align: center;
		min-width: 4rem;
	}

	.score-sep {
		color: var(--muted-foreground);
		font-weight: 400;
		margin: 0 0.125rem;
	}

	.match-venue {
		font-size: 0.625rem;
		color: var(--muted-foreground);
		letter-spacing: 0.02em;
		text-align: right;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 7rem;
	}

	/* ── Top Performers ── */
	.performers-season {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		letter-spacing: 0.02em;
	}

	.tab-row {
		display: flex;
		border-bottom: 1px solid var(--border);
	}

	.tab-btn {
		flex: 1;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		font-family: inherit;
		color: var(--muted-foreground);
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.12s ease, background-color 0.12s ease;
		letter-spacing: 0.02em;
	}

	.tab-btn:hover {
		color: var(--foreground);
		background-color: var(--secondary);
	}

	.tab-active {
		color: var(--foreground);
		background-color: color-mix(in oklch, var(--primary), transparent 88%);
		border-bottom: 2px solid var(--primary);
	}

	.performers-list {
		display: flex;
		flex-direction: column;
		padding: 0.375rem 0;
	}

	.performer-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5625rem 1.25rem;
		transition: background-color 0.1s ease;
	}

	.performer-row:hover {
		background-color: var(--secondary);
	}

	.performer-rank {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
		width: 1rem;
		text-align: center;
		flex-shrink: 0;
	}

	.performer-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
	}

	.performer-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.performer-team {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.performer-total {
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
		flex-shrink: 0;
	}

	/* ── Season Coverage ── */
	.coverage-card {
		display: flex;
		flex-direction: column;
	}

	.coverage-list {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.coverage-row {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 0.875rem 1.25rem;
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 50%);
	}

	.coverage-row:last-child {
		border-bottom: none;
	}

	.coverage-meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		width: 4.5rem;
		flex-shrink: 0;
	}

	.coverage-year {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--foreground);
		letter-spacing: -0.02em;
	}

	.round-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		flex: 1;
	}

	.round-dot {
		width: 1.375rem;
		height: 1.375rem;
		border-radius: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.1s ease;
	}

	.round-dot-label {
		font-size: 0.5rem;
		font-weight: 600;
		letter-spacing: 0;
		line-height: 1;
	}

	.round-scraped {
		background-color: var(--primary);
	}

	.round-scraped .round-dot-label {
		color: color-mix(in oklch, var(--foreground), transparent 20%);
		opacity: 0.8;
	}

	.round-empty {
		background-color: color-mix(in oklch, var(--muted), transparent 40%);
		border: 1px solid var(--border);
	}

	.round-empty .round-dot-label {
		color: var(--muted-foreground);
		opacity: 0.5;
	}

	/* ── Navigation Cards ── */
	.nav-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	@media (max-width: 768px) {
		.nav-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.nav-grid {
			grid-template-columns: 1fr;
		}
	}

	.nav-card {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 1.125rem 1.25rem 1rem;
		text-decoration: none;
		transition: background-color 0.15s ease, border-color 0.15s ease;
		cursor: pointer;
	}

	.nav-card:hover {
		background-color: var(--secondary);
		border-color: color-mix(in oklch, var(--border), var(--primary) 20%);
	}

	.nav-card:hover .nav-arrow {
		transform: translateX(3px);
		color: var(--primary);
	}

	.nav-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.nav-card-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--foreground);
	}

	.nav-arrow {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		transition: transform 0.15s ease, color 0.15s ease;
		flex-shrink: 0;
	}

	.nav-card-desc {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		line-height: 1.45;
		margin: 0;
	}

	.nav-chip {
		margin-top: 0.25rem;
		align-self: flex-start;
	}

	/* ── API Snapshot ── */
	.api-row {
		display: flex;
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.api-card {
		width: 100%;
		max-width: 32rem;
	}

	.api-body {
		padding: 0.875rem 1.25rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.api-stat-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.api-usage-text {
		font-size: 0.8125rem;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
	}

	.api-pct {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--primary);
		font-variant-numeric: tabular-nums;
	}

	.api-pct-critical {
		color: var(--destructive);
	}

	.api-bar-track {
		height: 3px;
		background-color: color-mix(in oklch, var(--muted), transparent 30%);
		border-radius: 9999px;
		overflow: hidden;
	}

	.api-bar-fill {
		height: 100%;
		background-color: var(--primary);
		border-radius: 9999px;
		transition: width 0.4s ease;
	}

	.api-bar-critical {
		background-color: var(--destructive);
	}

	.api-keys-info {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		margin: 0;
		letter-spacing: 0.02em;
	}

	/* ── Empty card ── */
	.empty-card {
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
