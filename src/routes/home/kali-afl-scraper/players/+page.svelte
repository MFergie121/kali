<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Select from '$lib/components/ui/select';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type StatKey =
		| 'kicks' | 'handballs' | 'disposals' | 'marks' | 'goals' | 'behinds'
		| 'tackles' | 'hitouts' | 'goalAssists' | 'inside50s' | 'clearances'
		| 'clangers' | 'rebound50s' | 'freesFor' | 'freesAgainst'
		| 'aflFantasyPts' | 'supercoachPts'
		| 'contestedPossessions' | 'uncontestedPossessions' | 'effectiveDisposals'
		| 'disposalEfficiencyPct' | 'contestedMarks' | 'marksInside50'
		| 'onePercenters' | 'bounces' | 'centreClearances' | 'stoppageClearances'
		| 'scoreInvolvements' | 'metresGained' | 'turnovers' | 'intercepts'
		| 'tacklesInside50' | 'timeOnGroundPct';

	const STAT_COLS = [
		{ key: 'kicks'         as StatKey, label: 'Kicks'           },
		{ key: 'handballs'     as StatKey, label: 'Handballs'       },
		{ key: 'disposals'     as StatKey, label: 'Disposals'       },
		{ key: 'marks'         as StatKey, label: 'Marks'           },
		{ key: 'goals'         as StatKey, label: 'Goals'           },
		{ key: 'behinds'       as StatKey, label: 'Behinds'         },
		{ key: 'tackles'       as StatKey, label: 'Tackles'         },
		{ key: 'hitouts'       as StatKey, label: 'Hitouts'         },
		{ key: 'goalAssists'   as StatKey, label: 'Goal Assists'    },
		{ key: 'inside50s'     as StatKey, label: 'Inside 50s'      },
		{ key: 'clearances'    as StatKey, label: 'Clearances'      },
		{ key: 'clangers'      as StatKey, label: 'Clangers'        },
		{ key: 'rebound50s'    as StatKey, label: 'Rebound 50s'     },
		{ key: 'freesFor'      as StatKey, label: 'Frees For'       },
		{ key: 'freesAgainst'  as StatKey, label: 'Frees Against'   },
		{ key: 'aflFantasyPts' as StatKey, label: 'AFL Fantasy Pts' },
		{ key: 'supercoachPts' as StatKey, label: 'Supercoach Pts'  },
	] as const;

	const ADV_STAT_COLS = [
		{ key: 'contestedPossessions'   as StatKey, label: 'Contested Poss.'      },
		{ key: 'uncontestedPossessions' as StatKey, label: 'Uncontested Poss.'    },
		{ key: 'effectiveDisposals'     as StatKey, label: 'Effective Disposals'  },
		{ key: 'disposalEfficiencyPct'  as StatKey, label: 'Disposal Eff. %'      },
		{ key: 'contestedMarks'         as StatKey, label: 'Contested Marks'      },
		{ key: 'goalAssists'            as StatKey, label: 'Goal Assists (Adv)'   },
		{ key: 'marksInside50'          as StatKey, label: 'Marks Inside 50'      },
		{ key: 'onePercenters'          as StatKey, label: 'One Percenters'       },
		{ key: 'bounces'                as StatKey, label: 'Bounces'              },
		{ key: 'centreClearances'       as StatKey, label: 'Centre Clearances'    },
		{ key: 'stoppageClearances'     as StatKey, label: 'Stoppage Clearances'  },
		{ key: 'scoreInvolvements'      as StatKey, label: 'Score Involvements'   },
		{ key: 'metresGained'           as StatKey, label: 'Metres Gained'        },
		{ key: 'turnovers'              as StatKey, label: 'Turnovers'            },
		{ key: 'intercepts'             as StatKey, label: 'Intercepts'           },
		{ key: 'tacklesInside50'        as StatKey, label: 'Tackles Inside 50'    },
		{ key: 'timeOnGroundPct'        as StatKey, label: 'Time On Ground %'     },
	] as const;

	const ADV_KEYS = new Set(ADV_STAT_COLS.map((c) => c.key));

	let selectedStat = $state<StatKey>(
		untrack(() => {
			if (browser) return (sessionStorage.getItem('afl-players-stat') as StatKey) ?? 'disposals';
			return 'disposals';
		})
	);
	let showAvg = $state(
		untrack(() => browser && sessionStorage.getItem('afl-players-showAvg') === 'true')
	);
	let playerSearch = $state('');
	let roundSearch  = $state('');

	const isAdvStat = $derived(ADV_KEYS.has(selectedStat));
	const activeRows = $derived(isAdvStat ? data.advRows : data.rows);

	const allRounds  = $derived([...new Set(activeRows.map((r) => r.round))].sort((a, b) => a - b));
	const allPlayers = $derived([...new Set(activeRows.map((r) => r.playerName))].sort());

	let selectedRounds = $state<Set<number>>(
		untrack(() => {
			if (browser) {
				const saved = sessionStorage.getItem(`afl-players-rounds-${data.selectedYear}`);
				if (saved) {
					const valid = new Set(data.rows.map((r) => r.round));
					return new Set((JSON.parse(saved) as number[]).filter((r) => valid.has(r)));
				}
			}
			return new Set(data.rows.map((r) => r.round));
		})
	);
	let selectedPlayers = $state<Set<string>>(
		untrack(() => {
			if (browser) {
				const saved = sessionStorage.getItem(`afl-players-players-${data.selectedYear}`);
				if (saved) {
					const valid = new Set(data.rows.map((r) => r.playerName));
					return new Set((JSON.parse(saved) as string[]).filter((p) => valid.has(p)));
				}
			}
			return new Set(data.rows.map((r) => r.playerName));
		})
	);

	$effect(() => {
		const savedRounds = browser ? sessionStorage.getItem(`afl-players-rounds-${data.selectedYear}`) : null;
		if (savedRounds) {
			const valid = new Set(allRounds);
			selectedRounds = new Set((JSON.parse(savedRounds) as number[]).filter((r) => valid.has(r)));
		} else {
			selectedRounds = new Set(allRounds);
		}
		const savedPlayers = browser ? sessionStorage.getItem(`afl-players-players-${data.selectedYear}`) : null;
		if (savedPlayers) {
			const valid = new Set(allPlayers);
			selectedPlayers = new Set((JSON.parse(savedPlayers) as string[]).filter((p) => valid.has(p)));
		} else {
			selectedPlayers = new Set(allPlayers);
		}
	});

	$effect(() => { if (browser) sessionStorage.setItem('afl-players-stat', selectedStat); });
	$effect(() => { if (browser) sessionStorage.setItem('afl-players-showAvg', String(showAvg)); });
	$effect(() => { if (browser) sessionStorage.setItem(`afl-players-rounds-${data.selectedYear}`, JSON.stringify([...selectedRounds])); });
	$effect(() => { if (browser) sessionStorage.setItem(`afl-players-players-${data.selectedYear}`, JSON.stringify([...selectedPlayers])); });

	const filteredPlayers = $derived(
		playerSearch.trim() === ''
			? allPlayers
			: allPlayers.filter((p) => p.toLowerCase().includes(playerSearch.toLowerCase()))
	);
	const filteredRounds = $derived(
		roundSearch.trim() === ''
			? allRounds
			: allRounds.filter((r) => roundLabel(r).toLowerCase().includes(roundSearch.toLowerCase()))
	);

	const visibleRounds  = $derived(allRounds.filter((r) => selectedRounds.has(r)));
	const visiblePlayers = $derived(allPlayers.filter((p) => selectedPlayers.has(p)));

	const lookup = $derived.by(() => {
		const map = new Map<string, Map<number, number>>();
		for (const row of activeRows) {
			if (!map.has(row.playerName)) map.set(row.playerName, new Map());
			map.get(row.playerName)!.set(row.round, (row as Record<string, unknown>)[selectedStat] as number ?? 0);
		}
		return map;
	});

	const playerAvg = $derived.by(() => {
		const map = new Map<string, number>();
		for (const p of visiblePlayers) {
			const playerMap = lookup.get(p);
			const values = visibleRounds
				.map((r) => playerMap?.get(r))
				.filter((v) => v !== undefined) as number[];
			map.set(p, values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);
		}
		return map;
	});

	const selectedStatLabel = $derived(
		[...STAT_COLS, ...ADV_STAT_COLS].find((c) => c.key === selectedStat)?.label ?? selectedStat
	);

	function roundLabel(r: number): string { return r === 0 ? 'Pre' : `R${r}`; }
	function toggleRound(r: number, v: boolean) {
		const s = new Set(selectedRounds); if (v) s.add(r); else s.delete(r); selectedRounds = s;
	}
	function togglePlayer(p: string, v: boolean) {
		const s = new Set(selectedPlayers); if (v) s.add(p); else s.delete(p); selectedPlayers = s;
	}
