<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let scraping = $state(false);
	let scrapingInline = $state(false);
	let expandedMatch = $state<number | null>(null);

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

	function roundLabel(r: number): string {
		return r === 0 ? 'Pre-Season' : `Round ${r}`;
	}

	function teamSlug(name: string): string {
		return name.toLowerCase().replace(/\s+/g, '-');
	}
</script>

<div class="mx-auto max-w-7xl space-y-6 p-8">
	<!-- Header -->
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold">AFL Stats Scraper</h1>
			<p class="mt-1 text-sm text-muted-foreground">Player stats from Footywire</p>
		</div>

		<div class="flex items-center gap-3">
			<!-- Year Select -->
			<Select.Root
				type="single"
				value={String(data.selectedYear)}
				onValueChange={(v) => {
					if (v) goto(`?year=${v}&round=${data.selectedRound}`);
				}}
			>
				<Select.Trigger class="w-28">
					{data.selectedYear}
				</Select.Trigger>
				<Select.Content>
					{#each data.allYears as year (year)}
						<Select.Item value={String(year)} label={String(year)}>
							{year}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<!-- Round Select -->
			<Select.Root
				type="single"
				value={String(data.selectedRound)}
				onValueChange={(v) => {
					if (v) goto(`?year=${data.selectedYear}&round=${v}`);
				}}
			>
				<Select.Trigger class="w-36">
					{roundLabel(data.selectedRound)}
				</Select.Trigger>
				<Select.Content>
					{#each data.allRounds as r (r)}
						{@const hasRoundData = data.storedRounds.includes(r)}
						<Select.Item value={String(r)} label={roundLabel(r)}>
							<span class="flex w-full items-center justify-between gap-2">
								<span>{roundLabel(r)}</span>
								{#if hasRoundData}
									<span class="size-1.5 shrink-0 rounded-full bg-primary"></span>
								{/if}
							</span>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<!-- Scrape form -->
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
				<input type="hidden" name="year" value={data.selectedYear} />
				<input type="hidden" name="round" value={data.selectedRound} />
				<Button type="submit" disabled={scraping}>
					{#if scraping}
						<span class="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
						Scraping...
					{:else}
						Scrape Round
					{/if}
				</Button>
			</form>
		</div>
	</div>

	<!-- Feedback banner -->
	{#if form && 'success' in form && form.success}
		<div class="rounded-lg border border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
			Round {form.round}, {form.year} scraped — {form.matchesScraped} match{form.matchesScraped === 1 ? '' : 'es'} saved.
		</div>
	{:else if form && 'error' in form && form.error}
		<div class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	<!-- Main content -->
	{#if !data.hasData}
		<!-- Empty state -->
		<div class="rounded-lg border border-dashed border-border py-24 text-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="40"
				height="40"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mx-auto text-muted-foreground/40"
			>
				<ellipse cx="12" cy="5" rx="9" ry="3" />
				<path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
				<path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
			</svg>
			<p class="mt-4 text-lg font-semibold text-foreground">
				No data for {roundLabel(data.selectedRound)}, {data.selectedYear}
			</p>
			<p class="mt-1 text-sm text-muted-foreground">
				This round hasn't been scraped yet. Hit the button to fetch stats from Footywire.
</p>
<form
method="POST"
action="?/scrape"
class="mt-6"
use:enhance={() => {
scrapingInline = true;
return async ({ update }) => {
await update();
scrapingInline = false;
};
}}
>
<input type="hidden" name="year" value={data.selectedYear} />
<input type="hidden" name="round" value={data.selectedRound} />
<Button type="submit" disabled={scrapingInline}>
{#if scrapingInline}
<span class="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
Scraping...
{:else}
Scrape this round
{/if}
</Button>
</form>
</div>
{:else}
<!-- Match list -->
<div class="space-y-3">
<p class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
{roundLabel(data.selectedRound)}, {data.selectedYear} — {data.matches.length} match{data.matches.length === 1 ? '' : 'es'}
</p>

{#each data.matches as match (match.id)}
{@const isExpanded = expandedMatch === match.id}
{@const homeWon = (match.homeScore ?? 0) > (match.awayScore ?? 0)}
{@const awayWon = (match.awayScore ?? 0) > (match.homeScore ?? 0)}
{@const homeSlug = teamSlug(match.homeTeam)}
{@const awaySlug = teamSlug(match.awayTeam)}
{@const homeStats = match.stats.filter((s) => s.teamId === homeSlug)}
{@const awayStats = match.stats.filter((s) => s.teamId === awaySlug)}

<div class="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
<!-- Match header (click to expand) -->
<button
class="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/50"
onclick={() => (expandedMatch = isExpanded ? null : match.id)}
>
<div class="flex items-center gap-6">
<!-- Home team -->
<div class="w-36 text-right">
<p class="font-semibold {homeWon ? 'text-foreground' : 'text-muted-foreground'}">
{match.homeTeam}
</p>
<p class="text-xs text-muted-foreground">{match.homeShortName}</p>
</div>

<!-- Score -->
<div class="text-center">
<p class="text-xl font-bold tabular-nums">
{match.homeScore ?? '–'}&nbsp;&ndash;&nbsp;{match.awayScore ?? '–'}
</p>
<p class="text-xs text-muted-foreground">{match.venue}</p>
</div>

<!-- Away team -->
<div class="w-36 text-left">
<p class="font-semibold {awayWon ? 'text-foreground' : 'text-muted-foreground'}">
{match.awayTeam}
</p>
<p class="text-xs text-muted-foreground">{match.awayShortName}</p>
</div>
</div>

<div class="flex items-center gap-4">
<div class="text-right">
<p class="text-xs text-muted-foreground">{match.date}</p>
{#if match.crowd}
<p class="text-xs text-muted-foreground">{match.crowd.toLocaleString()} crowd</p>
{/if}
</div>
<span
class="text-muted-foreground/60 transition-transform duration-200 {isExpanded
? 'rotate-180'
: ''}"
>
▼
</span>
</div>
</button>

<!-- Expanded player stats -->
{#if isExpanded}
{#each [{ name: match.homeTeam, stats: homeStats }, { name: match.awayTeam, stats: awayStats }] as team (team.name)}
{#if team.stats.length > 0}
<div class="border-t border-border">
<p class="bg-muted/40 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
{team.name}
</p>
<div class="overflow-x-auto">
<table class="w-full text-xs">
<thead>
<tr class="border-b border-border bg-muted/20">
<th class="px-5 py-2 text-left font-medium text-muted-foreground">Player</th>
{#each STAT_COLS as col (col.key)}
<th
class="px-2 py-2 text-center font-medium text-muted-foreground"
title={col.key}
>
{col.label}
</th>
{/each}
</tr>
</thead>
<tbody>
{#each team.stats as stat (stat.playerName)}
<tr class="border-b border-border/50 hover:bg-accent/30">
<td class="px-5 py-1.5 font-medium text-card-foreground">{stat.playerName}</td>
{#each STAT_COLS as col (col.key)}
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

<!-- Developer: debug scrape a specific match without writing to DB -->
<details class="rounded-lg border border-border">
<summary class="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
Debug Scrape (no DB write)
</summary>
<div class="space-y-4 border-t border-border p-4">
<form
method="POST"
action="?/debugScrape"
use:enhance={() => {
return async ({ update }) => {
await update();
};
}}
class="flex items-center gap-3"
>
<label class="text-sm text-muted-foreground" for="debug-mid">Match ID (mid)</label>
<input
id="debug-mid"
name="mid"
type="number"
min="1"
placeholder="e.g. 9928"
class="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
/>
<Button type="submit" variant="outline" size="sm">Scrape (no write)</Button>
</form>
{#if form && 'debugResult' in form && form.debugResult}
<pre class="overflow-x-auto rounded-md bg-muted p-4 text-xs text-muted-foreground">{form.debugResult}</pre>
{/if}
</div>
</details>
</div>
