<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Select from '$lib/components/ui/select';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	import type { PlayerGameRow } from './+page.server';

	let { data }: { data: PageData } = $props();

	// ── Tabs ──────────────────────────────────────────────────────────────────
	let activeTab = $state<'overview' | 'matrix' | 'games' | 'insights'>('overview');

	// ── Stat columns ──────────────────────────────────────────────────────────
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
		{ key: 'contestedPossessions'   as StatKey, label: 'Contested Poss.'     },
		{ key: 'uncontestedPossessions' as StatKey, label: 'Uncontested Poss.'   },
		{ key: 'effectiveDisposals'     as StatKey, label: 'Effective Disposals' },
		{ key: 'disposalEfficiencyPct'  as StatKey, label: 'Disposal Eff. %'     },
		{ key: 'contestedMarks'         as StatKey, label: 'Contested Marks'     },
		{ key: 'goalAssists'            as StatKey, label: 'Goal Assists (Adv)'  },
		{ key: 'marksInside50'          as StatKey, label: 'Marks Inside 50'     },
		{ key: 'onePercenters'          as StatKey, label: 'One Percenters'      },
		{ key: 'bounces'                as StatKey, label: 'Bounces'             },
		{ key: 'centreClearances'       as StatKey, label: 'Centre Clearances'   },
		{ key: 'stoppageClearances'     as StatKey, label: 'Stoppage Clearances' },
		{ key: 'scoreInvolvements'      as StatKey, label: 'Score Involvements'  },
		{ key: 'metresGained'           as StatKey, label: 'Metres Gained'       },
		{ key: 'turnovers'              as StatKey, label: 'Turnovers'           },
		{ key: 'intercepts'             as StatKey, label: 'Intercepts'          },
		{ key: 'tacklesInside50'        as StatKey, label: 'Tackles Inside 50'   },
		{ key: 'timeOnGroundPct'        as StatKey, label: 'Time On Ground %'    },
	] as const;

	const ADV_KEYS = new Set(ADV_STAT_COLS.map(c => c.key));

	// ── Matrix state ──────────────────────────────────────────────────────────
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
	let sortByAvgDesc = $state(false);

	const isAdvStat   = $derived(ADV_KEYS.has(selectedStat));
	const activeRows  = $derived(isAdvStat ? data.advRows : data.rows);
	const allRounds   = $derived([...new Set(activeRows.map(r => r.round))].sort((a, b) => a - b));
	const allPlayers  = $derived([...new Set(activeRows.map(r => r.playerName))].sort());

	let selectedRounds = $state<Set<number>>(
		untrack(() => {
			if (browser) {
				const saved = sessionStorage.getItem(`afl-players-rounds-${data.selectedYear}`);
				if (saved) {
					const valid = new Set(data.rows.map(r => r.round));
					return new Set((JSON.parse(saved) as number[]).filter(r => valid.has(r)));
				}
			}
			return new Set(data.rows.map(r => r.round));
		})
	);
	let selectedPlayers = $state<Set<string>>(
		untrack(() => {
			if (browser) {
				const saved = sessionStorage.getItem(`afl-players-players-${data.selectedYear}`);
				if (saved) {
					const valid = new Set(data.rows.map(r => r.playerName));
					return new Set((JSON.parse(saved) as string[]).filter(p => valid.has(p)));
				}
			}
			return new Set(data.rows.map(r => r.playerName));
		})
	);

	$effect(() => {
		const savedRounds = browser ? sessionStorage.getItem(`afl-players-rounds-${data.selectedYear}`) : null;
		if (savedRounds) {
			const valid = new Set(allRounds);
			selectedRounds = new Set((JSON.parse(savedRounds) as number[]).filter(r => valid.has(r)));
		} else {
			selectedRounds = new Set(allRounds);
		}
		const savedPlayers = browser ? sessionStorage.getItem(`afl-players-players-${data.selectedYear}`) : null;
		if (savedPlayers) {
			const valid = new Set(allPlayers);
			selectedPlayers = new Set((JSON.parse(savedPlayers) as string[]).filter(p => valid.has(p)));
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
			: allPlayers.filter(p => p.toLowerCase().includes(playerSearch.toLowerCase()))
	);

	const visibleRounds  = $derived(allRounds.filter(r => selectedRounds.has(r)));
	const visiblePlayers = $derived(allPlayers.filter(p => selectedPlayers.has(p)));

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
			const pm = lookup.get(p);
			const vals = visibleRounds.map(r => pm?.get(r)).filter(v => v !== undefined) as number[];
			map.set(p, vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
		}
		return map;
	});

	const sortedVisiblePlayers = $derived(
		sortByAvgDesc
			? [...visiblePlayers].sort((a, b) => (playerAvg.get(b) ?? 0) - (playerAvg.get(a) ?? 0))
			: visiblePlayers
	);

	// Heatmap: per-round value range
	const roundStats = $derived.by(() => {
		const map = new Map<number, { min: number; max: number }>();
		for (const r of visibleRounds) {
			const vals = visiblePlayers.map(p => lookup.get(p)?.get(r)).filter(v => v !== undefined && v > 0) as number[];
			if (vals.length > 0) map.set(r, { min: Math.min(...vals), max: Math.max(...vals) });
		}
		return map;
	});

	function heatStyle(val: number | undefined, round: number): string {
		if (val === undefined || val === 0) return '';
		const rs = roundStats.get(round);
		if (!rs || rs.max === rs.min) return '';
		const ratio = (val - rs.min) / (rs.max - rs.min);
		if (ratio > 0.65) return `background-color:oklch(0.52 0.14 145/${Math.round(ratio * 18)}%);`;
		if (ratio < 0.3) return `background-color:color-mix(in oklch,var(--destructive),transparent ${Math.round(88 + ratio * 30)}%);`;
		return '';
	}

	const selectedStatLabel = $derived(
		[...STAT_COLS, ...ADV_STAT_COLS].find(c => c.key === selectedStat)?.label ?? selectedStat
	);

	const seasonLeader = $derived.by(() => {
		const avgs = new Map<string, number>();
		for (const p of allPlayers) {
			const pm = lookup.get(p);
			if (!pm) continue;
			const vals = allRounds.map(r => pm.get(r)).filter(v => v !== undefined) as number[];
			if (vals.length > 0) avgs.set(p, vals.reduce((a, b) => a + b, 0) / vals.length);
		}
		if (avgs.size === 0) return null;
		const [name, avg] = [...avgs.entries()].sort((a, b) => b[1] - a[1])[0];
		return { name, avg };
	});

	function roundLabel(r: number) { return r === 0 ? 'Pre' : `R${r}`; }
	function toggleRound(r: number) {
		const s = new Set(selectedRounds);
		if (s.has(r)) s.delete(r); else s.add(r);
		selectedRounds = s;
	}
	function togglePlayer(p: string, v: boolean) {
		const s = new Set(selectedPlayers);
		if (v) s.add(p); else s.delete(p);
		selectedPlayers = s;
	}

	// ── Overview ──────────────────────────────────────────────────────────────
	function jumpToStat(statKey: StatKey, players?: string[]) {
		selectedStat = statKey;
		if (players && players.length > 0) {
			selectedPlayers = new Set(players);
		}
		activeTab = 'matrix';
	}

	// ── Games tab ─────────────────────────────────────────────────────────────
	let selectedPlayerId = $state<number>(
		untrack(() => data.allPlayers[0]?.id ?? 0)
	);
	let gamesStatKey  = $state<StatKey>('disposals');
	let selectedGameMatchId = $state<number | null>(null);
	let gamesSortCol  = $state<string>('round');
	let gamesSortAsc  = $state(true);

	const selectedPlayerGames = $derived(
		(data.playerGames as Record<number, PlayerGameRow[]>)[selectedPlayerId] ?? []
	);

	const gamesStatLabel = $derived(STAT_COLS.find(c => c.key === gamesStatKey)?.label ?? gamesStatKey);

	const playerSeasonAvg = $derived.by(() => {
		const games = selectedPlayerGames;
		if (games.length === 0) return 0;
		const vals = games.map(g => (g as Record<string, unknown>)[gamesStatKey] as number ?? 0);
		return vals.reduce((a, b) => a + b, 0) / vals.length;
	});

	const chartGames = $derived([...selectedPlayerGames].sort((a, b) => a.round - b.round));

	const filteredSortedGames = $derived.by(() => {
		return [...selectedPlayerGames].sort((a, b) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const ga = a as any, gb = b as any;
			let av: any, bv: any;
			if (gamesSortCol === 'delta') {
				av = (ga[gamesStatKey] ?? 0) - playerSeasonAvg;
				bv = (gb[gamesStatKey] ?? 0) - playerSeasonAvg;
			} else {
				av = ga[gamesSortCol];
				bv = gb[gamesSortCol];
			}
			if (av == null) av = gamesSortAsc ? Infinity : -Infinity;
			if (bv == null) bv = gamesSortAsc ? Infinity : -Infinity;
			const r = av < bv ? -1 : av > bv ? 1 : 0;
			return gamesSortAsc ? r : -r;
		});
	});

	function setGamesSortCol(col: string) {
		if (gamesSortCol === col) gamesSortAsc = !gamesSortAsc;
		else { gamesSortCol = col; gamesSortAsc = col === 'round'; }
	}

	// ── Insights tab ──────────────────────────────────────────────────────────
	type AdvKey = 'disposalEfficiencyPct' | 'contestedPossessions' | 'uncontestedPossessions' | 'effectiveDisposals' | 'metresGained' | 'scoreInvolvements';
	const insightsCols: { key: AdvKey; label: string }[] = [
		{ key: 'disposalEfficiencyPct',  label: 'Disp Eff %'      },
		{ key: 'contestedPossessions',   label: 'Contested Poss'  },
		{ key: 'uncontestedPossessions', label: 'Uncont. Poss'    },
		{ key: 'effectiveDisposals',     label: 'Eff. Disposals'  },
		{ key: 'metresGained',           label: 'Metres Gained'   },
		{ key: 'scoreInvolvements',      label: 'Score Involvem.' },
	];
	let insightsSortCol = $state<AdvKey>('disposalEfficiencyPct');
	let insightsSortAsc = $state(false);
	let comparePlayerA  = $state('');
	let comparePlayerB  = $state('');

	const insightsAvgs = $derived.by(() => {
		const map = new Map<string, Record<AdvKey, number>>();
		const cnt = new Map<string, number>();
		for (const row of data.advRows) {
			const p = row.playerName;
			if (!map.has(p)) {
				map.set(p, { disposalEfficiencyPct: 0, contestedPossessions: 0, uncontestedPossessions: 0, effectiveDisposals: 0, metresGained: 0, scoreInvolvements: 0 });
				cnt.set(p, 0);
			}
			cnt.set(p, (cnt.get(p) ?? 0) + 1);
			for (const col of insightsCols) {
				map.get(p)![col.key] += (row as Record<string, unknown>)[col.key] as number ?? 0;
			}
		}
		for (const [p, entry] of map) {
			const c = cnt.get(p) ?? 1;
			for (const col of insightsCols) entry[col.key] = c > 0 ? entry[col.key] / c : 0;
		}
		return map;
	});

	const sortedInsightsPlayers = $derived(
		[...insightsAvgs.entries()]
			.map(([name, avgs]) => ({ name, ...avgs }))
			.sort((a, b) => {
				const av = a[insightsSortCol] ?? 0;
				const bv = b[insightsSortCol] ?? 0;
				return insightsSortAsc ? av - bv : bv - av;
			})
	);

	function setInsightsSortCol(col: AdvKey) {
		if (insightsSortCol === col) insightsSortAsc = !insightsSortAsc;
		else { insightsSortCol = col; insightsSortAsc = false; }
	}

	const allInsightsPlayers = $derived([...insightsAvgs.keys()].sort());
	const compareDataA = $derived(comparePlayerA ? insightsAvgs.get(comparePlayerA) : null);
	const compareDataB = $derived(comparePlayerB ? insightsAvgs.get(comparePlayerB) : null);
