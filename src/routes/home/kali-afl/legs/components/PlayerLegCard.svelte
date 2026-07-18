<script lang="ts">
	import type { FixtureContext, PlayerCard } from '$lib/afl/legs.server';
	import { STAT_KEYS, STAT_LABELS, type SampledGame } from '$lib/afl/legs-engine';

	let { card, fixture }: { card: PlayerCard; fixture: FixtureContext } = $props();

	let showGames = $state(false);

	const winSourceLabel: Record<PlayerCard['winSource'], string> = {
		tipster: 'tipster consensus',
		model: 'kali model',
		neutral: 'no win read'
	};

	const reasonLabel: Record<string, string> = {
		'few-recent': 'few recent games',
		'no-h2h': 'no head-to-head history'
	};

	const winPct = $derived(Math.round(card.teamWinProb * 100));
	const opponentShort = $derived(card.isHome ? fixture.awayShortName : fixture.homeShortName);
	const fixtureDate = $derived(fixture.date ? fixture.date.slice(0, 10) : null);
</script>

{#snippet gamesTable(title: string, games: SampledGame[])}
	<div class="games-block">
		<div class="games-title">{title}</div>
		{#if games.length === 0}
			<p class="games-empty">No games sampled.</p>
		{:else}
			<div class="table-scroll">
				<table class="games">
					<thead>
						<tr>
							<th class="lcell">Game</th>
							{#each STAT_KEYS as stat (stat)}
								<th>{STAT_LABELS[stat]}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each games as g (g.matchId)}
							<tr>
								<td class="lcell">
									R{g.round} {g.year}
									<span class="opp">{g.isHome ? 'vs' : '@'} {g.opponentShortName ?? '—'}</span>
								</td>
								{#each STAT_KEYS as stat (stat)}
									<td>{g[stat]}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/snippet}

<div class="card">
	<div class="card-head">
		<div class="head-left">
			<h2 class="player-name">{card.playerName}</h2>
			<div class="fixture-line">
				<span class="team">{card.teamShortName}</span>
				<span class="vs">{card.isHome ? 'vs' : '@'}</span>
				<span class="opp">{opponentShort}</span>
				<span class="dot">·</span>
				<span>R{fixture.round}</span>
				{#if fixtureDate}<span class="dot">·</span><span>{fixtureDate}</span>{/if}
				{#if fixture.venue}<span class="dot">·</span><span>{fixture.venue}</span>{/if}
			</div>
		</div>
		<div class="win-badge" title="Win probability driving the stat adjustment">
			<span class="win-pct">{winPct}%</span>
			<span class="win-src">win · {winSourceLabel[card.winSource]}</span>
		</div>
	</div>

	{#if card.lowSample}
		<div class="thin-banner">
			<span class="thin-tag">thin data</span>
			<span>{card.lowSampleReasons.map((r) => reasonLabel[r] ?? r).join(' · ')} — treat with caution</span>
		</div>
	{/if}

	<div class="stat-grid">
		{#each card.stats as cell (cell.stat)}
			<div class="stat-cell">
				<div class="stat-label">{cell.label}</div>
				<div class="stat-expected">{cell.expected}</div>
				<div class="stat-safe">safe {cell.safeLine}+</div>
			</div>
		{/each}
	</div>

	<button class="expand" onclick={() => (showGames = !showGames)} aria-expanded={showGames}>
		{showGames ? 'Hide' : 'Show'} sampled games ({card.recentSample.length + card.h2hSample.length})
	</button>

	{#if showGames}
		<div class="games-detail">
			{@render gamesTable('Recent form', card.recentSample)}
			{@render gamesTable(`Head-to-head vs ${opponentShort}`, card.h2hSample)}
		</div>
	{/if}
</div>

<style>
	.card {
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: var(--card);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.card-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.player-name {
		font-size: 1.375rem;
		font-weight: 700;
		margin: 0;
		color: var(--foreground);
		letter-spacing: -0.02em;
	}
	.fixture-line {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-top: 0.25rem;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}
	.fixture-line .team {
		font-weight: 600;
		color: var(--foreground);
	}
	.fixture-line .vs {
		opacity: 0.6;
	}
	.dot {
		opacity: 0.4;
	}
	.win-badge {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		padding: 0.375rem 0.75rem;
		background: color-mix(in oklch, var(--primary), transparent 92%);
	}
	.win-pct {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--primary);
		font-variant-numeric: tabular-nums;
	}
	.win-src {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted-foreground);
	}
	.thin-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		background: color-mix(in oklch, var(--muted), transparent 55%);
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
	}
	.thin-tag {
		font-size: 0.5625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 700;
		color: var(--foreground);
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		padding: 0.05rem 0.3rem;
		flex-shrink: 0;
	}
	.stat-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}
	.stat-cell {
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		padding: 0.625rem 0.5rem;
		text-align: center;
		background: color-mix(in oklch, var(--muted), transparent 70%);
	}
	.stat-label {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted-foreground);
	}
	.stat-expected {
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
		margin: 0.125rem 0;
	}
	.stat-safe {
		font-size: 0.6875rem;
		color: var(--primary);
		font-variant-numeric: tabular-nums;
	}
	.expand {
		align-self: flex-start;
		font-family: inherit;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		background: none;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 0.375rem 0.625rem;
		cursor: pointer;
	}
	.expand:hover {
		color: var(--foreground);
		border-color: var(--foreground);
	}
	.games-detail {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.games-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--foreground);
		margin-bottom: 0.375rem;
	}
	.games-empty {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin: 0;
	}
	.table-scroll {
		overflow-x: auto;
	}
	.games {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}
	.games th {
		text-align: right;
		font-weight: 600;
		color: var(--muted-foreground);
		padding: 0.3rem 0.5rem;
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
	}
	.games td {
		text-align: right;
		padding: 0.3rem 0.5rem;
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 40%);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.games .lcell {
		text-align: left;
	}
	.games .opp {
		color: var(--muted-foreground);
		margin-left: 0.25rem;
	}
	@media (max-width: 640px) {
		.stat-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
