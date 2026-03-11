<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Select from '$lib/components/ui/select';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type StatKey =
		| 'kicks'
		| 'handballs'
		| 'disposals'
		| 'marks'
		| 'goals'
		| 'behinds'
		| 'tackles'
		| 'hitouts'
		| 'goalAssists'
		| 'inside50s'
		| 'clearances'
		| 'clangers'
		| 'rebound50s'
		| 'freesFor'
		| 'freesAgainst'
		| 'aflFantasyPts'
		| 'supercoachPts';

	const STAT_COLS = [
		{ key: 'kicks' as StatKey, label: 'Kicks' },
		{ key: 'handballs' as StatKey, label: 'Handballs' },
		{ key: 'disposals' as StatKey, label: 'Disposals' },
		{ key: 'marks' as StatKey, label: 'Marks' },
		{ key: 'goals' as StatKey, label: 'Goals' },
		{ key: 'behinds' as StatKey, label: 'Behinds' },
		{ key: 'tackles' as StatKey, label: 'Tackles' },
		{ key: 'hitouts' as StatKey, label: 'Hitouts' },
		{ key: 'goalAssists' as StatKey, label: 'Goal Assists' },
		{ key: 'inside50s' as StatKey, label: 'Inside 50s' },
		{ key: 'clearances' as StatKey, label: 'Clearances' },
		{ key: 'clangers' as StatKey, label: 'Clangers' },
		{ key: 'rebound50s' as StatKey, label: 'Rebound 50s' },
		{ key: 'freesFor' as StatKey, label: 'Frees For' },
		{ key: 'freesAgainst' as StatKey, label: 'Frees Against' },
		{ key: 'aflFantasyPts' as StatKey, label: 'AFL Fantasy Pts' },
		{ key: 'supercoachPts' as StatKey, label: 'Supercoach Pts' }
	] as const;

	let selectedStat = $state<StatKey>('disposals');

	const allRounds = $derived(
		[...new Set(data.rows.map((r) => r.round))].sort((a, b) => a - b)
	);
	const allPlayers = $derived([...new Set(data.rows.map((r) => r.playerName))].sort());

	// Initialise with all data; reset whenever year changes (data.rows changes).
	// untrack tells Svelte the initial capture is intentional — the $effect handles updates.
	let selectedRounds = $state<Set<number>>(untrack(() => new Set(data.rows.map((r) => r.round))));
	let selectedPlayers = $state<Set<string>>(
		untrack(() => new Set(data.rows.map((r) => r.playerName)))
	);

	$effect(() => {
		selectedRounds = new Set(allRounds);
		selectedPlayers = new Set(allPlayers);
	});

	const visibleRounds = $derived(allRounds.filter((r) => selectedRounds.has(r)));
	const visiblePlayers = $derived(allPlayers.filter((p) => selectedPlayers.has(p)));

	const lookup = $derived.by(() => {
		const map = new Map<string, Map<number, number>>();
		for (const row of data.rows) {
			if (!map.has(row.playerName)) map.set(row.playerName, new Map());
			map.get(row.playerName)!.set(row.round, row[selectedStat]);
		}
		return map;
	});

	const selectedStatLabel = $derived(
		STAT_COLS.find((c) => c.key === selectedStat)?.label ?? selectedStat
	);

	function roundLabel(r: number): string {
		return r === 0 ? 'Pre-Season' : `R${r}`;
	}

	function toggleRound(r: number, v: boolean) {
		const s = new Set(selectedRounds);
		if (v) s.add(r);
		else s.delete(r);
		selectedRounds = s;
	}

	function togglePlayer(p: string, v: boolean) {
		const s = new Set(selectedPlayers);
		if (v) s.add(p);
		else s.delete(p);
		selectedPlayers = s;
	}
</script>

