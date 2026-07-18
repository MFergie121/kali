<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/state';
	import EmptyState from '$lib/components/ui/custom/emptyState.svelte';
	import type { LegsSearchResult } from '$lib/afl/legs.server';
	import DayChips from './components/DayChips.svelte';
	import PlayerLegCard from './components/PlayerLegCard.svelte';
	import SearchBox from './components/SearchBox.svelte';
	import ShowcaseList from './components/ShowcaseList.svelte';
	import TeamLegTable from './components/TeamLegTable.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let result = $state<LegsSearchResult | null>(null);
	let searchError = $state<string | null>(null);

	async function runSearch(qs: string) {
		loading = true;
		searchError = null;
		result = null;
		try {
			const res = await fetch(`/home/kali-afl/legs/search?${qs}`);
			if (!res.ok) throw new Error(`Couldn't compute that projection (${res.status}).`);
			result = (await res.json()) as LegsSearchResult;
		} catch (e) {
			searchError = e instanceof Error ? e.message : 'Search failed.';
		} finally {
			loading = false;
		}
	}

	function onSearchSelect(m: { kind: 'player'; id: number } | { kind: 'team'; slug: string }) {
		if (m.kind === 'player') runSearch(`player=${m.id}`);
		else runSearch(`team=${encodeURIComponent(m.slug)}`);
	}

	function clearSearch() {
		result = null;
		searchError = null;
	}

	function selectDay(date: string) {
		goto(`?date=${date}`, { keepFocus: true, noScroll: true });
	}

	function onShowcasePick(playerId: number) {
		runSearch(`player=${playerId}`);
	}

	const showingSearch = $derived(loading || result !== null || searchError !== null);
	const teamIsHome = $derived(
		result?.kind === 'team' ? result.fixture.homeTeamId === result.teamId : false
	);
</script>

<svelte:head>
	<title>Legs · Kali AFL</title>
</svelte:head>

<div class="page" class:page-loading={!!navigating.to}>
	<div class="toolbar">
		<div class="toolbar-left">
			<h1 class="page-title">legs</h1>
			<span class="page-sub">projected player stat lines for upcoming games</span>
		</div>
	</div>

	<SearchBox
		players={data.searchIndex.players}
		teams={data.searchIndex.teams}
		onSelect={onSearchSelect}
	/>

	{#if showingSearch}
		<button class="back" onclick={clearSearch}>← Back to the showcase</button>

		{#if loading}
			<div class="skeleton-card" aria-busy="true" aria-label="Computing projection">
				<div class="sk sk-title"></div>
				<div class="sk sk-line"></div>
				<div class="sk-grid">
					{#each Array(8) as _, i (i)}
						<div class="sk sk-tile"></div>
					{/each}
				</div>
			</div>
		{:else if searchError}
			<EmptyState title="Something went wrong" sub={searchError} />
		{:else if result && result.kind === 'player'}
			<PlayerLegCard card={result.card} fixture={result.fixture} />
		{:else if result && result.kind === 'team'}
			<TeamLegTable
				rows={result.rows}
				teamName={result.teamName}
				fixture={result.fixture}
				isHome={teamIsHome}
			/>
		{:else}
			<EmptyState
				title="No upcoming fixture"
				sub="This player or team has no scheduled game left to project."
			/>
		{/if}
	{:else if data.loadError}
		<EmptyState title="Couldn't load projections" sub="Please try again in a moment." />
	{:else if data.showcase.round === null || data.showcase.day === null}
		<EmptyState
			title="No upcoming games"
			sub="There are no scheduled fixtures to project right now — check back closer to the next round."
		/>
	{:else}
		<div class="showcase-head">
			<DayChips days={data.showcase.days} selected={data.showcase.day} onSelect={selectDay} />
			<p class="showcase-caption">
				Round {data.showcase.round} · {data.showcase.fixtureCount} game{data.showcase.fixtureCount ===
				1
					? ''
					: 's'} · players projected furthest from their 10-game average
			</p>
		</div>

		{#if data.showcase.rows.length === 0}
			<EmptyState
				title="No projections for this day"
				sub="No games with enough history to project on the selected day."
			/>
		{:else}
			<ShowcaseList rows={data.showcase.rows} onPick={onShowcasePick} />
		{/if}
	{/if}
</div>

<style>
	.page {
		max-width: 60rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		transition: opacity 0.15s ease;
	}
	.page-loading {
		opacity: 0.55;
		pointer-events: none;
	}
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.toolbar-left {
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
		flex-wrap: wrap;
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
	.back {
		align-self: flex-start;
		font-family: inherit;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}
	.back:hover {
		color: var(--foreground);
	}
	.showcase-head {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}
	.showcase-caption {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin: 0;
	}

	/* Loading skeleton */
	.skeleton-card {
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: var(--card);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.sk {
		border-radius: 0.375rem;
		background: color-mix(in oklch, var(--muted-foreground), transparent 80%);
		animation: pulse 1.2s ease-in-out infinite;
	}
	.sk-title {
		height: 1.5rem;
		width: 40%;
	}
	.sk-line {
		height: 0.875rem;
		width: 60%;
	}
	.sk-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}
	.sk-tile {
		height: 4.5rem;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}
	@media (max-width: 640px) {
		.sk-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