</script>

<div class="page">

	<!-- ── Toolbar ──────────────────────────────────────────────────────────── -->
	<div class="toolbar">
		<div class="toolbar-left">
			<h1 class="page-title">player stats</h1>
			<span class="page-sub">{data.selectedYear}</span>
		</div>
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
	</div>

	<!-- ── Tab nav ──────────────────────────────────────────────────────────── -->
	<nav class="tab-nav">
		{#each (['overview', 'matrix', 'games', 'insights'] as const) as tab}
			<button
				class="tab-btn"
				class:tab-active={activeTab === tab}
				onclick={() => activeTab = tab}
			>{tab}</button>
		{/each}
	</nav>

	<!-- ══════════════════════════════════════════════════════════════════════
	     OVERVIEW
	══════════════════════════════════════════════════════════════════════════ -->
	{#if activeTab === 'overview'}
		{#if data.rows.length === 0}
			<div class="empty-state">
				<p class="empty-title">no data for {data.selectedYear}</p>
				<p class="empty-sub">scrape some rounds on the matches &amp; stats page first</p>
			</div>
		{:else}
			<!-- Season leaders bar -->
			<div class="leader-bar">
				{#each data.leaderboards as lb}
					{@const top = lb.top5[0]}
					{#if top}
						<button class="leader-chip" onclick={() => jumpToStat(lb.stat as StatKey, lb.top5.map(e => e.playerName))}>
							<span class="leader-chip-label">{lb.label}</span>
							<span class="leader-chip-sep">·</span>
							<span class="leader-chip-name">{top.playerName}</span>
							<span class="leader-chip-val">{top.avg.toFixed(1)}</span>
						</button>
					{/if}
				{/each}
			</div>

			<!-- Stat leaderboards -->
			<p class="section-label">stat leaders</p>
			<div class="leaderboard-scroll">
				{#each data.leaderboards as lb}
					<div class="lb-card" role="button" tabindex="0" onclick={() => jumpToStat(lb.stat as StatKey, lb.top5.map(e => e.playerName))} onkeydown={(e) => { if (e.key === 'Enter') jumpToStat(lb.stat as StatKey, lb.top5.map(e => e.playerName)); }}>
						<p class="lb-card-title">{lb.label}</p>
						{#each lb.top5 as entry, i}
							<div class="lb-row">
								<span class="lb-rank" class:lb-rank-1={i === 0}>{i + 1}</span>
								<span class="lb-name">{entry.playerName}</span>
								<span class="lb-avg">{entry.avg.toFixed(1)}</span>
							</div>
						{/each}
					</div>
				{/each}
			</div>

			<!-- Streaks / form highlights -->
			<p class="section-label">form highlights</p>
			<div class="streaks-grid">
				{#each data.streaks as streak}
					<div class="streak-card">
						<div class="streak-body">
							<p class="streak-name">{streak.playerName}</p>
							<p class="streak-value">{streak.value}</p>
							<p class="streak-label">{streak.label}</p>
						</div>
					</div>
				{/each}
				{#if data.streaks.length === 0}
					<p class="no-streaks">not enough data to compute highlights</p>
				{/if}
			</div>
		{/if}

	<!-- ══════════════════════════════════════════════════════════════════════
	     MATRIX
	══════════════════════════════════════════════════════════════════════════ -->
	{:else if activeTab === 'matrix'}
		{#if data.rows.length === 0}
			<div class="empty-state">
				<p class="empty-title">no data for {data.selectedYear}</p>
				<p class="empty-sub">scrape some rounds on the matches &amp; stats page first</p>
			</div>
		{:else}
			<!-- Season leader bar -->
			{#if seasonLeader}
				<div class="matrix-leader-bar">
					season leader
					<span class="mlb-sep">·</span>
					<strong class="mlb-name">{seasonLeader.name}</strong>
					<span class="mlb-sep">·</span>
					{seasonLeader.avg.toFixed(1)} avg
					<span class="mlb-sep">·</span>
					{selectedStatLabel}
				</div>
			{/if}

			<!-- Matrix controls -->
			<div class="matrix-controls">
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

				<!-- Avg toggle -->
				<Button
					variant={showAvg ? 'default' : 'outline'}
					size="sm"
					onclick={() => showAvg = !showAvg}
				>avg</Button>
			</div>

			<!-- Round chips -->
			<div class="round-chips-panel">
				<div class="round-chips-header">
					<span class="round-chips-label">rounds</span>
					<div class="round-chips-actions">
						<button class="rca-btn" onclick={() => selectedRounds = new Set(allRounds)}>all</button>
						<button class="rca-btn" onclick={() => selectedRounds = new Set()}>clear</button>
					</div>
				</div>
				<div class="round-chips-grid">
					{#each allRounds as r (r)}
						<button
							class="round-chip"
							class:round-chip-on={selectedRounds.has(r)}
							onclick={() => toggleRound(r)}
						>{roundLabel(r)}</button>
					{/each}
				</div>
			</div>

			<!-- Empty / table -->
			{#if visiblePlayers.length === 0 || visibleRounds.length === 0}
				<div class="empty-state">
					<p class="empty-title">nothing to display</p>
					<p class="empty-sub">select at least one player and one round using the filters above</p>
				</div>
			{:else}
				<div class="table-wrap">
					<table class="matrix">
						<thead>
							<tr>
								<th class="col-player col-head">player</th>
								{#each visibleRounds as r (r)}
									<th class="col-round col-head">{roundLabel(r)}</th>
								{/each}
								{#if showAvg}
									<th
										class="col-avg col-head col-head-avg"
										class:col-head-sort={sortByAvgDesc}
										role="button" tabindex="0"
										onclick={() => sortByAvgDesc = !sortByAvgDesc}
										onkeydown={(e) => { if (e.key === 'Enter') sortByAvgDesc = !sortByAvgDesc; }}
									>avg {sortByAvgDesc ? '▼' : ''}</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each sortedVisiblePlayers as p (p)}
								{@const pm = lookup.get(p)}
								<tr>
									<td class="col-player cell-name">{p}</td>
									{#each visibleRounds as r (r)}
										{@const val = pm?.get(r)}
										<td class="col-round cell-val" style={heatStyle(val, r)}>{val !== undefined ? val : '–'}</td>
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
					{visiblePlayers.length} players × {visibleRounds.length} rounds
					<span class="footer-sep">·</span>
					{selectedStatLabel}
				</p>
			{/if}
		{/if}

	<!-- ══════════════════════════════════════════════════════════════════════
	     GAMES
	══════════════════════════════════════════════════════════════════════════ -->
	{:else if activeTab === 'games'}
		{#if data.allPlayers.length === 0}
			<div class="empty-state">
				<p class="empty-title">no data for {data.selectedYear}</p>
				<p class="empty-sub">scrape some rounds on the matches &amp; stats page first</p>
			</div>
		{:else}
			<!-- Selectors -->
			<div class="games-selectors">
				<Select.Root
					type="single"
					value={String(selectedPlayerId)}
					onValueChange={(v) => { if (v) { selectedPlayerId = Number(v); selectedGameMatchId = null; } }}
				>
					<Select.Trigger class="w-56">
						{data.allPlayers.find(p => p.id === selectedPlayerId)?.name ?? 'select player'}
					</Select.Trigger>
					<Select.Content>
						{#each data.allPlayers as p (p.id)}
							<Select.Item value={String(p.id)} label={p.name}>{p.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				<Select.Root
					type="single"
					value={gamesStatKey}
					onValueChange={(v) => { if (v) { gamesStatKey = v as StatKey; selectedGameMatchId = null; } }}
				>
					<Select.Trigger class="w-48">{gamesStatLabel}</Select.Trigger>
					<Select.Content>
						{#each STAT_COLS as col (col.key)}
							<Select.Item value={col.key} label={col.label}>{col.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			{#if selectedPlayerGames.length === 0}
				<div class="empty-state">
					<p class="empty-title">no games found for this player</p>
					<p class="empty-sub">try selecting a different player or year</p>
				</div>
			{:else}
				<!-- Avg summary -->
				<div class="games-avg-bar">
					<span class="gab-player">{data.allPlayers.find(p => p.id === selectedPlayerId)?.name}</span>
					<span class="gab-sep">·</span>
					<span class="gab-stat">{gamesStatLabel}</span>
					<span class="gab-sep">·</span>
					<strong class="gab-avg">{playerSeasonAvg.toFixed(1)}</strong>
					<span class="gab-unit">season avg</span>
					<span class="gab-sep">·</span>
					<span class="gab-games">{selectedPlayerGames.length} games</span>
				</div>

				<!-- Bar chart (stat vs season avg as baseline) -->
				{#if chartGames.length > 0}
					{@const BW = 18}
					{@const GAP = 5}
					{@const HALF = 68}
					{@const TH = HALF * 2 + 22}
					{@const W = Math.max(1, chartGames.length * (BW + GAP) - GAP)}
					{@const maxDelta = Math.max(1, ...chartGames.map(g => Math.abs(((g as Record<string,unknown>)[gamesStatKey] as number ?? 0) - playerSeasonAvg)))}
					<div class="chart-wrap">
						<p class="chart-label">{gamesStatLabel} per round — baseline = season avg {playerSeasonAvg.toFixed(1)}</p>
						<div class="chart-scroll">
							<svg viewBox="0 0 {W} {TH}" class="chart-svg" style="min-width:{W}px">
								<!-- Baseline -->
								<line x1="0" y1={HALF} x2={W} y2={HALF} stroke="var(--border)" stroke-width="1"/>
								{#each chartGames as g, i}
									{@const val = (g as Record<string,unknown>)[gamesStatKey] as number ?? 0}
									{@const delta = val - playerSeasonAvg}
									{@const bh = Math.max(2, (Math.abs(delta) / maxDelta) * HALF)}
									{@const bx = i * (BW + GAP)}
									{@const by = delta > 0 ? HALF - bh : HALF}
									{@const fill = delta > 0 ? 'oklch(0.52 0.14 145)' : delta < 0 ? 'var(--destructive)' : 'var(--muted-foreground)'}
									<rect
										x={bx} y={by} width={BW} height={bh} fill={fill} rx="2"
										opacity={selectedGameMatchId != null && selectedGameMatchId !== g.matchId ? 0.3 : 1}
										class="chart-bar"
										role="button" tabindex="0"
										onclick={() => { selectedGameMatchId = selectedGameMatchId === g.matchId ? null : g.matchId; }}
										onkeydown={(e) => { if (e.key === 'Enter') selectedGameMatchId = selectedGameMatchId === g.matchId ? null : g.matchId; }}
									/>
									{#if chartGames.length <= 30}
										<text x={bx + BW / 2} y={TH - 3} text-anchor="middle" font-size="7" fill="var(--muted-foreground)" font-family="inherit">{roundLabel(g.round)}</text>
									{/if}
								{/each}
							</svg>
						</div>
					</div>
				{/if}

				<!-- Games table -->
				<div class="table-wrap">
					<table class="games-table">
						<thead>
							<tr>
								{#each [
									{ col: 'round',        label: 'Rd'       },
									{ col: 'date',         label: 'Date'     },
									{ col: 'opponentName', label: 'Opponent' },
									{ col: 'isHome',       label: 'H/A'      },
									{ col: gamesStatKey,   label: gamesStatLabel },
									{ col: 'delta',        label: 'vs avg'   },
									{ col: 'result',       label: 'Result'   },
								] as h}
									<th
										class="th"
										class:th-active={gamesSortCol === h.col}
										onclick={() => setGamesSortCol(h.col)}
										role="button" tabindex="0"
										onkeydown={(e) => { if (e.key === 'Enter') setGamesSortCol(h.col); }}
									>
										{h.label}
										{#if gamesSortCol === h.col}
											<span class="sort-arrow">{gamesSortAsc ? '↑' : '↓'}</span>
										{/if}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each filteredSortedGames as g (g.matchId)}
								{@const val = (g as Record<string,unknown>)[gamesStatKey] as number ?? 0}
								{@const delta = val - playerSeasonAvg}
								<tr
									class="game-row"
									class:game-row-active={selectedGameMatchId === g.matchId}
									onclick={() => { selectedGameMatchId = selectedGameMatchId === g.matchId ? null : g.matchId; }}
								>
									<td class="td td-num">{roundLabel(g.round)}</td>
									<td class="td">{g.date}</td>
									<td class="td td-opp">{g.opponentShort}</td>
									<td class="td td-centre">{g.isHome ? 'H' : 'A'}</td>
									<td class="td td-num">{val}</td>
									<td class="td td-num" class:margin-pos={delta > 0} class:margin-neg={delta < 0}>
										{delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
									</td>
									<td class="td td-centre">
										{#if g.result}
											<span class="result-chip result-{g.result.toLowerCase()}">{g.result}</span>
										{:else}–{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/if}

	<!-- ══════════════════════════════════════════════════════════════════════
	     INSIGHTS
	══════════════════════════════════════════════════════════════════════════ -->
	{:else if activeTab === 'insights'}
		{#if data.advRows.length === 0}
			<div class="empty-state">
				<p class="empty-title">no advanced stats for {data.selectedYear}</p>
				<p class="empty-sub">scrape rounds with advanced stats on the matches &amp; stats page first</p>
			</div>
		{:else}
			<!-- Advanced stats table -->
			<p class="section-label">advanced stats — season averages</p>
			<div class="table-wrap">
				<table class="games-table">
					<thead>
						<tr>
							<th class="th th-player">Player</th>
							{#each insightsCols as col}
								<th
									class="th"
									class:th-active={insightsSortCol === col.key}
									onclick={() => setInsightsSortCol(col.key)}
									role="button" tabindex="0"
									onkeydown={(e) => { if (e.key === 'Enter') setInsightsSortCol(col.key); }}
								>
									{col.label}
									{#if insightsSortCol === col.key}
										<span class="sort-arrow">{insightsSortAsc ? '↑' : '↓'}</span>
									{/if}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each sortedInsightsPlayers as p}
							<tr class="game-row">
								<td class="td td-opp">{p.name}</td>
								{#each insightsCols as col}
									<td class="td td-num">{p[col.key].toFixed(1)}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Player comparison -->
			<p class="section-label" style="margin-top:2rem">player comparison</p>
			<div class="compare-selectors">
				<Select.Root type="single" value={comparePlayerA} onValueChange={(v) => { if (v) comparePlayerA = v; }}>
					<Select.Trigger class="w-48">{comparePlayerA || 'player A'}</Select.Trigger>
					<Select.Content>
						{#each allInsightsPlayers as p}
							<Select.Item value={p} label={p}>{p}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<span class="cmp-vs">vs</span>
				<Select.Root type="single" value={comparePlayerB} onValueChange={(v) => { if (v) comparePlayerB = v; }}>
					<Select.Trigger class="w-48">{comparePlayerB || 'player B'}</Select.Trigger>
					<Select.Content>
						{#each allInsightsPlayers as p}
							<Select.Item value={p} label={p}>{p}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			{#if compareDataA && compareDataB && comparePlayerA && comparePlayerB}
				<div class="compare-card">
					<div class="compare-header">
						<span>{comparePlayerA.split(' ').at(-1)}</span>
						<span class="cmp-center-label">advanced stat comparison</span>
						<span>{comparePlayerB.split(' ').at(-1)}</span>
					</div>
					{#each insightsCols as col}
						{@const av = compareDataA[col.key]}
						{@const bv = compareDataB[col.key]}
						{@const total = av + bv}
						{@const aRatio = total > 0 ? (av / total) * 100 : 50}
						<div class="cmp-row">
							<span class="cmp-val" class:cmp-leading={av > bv}>{av.toFixed(1)}</span>
							<div class="cmp-center">
								<span class="cmp-label">{col.label}</span>
								<div class="cmp-bar-track">
									<div class="cmp-bar-fill" style="width:{aRatio.toFixed(1)}%"></div>
								</div>
							</div>
							<span class="cmp-val cmp-val-right" class:cmp-leading={bv > av}>{bv.toFixed(1)}</span>
						</div>
					{/each}
				</div>
			{:else}
				<div class="compare-placeholder">
					<p>select two players above to compare their advanced stats</p>
				</div>
			{/if}
		{/if}
	{/if}

</div>

<style>
	/* ── Page ──────────────────────────────────────────────────────────────── */
	.page {
		max-width: 72rem;
		margin: 0 auto;
		padding: 1.5rem 1.5rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* ── Toolbar ────────────────────────────────────────────────────────────── */
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.toolbar-left  { display: flex; align-items: baseline; gap: 0.625rem; }
	.page-title    { font-size: 1.125rem; font-weight: 600; color: var(--foreground); letter-spacing: -0.02em; }
	.page-sub      { font-size: 0.75rem; color: var(--muted-foreground); letter-spacing: 0.03em; }

	/* ── Tabs ───────────────────────────────────────────────────────────────── */
	.tab-nav  { display: flex; gap: 0; border-bottom: 1px solid var(--border); }
	.tab-btn  {
		font-size: 0.8125rem; font-family: inherit; background: none; border: none;
		border-bottom: 2px solid transparent; padding: 0.625rem 1rem; cursor: pointer;
		color: var(--muted-foreground); transition: color 0.12s, border-color 0.12s;
		margin-bottom: -1px; letter-spacing: 0.01em;
	}
	.tab-btn:hover  { color: var(--foreground); }
	.tab-active     { color: var(--foreground); border-bottom-color: var(--primary); font-weight: 600; }

	/* ── Empty state ────────────────────────────────────────────────────────── */
	.empty-state {
		display: flex; flex-direction: column; align-items: center; justify-content: center;
		gap: 0.375rem; padding: 4rem 2rem; border: 1px dashed var(--border);
		border-radius: 0.75rem; text-align: center;
	}
	.empty-title { font-size: 0.9375rem; font-weight: 600; color: var(--foreground); }
	.empty-sub   { font-size: 0.8125rem; color: var(--muted-foreground); }

	/* ── Section labels ─────────────────────────────────────────────────────── */
	.section-label {
		font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--muted-foreground); font-weight: 600;
	}

	/* ── Overview: leader bar ───────────────────────────────────────────────── */
	.leader-bar {
		display: flex; gap: 0.375rem; flex-wrap: wrap;
		padding: 0.75rem 1rem;
		border: 1px solid var(--border); border-radius: 0.625rem;
		background-color: color-mix(in oklch, var(--muted), transparent 55%);
	}
	.leader-chip {
		display: flex; align-items: center; gap: 0.35rem;
		padding: 0.25rem 0.625rem; border-radius: 0.375rem;
		border: 1px solid var(--border); background: var(--card);
		cursor: pointer; font-family: inherit; font-size: 0.75rem;
		transition: border-color 0.12s, background-color 0.12s;
	}
	.leader-chip:hover { border-color: var(--foreground); background-color: var(--accent); }
	.leader-chip-label { color: var(--muted-foreground); font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.04em; }
	.leader-chip-sep   { color: var(--muted-foreground); opacity: 0.4; }
	.leader-chip-name  { color: var(--foreground); font-weight: 500; }
	.leader-chip-val   { color: var(--muted-foreground); font-variant-numeric: tabular-nums; }

	/* ── Overview: leaderboard cards ────────────────────────────────────────── */
	.leaderboard-scroll {
		display: flex; gap: 0.75rem; overflow-x: auto;
		padding-bottom: 0.25rem;
	}
	.lb-card {
		flex-shrink: 0; min-width: 13rem;
		border: 1px solid var(--border); border-radius: 0.625rem;
		background-color: var(--card); overflow: hidden;
		cursor: pointer; transition: border-color 0.12s;
		animation: rise 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	.lb-card:hover { border-color: var(--foreground); }
	.lb-card-title {
		font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--muted-foreground);
		padding: 0.625rem 0.875rem 0.5rem;
		border-bottom: 1px solid var(--border);
		background-color: color-mix(in oklch, var(--muted), transparent 55%);
	}
	.lb-row {
		display: flex; align-items: center; gap: 0.5rem;
		padding: 0.45rem 0.875rem;
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 50%);
		font-size: 0.8125rem;
	}
	.lb-row:last-child { border-bottom: none; }
	.lb-rank {
		font-size: 0.6875rem; font-weight: 700; color: var(--muted-foreground);
		width: 1rem; flex-shrink: 0; text-align: center;
	}
	.lb-rank-1 { color: oklch(0.52 0.14 145); }
	.lb-name   { flex: 1; color: var(--foreground); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.lb-avg    { color: var(--muted-foreground); font-variant-numeric: tabular-nums; font-size: 0.75rem; }

	/* ── Overview: streaks ──────────────────────────────────────────────────── */
	.streaks-grid {
		display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 0.75rem;
	}
	.streak-card {
		display: flex; align-items: flex-start;
		padding: 1rem 1.25rem;
		border: 1px solid var(--border); border-radius: 0.625rem;
		background-color: var(--card);
		animation: rise 0.35s 0.05s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	.streak-body  { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; width: 100%; }
	.streak-name  { font-size: 0.875rem; font-weight: 600; color: var(--foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.streak-value { font-size: 1.5rem; font-weight: 800; color: var(--foreground); letter-spacing: -0.03em; line-height: 1.1; font-variant-numeric: tabular-nums; }
	.streak-label { font-size: 0.75rem; color: var(--muted-foreground); }
	.no-streaks   { font-size: 0.8125rem; color: var(--muted-foreground); }

	@keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

	/* ── Matrix: leader bar ─────────────────────────────────────────────────── */
	.matrix-leader-bar {
		font-size: 0.8125rem; color: var(--muted-foreground);
		padding: 0.5rem 0.875rem;
		border: 1px solid var(--border); border-radius: 0.5rem;
		background-color: color-mix(in oklch, var(--muted), transparent 60%);
	}
	.mlb-sep  { margin: 0 0.25rem; opacity: 0.4; }
	.mlb-name { color: var(--foreground); font-weight: 600; }

	/* ── Matrix: controls ───────────────────────────────────────────────────── */
	.matrix-controls {
		display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
	}
	:global(.select-group-label) {
		font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
		letter-spacing: 0.06em; color: var(--muted-foreground);
		padding: 0.375rem 0.75rem 0.125rem;
	}

	/* ── Matrix: round chips ────────────────────────────────────────────────── */
	.round-chips-panel {
		border: 1px solid var(--border); border-radius: 0.625rem;
		padding: 0.75rem 0.875rem;
		background-color: color-mix(in oklch, var(--muted), transparent 65%);
	}
	.round-chips-header {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: 0.625rem;
	}
	.round-chips-label {
		font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
		letter-spacing: 0.06em; color: var(--muted-foreground);
	}
	.round-chips-actions { display: flex; gap: 0.25rem; }
	.rca-btn {
		font-size: 0.6875rem; font-family: inherit; background: none;
		border: 1px solid var(--border); border-radius: 0.3rem;
		padding: 0.15rem 0.5rem; cursor: pointer; color: var(--muted-foreground);
		transition: color 0.1s, border-color 0.1s;
	}
	.rca-btn:hover { color: var(--foreground); border-color: var(--foreground); }

	.round-chips-grid {
		display: flex; flex-wrap: wrap; gap: 0.375rem;
	}
	.round-chip {
		font-size: 0.6875rem; font-family: inherit;
		padding: 0.2rem 0.5rem; border-radius: 0.3rem;
		border: 1px solid var(--border);
		background: var(--card); color: var(--muted-foreground);
		cursor: pointer; transition: all 0.1s ease;
	}
	.round-chip:hover { border-color: var(--foreground); color: var(--foreground); }
	.round-chip-on {
		background-color: var(--foreground);
		color: var(--background);
		border-color: var(--foreground);
		font-weight: 600;
	}

	/* ── Matrix: filter dropdown internals ──────────────────────────────────── */
	.filter-count {
		margin-left: 0.25rem; font-size: 0.6875rem; color: var(--muted-foreground);
		background-color: var(--secondary); border: 1px solid var(--border);
		border-radius: 0.3rem; padding: 0 0.3rem;
	}
	:global(.filter-search-wrap) { border-bottom: 1px solid var(--border); padding: 0.375rem 0.5rem; }
	.filter-search-wrap { border-bottom: 1px solid var(--border); padding: 0.375rem 0.5rem; }
	.filter-search {
		width: 100%; background: transparent; border: none; outline: none;
		font-size: 0.75rem; font-family: inherit; color: var(--foreground);
	}
	.filter-search::placeholder { color: var(--muted-foreground); }
	.filter-actions {
		display: flex; gap: 0.25rem;
		border-bottom: 1px solid var(--border); padding: 0.25rem 0.5rem;
	}
	.filter-action-btn {
		flex: 1; background: none; border: none; cursor: pointer;
		font-size: 0.75rem; font-family: inherit; color: var(--muted-foreground);
		border-radius: 0.25rem; padding: 0.2rem 0.375rem;
		transition: background-color 0.12s, color 0.12s;
	}
	.filter-action-btn:hover { background-color: var(--accent); color: var(--accent-foreground); }
	.filter-empty { padding: 0.5rem 0.75rem; font-size: 0.75rem; color: var(--muted-foreground); }

	/* ── Matrix: pivot table ────────────────────────────────────────────────── */
	.table-wrap  { overflow-x: auto; border: 1px solid var(--border); border-radius: 0.625rem; }
	.matrix      { border-collapse: collapse; font-size: 0.75rem; width: 100%; }
	.col-player  { text-align: left; white-space: nowrap; padding: 0.375rem 1rem 0.375rem 1.25rem; position: sticky; left: 0; z-index: 2; }
	.col-round   { text-align: center; white-space: nowrap; padding: 0.375rem 0.5rem; min-width: 2.75rem; }
	.col-avg     { text-align: center; white-space: nowrap; padding: 0.375rem 0.875rem; min-width: 3.5rem; }
	thead tr     { border-bottom: 1px solid var(--border); background-color: color-mix(in oklch, var(--muted), transparent 55%); }
	.col-head    { font-weight: 600; color: var(--muted-foreground); background-color: color-mix(in oklch, var(--muted), transparent 55%); }
	.col-head-avg {
		color: var(--foreground); background-color: color-mix(in oklch, var(--muted), transparent 35%);
		border-left: 1px solid var(--border);
	}
	.col-head-sort { cursor: pointer; }
	.col-head-sort:hover { color: var(--foreground); }
	tbody tr     { border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 45%); transition: background-color 0.1s; }
	tbody tr:last-child { border-bottom: none; }
	tbody tr:hover .col-player,
	tbody tr:hover .col-round,
	tbody tr:hover .col-avg { background-color: color-mix(in oklch, var(--accent), transparent 80%); }
	.cell-name  { font-weight: 500; color: var(--foreground); background-color: var(--card); }
	.cell-val   { color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
	.cell-avg   {
		font-weight: 600; color: var(--foreground); font-variant-numeric: tabular-nums;
		background-color: color-mix(in oklch, var(--muted), transparent 70%);
		border-left: 1px solid var(--border);
	}
	.table-footer {
		font-size: 0.75rem; color: var(--muted-foreground);
		text-align: right; letter-spacing: 0.01em;
	}
	.footer-sep { margin: 0 0.25rem; opacity: 0.5; }

	/* ── Games tab ──────────────────────────────────────────────────────────── */
	.games-selectors {
		display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
	}
	.games-avg-bar {
		display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap;
		font-size: 0.8125rem;
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--border); border-radius: 0.5rem;
		background-color: color-mix(in oklch, var(--muted), transparent 60%);
	}
	.gab-player { font-weight: 600; color: var(--foreground); }
	.gab-stat   { color: var(--muted-foreground); }
	.gab-sep    { color: var(--muted-foreground); opacity: 0.4; }
	.gab-avg    { font-size: 1rem; color: var(--foreground); font-variant-numeric: tabular-nums; }
	.gab-unit   { color: var(--muted-foreground); font-size: 0.75rem; }
	.gab-games  { color: var(--muted-foreground); font-size: 0.75rem; }

	/* ── Chart ──────────────────────────────────────────────────────────────── */
	.chart-wrap   { display: flex; flex-direction: column; gap: 0.5rem; }
	.chart-label  { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); }
	.chart-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 0.625rem; padding: 0.75rem 1rem; background-color: var(--card); }
	.chart-svg    { display: block; height: 160px; }
	.chart-bar    { cursor: pointer; transition: opacity 0.12s ease; }
	.chart-bar:hover { opacity: 0.75 !important; }

	/* ── Games table ─────────────────────────────────────────────────────────── */
	.games-table  { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
	.th {
		padding: 0.5rem 0.875rem; text-align: left; font-weight: 600; font-size: 0.75rem;
		color: var(--muted-foreground); background-color: color-mix(in oklch, var(--muted), transparent 55%);
		border-bottom: 1px solid var(--border); cursor: pointer; white-space: nowrap;
		user-select: none; transition: color 0.1s;
	}
	.th:hover    { color: var(--foreground); }
	.th-active   { color: var(--foreground); }
	.th-player   { min-width: 10rem; }
	.sort-arrow  { margin-left: 0.25rem; font-size: 0.6875rem; color: var(--primary); }

	.game-row         { border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 45%); cursor: pointer; transition: background-color 0.1s; }
	.game-row:last-child { border-bottom: none; }
	.game-row:hover   { background-color: color-mix(in oklch, var(--accent), transparent 85%); }
	.game-row-active  { background-color: color-mix(in oklch, var(--primary), transparent 92%) !important; }
	.td               { padding: 0.5rem 0.875rem; color: var(--muted-foreground); white-space: nowrap; }
	.td-num           { text-align: right; font-variant-numeric: tabular-nums; }
	.td-centre        { text-align: center; }
	.td-opp           { font-weight: 500; color: var(--foreground); }
	.margin-pos       { color: oklch(0.52 0.14 145); font-weight: 600; }
	.margin-neg       { color: var(--destructive); font-weight: 600; }
	.result-chip      { font-size: 0.6875rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 0.25rem; }
	.result-w         { background-color: oklch(0.52 0.14 145 / 0.18); color: oklch(0.52 0.14 145); }
	.result-l         { background-color: color-mix(in oklch, var(--destructive), transparent 82%); color: var(--destructive); }
	.result-d         { background-color: var(--secondary); color: var(--muted-foreground); }

	/* ── Insights ───────────────────────────────────────────────────────────── */
	.compare-selectors {
		display: flex; align-items: center; gap: 0.875rem; flex-wrap: wrap;
		padding: 1rem 1.25rem;
		border: 1px solid var(--border); border-radius: 0.625rem;
		background-color: var(--card);
	}
	.cmp-vs { font-size: 0.875rem; color: var(--muted-foreground); flex-shrink: 0; }

	.compare-card { border: 1px solid var(--border); border-radius: 0.75rem; background-color: var(--card); overflow: hidden; }
	.compare-header {
		display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem;
		padding: 0.75rem 1.25rem;
		background-color: color-mix(in oklch, var(--muted), transparent 55%);
		border-bottom: 1px solid var(--border);
		font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground);
	}
	.compare-header span:last-child { text-align: right; }
	.cmp-center-label { text-align: center; font-weight: 400; font-size: 0.625rem; color: var(--muted-foreground); opacity: 0.7; }
	.cmp-row {
		display: grid; grid-template-columns: 4rem 1fr 4rem; align-items: center; gap: 0.75rem;
		padding: 0.625rem 1.25rem;
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 45%);
	}
	.cmp-row:last-child { border-bottom: none; }
	.cmp-val           { font-size: 1rem; font-weight: 600; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
	.cmp-val-right     { text-align: right; }
	.cmp-leading       { color: var(--foreground); }
	.cmp-center        { display: flex; flex-direction: column; gap: 0.25rem; align-items: center; }
	.cmp-label         { font-size: 0.75rem; color: var(--muted-foreground); text-align: center; }
	.cmp-bar-track     { width: 100%; height: 4px; border-radius: 2px; background-color: color-mix(in oklch, var(--destructive), transparent 75%); overflow: hidden; }
	.cmp-bar-fill      { height: 100%; border-radius: 2px; background-color: oklch(0.52 0.14 145 / 0.85); transition: width 0.3s ease; }

	.compare-placeholder {
		padding: 2.5rem; text-align: center;
		border: 1px dashed var(--border); border-radius: 0.625rem;
		font-size: 0.8125rem; color: var(--muted-foreground);
	}
</style>
