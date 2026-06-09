<script lang="ts">
	type UseCase = {
		title: string;
		desc: string;
		endpoints: string[];
	};

	const useCases: UseCase[] = [
		{
			title: 'fantasy & supercoach tools',
			desc: 'Build price trackers, scoring projectors, or team optimisers. Every match carries both AFL Fantasy and SuperCoach points, plus the full box score behind them.',
			endpoints: ['/v1/player-stats', '/v1/leaderboards']
		},
		{
			title: 'tipping & prediction models',
			desc: 'Train or back-test a match predictor on 25+ seasons of results, then benchmark it against the in-house model and the Squiggle tipster consensus.',
			endpoints: ['/v1/matches', '/v1/standings', '/v1/head-to-head', '/v1/predictions', '/v1/tips']
		},
		{
			title: 'deep matchup queries',
			desc: "Answer the questions broadcasters can't — like a player's average disposals against a specific opponent, at a specific venue, across every past meeting.",
			endpoints: ['/v1/player-stats', '/v1/head-to-head']
		}
	];
</script>

<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
	{#each useCases as uc (uc.title)}
		<div class="border-border bg-card flex flex-col gap-3 rounded-lg border p-5">
			<h3 class="text-foreground text-sm font-semibold tracking-tight">{uc.title}</h3>
			<p class="text-muted-foreground flex-1 text-[0.8125rem] leading-relaxed">{uc.desc}</p>
			<div class="flex flex-wrap gap-1.5 pt-1">
				{#each uc.endpoints as ep (ep)}
					<span
						class="border-border text-muted-foreground rounded-md border px-2 py-0.5 font-mono text-[0.6875rem]"
					>
						{ep}
					</span>
				{/each}
			</div>
		</div>
	{/each}
</div>
