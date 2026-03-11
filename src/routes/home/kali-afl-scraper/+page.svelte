<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let scraping = $state(false);

	const STAT_COLS = [
		{ key: 'kicks', label: 'K' },
		{ key: 'handballs', label: 'HB' },
		{ key: 'disposals', label: 'D' },
		{ key: 'marks', label: 'M' },
		{ key: 'goals', label: 'G' },
		{ key: 'behinds', label: 'B' },
		{ key: 'tackles', label: 'T' },
		{ key: 'hitouts', label: 'HO' },
		{ key: 'goalAssists', label: 'GA' },
		{ key: 'inside50s', label: 'I50' },
		{ key: 'clearances', label: 'CL' },
		{ key: 'clangers', label: 'CG' },
		{ key: 'rebound50s', label: 'R50' },
		{ key: 'freesFor', label: 'FF' },
		{ key: 'freesAgainst', label: 'FA' },
		{ key: 'aflFantasyPts', label: 'AF' },
		{ key: 'supercoachPts', label: 'SC' }
	] as const;

	let expandedMatch = $state<number | null>(null);
</script>

<div class="mx-auto max-w-7xl space-y-8 p-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">AFL Stats Scraper</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Player stats from Footywire &mdash; latest completed round
			</p>
		</div>

		<form
			method="POST"
			action="?/scrape"
			use:enhance={() => {
				scraping = true;
				return async ({ update }) => {
					await update();
					scraping = false;
				};
			}}
		>
			<Button type="submit" disabled={scraping}>
				{#if scraping}
					<span class="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
					Scraping...
				{:else}
					Scrape Latest Round
				{/if}
			</Button>
		</form>
	</div>

	<!-- Feedback banner -->
	{#if form && 'success' in form && form.success}
		<div class="rounded-lg border border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
			Round {form.round} scraped — {form.matchesScraped} match{form.matchesScraped === 1 ? '' : 'es'} saved.
		</div>
	{:else if form && 'error' in form && form.error}
		<div class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	<!-- No data state -->
	{#if data.matches.length === 0}
		<div class="rounded-lg border border-dashed border-border py-20 text-center text-muted-foreground">
			<p class="text-lg font-medium">No data yet</p>
			<p class="mt-1 text-sm">Hit "Scrape Latest Round" to fetch stats from Footywire.</p>
		</div>
	{:else}
		<div class="space-y-3">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
				Round {data.latestRound} &mdash; {data.matches.length} match{data.matches.length === 1 ? '' : 'es'}
			</h2>

			{#each data.matches as match (match.id)}
				{@const isExpanded = expandedMatch === match.id}
				{@const homeWon = (match.homeScore ?? 0) > (match.awayScore ?? 0)}
				{@const awayWon = (match.awayScore ?? 0) > (match.homeScore ?? 0)}
				{@const homeStats = match.stats.filter((s) => s.teamId === data.matches.find((m) => m.id === match.id)?.homeTeam)}

				<div class="overflow-hidden rounded-lg border border-border bg-card">
					<!-- Match header (click to expand) -->
					<button
						class="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/50"
						onclick={() => (expandedMatch = isExpanded ? null : match.id)}
					>
						<div class="flex items-center gap-6">
							<!-- Home -->
							<div class="text-right">
								<p class="font-semibold {homeWon ? 'text-foreground' : 'text-muted-foreground'}">
									{match.homeTeam}
								</p>
								<p class="text-xs text-muted-foreground">{match.homeShortName}</p>
							</div>

							<!-- Score -->
							<div class="text-center">
								<p class="text-xl font-bold tabular-nums">
									{match.homeScore ?? '–'} &ndash; {match.awayScore ?? '–'}
								</p>
								<p class="text-xs text-muted-foreground">{match.venue}</p>
							</div>

							<!-- Away -->
							<div class="text-left">
								<p class="font-semibold {awayWon ? 'text-foreground' : 'text-muted-foreground'}">
									{match.awayTeam}
								</p>
								<p class="text-xs text-muted-foreground">{match.awayShortName}</p>
							</div>
						</div>

						<div class="flex items-center gap-4 text-right">
							<div>
								<p class="text-xs text-muted-foreground">{match.date}</p>
								{#if match.crowd}
									<p class="text-xs text-muted-foreground">{match.crowd.toLocaleString()} crowd</p>
								{/if}
							</div>
							<span class="text-muted-foreground/60 transition-transform {isExpanded ? 'rotate-180' : ''}">
								▼
							</span>
						</div>
					</button>

					<!-- Expanded player stats -->
					{#if isExpanded}
						{#each [match.homeTeam, match.awayTeam] as teamName}
							{@const teamStats = match.stats.filter((s) => s.teamId === teamName.toLowerCase().replace(/\s+/g, '-'))}
							{#if teamStats.length > 0}
								<div class="border-t border-border">
									<p class="bg-muted/40 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										{teamName}
									</p>

									<div class="overflow-x-auto">
										<table class="w-full text-xs">
											<thead>
												<tr class="border-b border-border bg-muted/20">
													<th class="px-5 py-2 text-left font-medium text-muted-foreground">Player</th>
													{#each STAT_COLS as col}
														<th class="px-2 py-2 text-center font-medium text-muted-foreground" title={col.key}>
															{col.label}
														</th>
													{/each}
												</tr>
											</thead>
											<tbody>
												{#each teamStats as stat}
													<tr class="border-b border-border/50 hover:bg-accent/30">
														<td class="px-5 py-1.5 font-medium text-card-foreground">{stat.playerName}</td>
														{#each STAT_COLS as col}
															<td class="px-2 py-1.5 text-center tabular-nums text-muted-foreground">
																{stat[col.key]}
															</td>
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