<div class="space-y-4 p-6">
	<!-- Header -->
	<div>
		<h1 class="text-lg font-semibold">Player Stats Matrix</h1>
		<p class="text-sm text-muted-foreground">
			Track how players perform across rounds for a selected stat
		</p>
	</div>

	<!-- Controls -->
	<div class="flex flex-wrap items-center gap-2">
		<!-- Year -->
		<Select.Root
			type="single"
			value={String(data.selectedYear)}
			onValueChange={(v) => {
				if (v) goto(`?year=${v}`);
			}}
		>
			<Select.Trigger class="w-24">{data.selectedYear}</Select.Trigger>
			<Select.Content>
				{#each data.allYears as year (year)}
					<Select.Item value={String(year)} label={String(year)}>{year}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<!-- Stat -->
		<Select.Root
			type="single"
			value={selectedStat}
			onValueChange={(v) => {
				if (v) selectedStat = v as StatKey;
			}}
		>
			<Select.Trigger class="w-44">{selectedStatLabel}</Select.Trigger>
			<Select.Content>
				{#each STAT_COLS as col (col.key)}
					<Select.Item value={col.key} label={col.label}>{col.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<!-- Players filter -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button variant="outline" size="sm" {...props}>
						Players ({selectedPlayers.size}/{allPlayers.length})
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="max-h-80 w-56 overflow-y-auto">
				<div class="flex gap-1 border-b border-border px-2 pb-1.5 pt-1">
					<button
						class="flex-1 rounded px-2 py-0.5 text-xs hover:bg-accent"
						onclick={() => {
							selectedPlayers = new Set(allPlayers);
						}}
					>
						Select all
					</button>
					<button
						class="flex-1 rounded px-2 py-0.5 text-xs hover:bg-accent"
						onclick={() => {
							selectedPlayers = new Set();
						}}
					>
						Clear
					</button>
				</div>
				{#each allPlayers as p (p)}
					<DropdownMenu.CheckboxItem
						checked={selectedPlayers.has(p)}
						onCheckedChange={(v) => togglePlayer(p, v)}
					>
						{p}
					</DropdownMenu.CheckboxItem>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<!-- Rounds filter -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button variant="outline" size="sm" {...props}>
						Rounds ({selectedRounds.size}/{allRounds.length})
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="max-h-80 w-44 overflow-y-auto">
				<div class="flex gap-1 border-b border-border px-2 pb-1.5 pt-1">
					<button
						class="flex-1 rounded px-2 py-0.5 text-xs hover:bg-accent"
						onclick={() => {
							selectedRounds = new Set(allRounds);
						}}
					>
						Select all
					</button>
					<button
						class="flex-1 rounded px-2 py-0.5 text-xs hover:bg-accent"
						onclick={() => {
							selectedRounds = new Set();
						}}
					>
						Clear
					</button>
				</div>
				{#each allRounds as r (r)}
					<DropdownMenu.CheckboxItem
						checked={selectedRounds.has(r)}
						onCheckedChange={(v) => toggleRound(r, v)}
					>
						{roundLabel(r)}
					</DropdownMenu.CheckboxItem>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	<!-- Empty state: no data for year -->
	{#if data.rows.length === 0}
		<div class="rounded-lg border border-dashed border-border py-20 text-center">
			<p class="text-sm font-medium text-foreground">No data for {data.selectedYear}</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Scrape some rounds on the Matches &amp; Stats page first.
			</p>
		</div>
	<!-- Empty state: filters exclude everything -->
	{:else if visiblePlayers.length === 0 || visibleRounds.length === 0}
		<div class="rounded-lg border border-dashed border-border py-20 text-center">
			<p class="text-sm font-medium text-foreground">Nothing to display</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Select at least one player and one round using the filters above.
			</p>
		</div>
	{:else}
		<!-- Pivot table -->
		<div class="overflow-x-auto rounded-lg border border-border">
			<table class="text-xs">
				<thead>
					<tr class="border-b border-border bg-muted/40">
						<th
							class="sticky left-0 z-10 whitespace-nowrap bg-muted/40 px-4 py-2 text-left font-medium text-muted-foreground"
						>
							Player
						</th>
						{#each visibleRounds as r (r)}
							<th
								class="min-w-14 whitespace-nowrap px-2 py-2 text-center font-medium text-muted-foreground"
							>
								{roundLabel(r)}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each visiblePlayers as p (p)}
						{@const playerMap = lookup.get(p)}
						<tr class="border-b border-border/50 hover:bg-accent/30">
							<td
								class="sticky left-0 z-10 whitespace-nowrap bg-card px-4 py-1.5 font-medium text-foreground"
							>
								{p}
							</td>
							{#each visibleRounds as r (r)}
								{@const val = playerMap?.get(r)}
								<td class="px-2 py-1.5 text-center tabular-nums text-muted-foreground">
									{val !== undefined ? val : '-'}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="text-right text-xs text-muted-foreground">
			{visiblePlayers.length} players &times; {visibleRounds.length} rounds &middot; {selectedStatLabel}
		</p>
	{/if}
</div>