</script>

<div class="page">

	<!-- ── Toolbar ── -->
	<div class="toolbar">
		<div class="toolbar-left">
			<h1 class="page-title">player stats matrix</h1>
			<span class="page-sub">{data.selectedYear}</span>
		</div>

		<div class="toolbar-right">
			<!-- Year -->
			<Select.Root
				type="single"
				value={String(data.selectedYear)}
				onValueChange={(v) => { if (v) goto(`?year=${v}`); }}
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
				onValueChange={(v) => { if (v) selectedStat = v as StatKey; }}
			>
				<Select.Trigger class="w-52">{selectedStatLabel}</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Label class="select-group-label">standard</Select.Label>
						{#each STAT_COLS as col (col.key)}
							<Select.Item value={col.key} label={col.label}>{col.label}</Select.Item>
						{/each}
					</Select.Group>
					<Select.Separator />
					<Select.Group>
						<Select.Label class="select-group-label">advanced</Select.Label>
						{#each ADV_STAT_COLS as col (col.key)}
							<Select.Item value={col.key} label={col.label}>{col.label}</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>

			<!-- Players filter -->
			<DropdownMenu.Root onOpenChange={(open) => { if (!open) playerSearch = ''; }}>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button variant="outline" size="sm" {...props}>
							players <span class="filter-count">{selectedPlayers.size}/{allPlayers.length}</span>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="max-h-80 w-56 overflow-y-auto">
					<div class="filter-search-wrap">
						<input
							type="text"
							placeholder="search players…"
							bind:value={playerSearch}
							class="filter-search"
							onkeydown={(e) => e.stopPropagation()}
						/>
					</div>
					<div class="filter-actions">
						<button class="filter-action-btn" onclick={() => { selectedPlayers = new Set(allPlayers); }}>all</button>
						<button class="filter-action-btn" onclick={() => { selectedPlayers = new Set(); }}>clear</button>
					</div>
					{#each filteredPlayers as p (p)}
						<DropdownMenu.CheckboxItem
							checked={selectedPlayers.has(p)}
							onSelect={(e) => { e.preventDefault(); togglePlayer(p, !selectedPlayers.has(p)); }}
						>{p}</DropdownMenu.CheckboxItem>
					{/each}
					{#if filteredPlayers.length === 0}
						<p class="filter-empty">no players match</p>
					{/if}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<!-- Rounds filter -->
			<DropdownMenu.Root onOpenChange={(open) => { if (!open) roundSearch = ''; }}>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button variant="outline" size="sm" {...props}>
							rounds <span class="filter-count">{selectedRounds.size}/{allRounds.length}</span>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="max-h-80 w-44 overflow-y-auto">
					<div class="filter-search-wrap">
						<input
							type="text"
							placeholder="search rounds…"
							bind:value={roundSearch}
							class="filter-search"
							onkeydown={(e) => e.stopPropagation()}
						/>
					</div>
					<div class="filter-actions">
						<button class="filter-action-btn" onclick={() => { selectedRounds = new Set(allRounds); }}>all</button>
						<button class="filter-action-btn" onclick={() => { selectedRounds = new Set(); }}>clear</button>
					</div>
					{#each filteredRounds as r (r)}
						<DropdownMenu.CheckboxItem
							checked={selectedRounds.has(r)}
							onSelect={(e) => { e.preventDefault(); toggleRound(r, !selectedRounds.has(r)); }}
						>{roundLabel(r)}</DropdownMenu.CheckboxItem>
					{/each}
					{#if filteredRounds.length === 0}
						<p class="filter-empty">no rounds match</p>
					{/if}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<!-- Avg toggle -->
			<Button
				variant={showAvg ? 'default' : 'outline'}
				size="sm"
				onclick={() => (showAvg = !showAvg)}
			>avg</Button>
		</div>
	</div>

	<!-- ── Empty states ── -->
	{#if data.rows.length === 0}
		<div class="empty-state">
			<p class="empty-title">no data for {data.selectedYear}</p>
			<p class="empty-sub">scrape some rounds on the matches &amp; stats page first</p>
		</div>
	{:else if visiblePlayers.length === 0 || visibleRounds.length === 0}
		<div class="empty-state">
			<p class="empty-title">nothing to display</p>
			<p class="empty-sub">select at least one player and one round using the filters above</p>
		</div>

	{:else}
		<!-- ── Pivot table ── -->
		<div class="table-wrap">
			<table class="matrix">
				<thead>
					<tr>
						<th class="col-player col-head">player</th>
						{#each visibleRounds as r (r)}
							<th class="col-round col-head">{roundLabel(r)}</th>
						{/each}
						{#if showAvg}
							<th class="col-avg col-head col-head-avg">avg</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each visiblePlayers as p (p)}
						{@const playerMap = lookup.get(p)}
						<tr>
							<td class="col-player cell-name">{p}</td>
							{#each visibleRounds as r (r)}
								{@const val = playerMap?.get(r)}
								<td class="col-round cell-val">{val !== undefined ? val : '–'}</td>
							{/each}
							{#if showAvg}
								<td class="col-avg cell-avg">{playerAvg.get(p)?.toFixed(1) ?? '–'}</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<p class="table-footer">
			{visiblePlayers.length} players &times; {visibleRounds.length} rounds
			<span class="footer-sep">·</span>
			{selectedStatLabel}
		</p>
	{/if}

</div>

<style>
	/* ── Layout ── */
	.page {
		max-width: 100%;
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
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.filter-count {
		margin-left: 0.25rem;
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		background-color: var(--secondary);
		border: 1px solid var(--border);
		border-radius: 0.3rem;
		padding: 0 0.3rem;
	}

	/* ── Stat select group labels ── */
	:global(.select-group-label) {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
		padding: 0.375rem 0.75rem 0.125rem;
	}

	/* ── Filter dropdown internals ── */
	:global(.filter-search-wrap) {
		border-bottom: 1px solid var(--border);
		padding: 0.375rem 0.5rem;
	}

	.filter-search-wrap {
		border-bottom: 1px solid var(--border);
		padding: 0.375rem 0.5rem;
	}

	.filter-search {
		width: 100%;
		background: transparent;
		border: none;
		outline: none;
		font-size: 0.75rem;
		font-family: inherit;
		color: var(--foreground);
	}

	.filter-search::placeholder { color: var(--muted-foreground); }

	.filter-actions {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1px solid var(--border);
		padding: 0.25rem 0.5rem;
	}

	.filter-action-btn {
		flex: 1;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.75rem;
		font-family: inherit;
		color: var(--muted-foreground);
		border-radius: 0.25rem;
		padding: 0.2rem 0.375rem;
		transition: background-color 0.12s ease, color 0.12s ease;
	}

	.filter-action-btn:hover {
		background-color: var(--accent);
		color: var(--accent-foreground);
	}

	.filter-empty {
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	/* ── Empty states ── */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 5rem 2rem;
		border: 1px dashed var(--border);
		border-radius: 0.75rem;
		text-align: center;
	}

	.empty-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--foreground);
	}

	.empty-sub {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	/* ── Pivot table ── */
	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: 0.625rem;
	}

	.matrix {
		border-collapse: collapse;
		font-size: 0.75rem;
		width: 100%;
	}

	/* column sizing */
	.col-player {
		text-align: left;
		white-space: nowrap;
		padding: 0.375rem 1rem 0.375rem 1.25rem;
		position: sticky;
		left: 0;
		z-index: 2;
	}

	.col-round {
		text-align: center;
		white-space: nowrap;
		padding: 0.375rem 0.5rem;
		min-width: 2.75rem;
	}

	.col-avg {
		text-align: center;
		white-space: nowrap;
		padding: 0.375rem 0.875rem;
		min-width: 3.5rem;
	}

	/* header row */
	thead tr {
		border-bottom: 1px solid var(--border);
		background-color: color-mix(in oklch, var(--muted), transparent 55%);
	}

	.col-head {
		font-weight: 600;
		color: var(--muted-foreground);
		background-color: color-mix(in oklch, var(--muted), transparent 55%);
	}

	.col-head-avg {
		color: var(--foreground);
		background-color: color-mix(in oklch, var(--muted), transparent 35%);
		border-left: 1px solid var(--border);
	}

	/* body rows */
	tbody tr {
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 45%);
		transition: background-color 0.1s ease;
	}

	tbody tr:last-child { border-bottom: none; }

	tbody tr:hover .col-player,
	tbody tr:hover .col-round,
	tbody tr:hover .col-avg {
		background-color: color-mix(in oklch, var(--accent), transparent 80%);
	}

	.cell-name {
		font-weight: 500;
		color: var(--foreground);
		background-color: var(--card);
	}

	.cell-val {
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}

	.cell-avg {
		font-weight: 600;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
		background-color: color-mix(in oklch, var(--muted), transparent 70%);
		border-left: 1px solid var(--border);
	}

	/* ── Footer ── */
	.table-footer {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		text-align: right;
		letter-spacing: 0.01em;
	}

	.footer-sep {
		margin: 0 0.25rem;
		opacity: 0.5;
	}
</style>
