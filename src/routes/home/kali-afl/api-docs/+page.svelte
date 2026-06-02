<script lang="ts">
	import Overview from '$lib/components/docs/overview.svelte';
	import Teams from '$lib/components/docs/teams.svelte';
	import Players from '$lib/components/docs/players.svelte';
	import Matches from '$lib/components/docs/matches.svelte';
	import PlayerStats from '$lib/components/docs/playerStats.svelte';
	import Standings from '$lib/components/docs/standings.svelte';
	import Fixture from '$lib/components/docs/fixture.svelte';
	import Tips from '$lib/components/docs/tips.svelte';
	import Predictions from '$lib/components/docs/predictions.svelte';
	import Leaderboards from '$lib/components/docs/leaderboards.svelte';
	import type { Component } from 'svelte';

	const sections: { id: string; label: string; component: Component }[] = [
		{ id: 'overview', label: 'Overview', component: Overview },
		{ id: 'teams', label: 'Teams', component: Teams },
		{ id: 'players', label: 'Players', component: Players },
		{ id: 'matches', label: 'Matches', component: Matches },
		{ id: 'player-stats', label: 'Player Stats', component: PlayerStats },
		{ id: 'standings', label: 'Standings', component: Standings },
		{ id: 'fixture', label: 'Fixture', component: Fixture },
		{ id: 'tips', label: 'Tips', component: Tips },
		{ id: 'predictions', label: 'Predictions', component: Predictions },
		{ id: 'leaderboards', label: 'Leaderboards', component: Leaderboards }
	];

	// Scroll-spy: highlight the section currently near the top of the viewport,
	// mirroring the active-item behaviour of the public /docs sidebar.
	let activeId = $state('overview');

	$effect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) activeId = entry.target.id;
				}
			},
			{ rootMargin: '-15% 0px -75% 0px' }
		);
		for (const s of sections) {
			const el = document.getElementById(s.id);
			if (el) observer.observe(el);
		}
		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>API Docs | Kali AFL</title>
</svelte:head>

<!-- In-app docs: same content + section sidebar as the public /docs, rendered
     inside the app shell. All content comes from $lib/components/docs (single
     source of truth shared with /docs). -->
<div class="mx-auto flex max-w-6xl gap-8 px-4">
	<!-- Contents sidebar (jump links) -->
	<aside class="hidden w-52 shrink-0 md:block">
		<nav class="sticky top-16 space-y-1 py-8">
			{#each sections as s (s.id)}
				<a
					href={`#${s.id}`}
					class="block rounded-md px-3 py-2 text-sm transition-colors {activeId === s.id
						? 'bg-accent text-foreground font-medium'
						: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
				>
					{s.label}
				</a>
			{/each}
		</nav>
	</aside>

	<!-- Stacked content -->
	<main class="min-w-0 flex-1 space-y-16 py-6 pb-24">
		{#each sections as s, i (s.id)}
			{@const Section = s.component}
			<div id={s.id} class="scroll-mt-20 {i > 0 ? 'border-t pt-12' : ''}">
				<Section />
			</div>
		{/each}
	</main>
</div>
