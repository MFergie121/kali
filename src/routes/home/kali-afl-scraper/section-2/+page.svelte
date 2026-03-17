<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';
	import type { TeamGameRow, TeamSummary, GameDetail } from './+page.server';

	let { data }: { data: PageData } = $props();

	// ── Global state ──────────────────────────────────────────────────────────
	let activeTab      = $state<'overview' | 'games' | 'h2h'>('overview');
	let compareMode    = $state(!!data.compareTeamId);
	let selectedMatchId = $state<number | null>(null);

	// ── Games tab state ───────────────────────────────────────────────────────
	let sortCol    = $state<string>('round');
	let sortAsc    = $state(false);
	let resFilter  = $state<'all' | 'wins' | 'losses'>('all');
	let venFilter  = $state<'all' | 'home' | 'away'>('all');
	let oppSearch  = $state('');

	// ── Navigation helper ─────────────────────────────────────────────────────
	function nav(params: Record<string, string | null>) {
		const u = new URL(window.location.href);
		for (const [k, v] of Object.entries(params)) {
			if (v == null) u.searchParams.delete(k); else u.searchParams.set(k, v);
		}
		goto(u.toString());
	}

	// ── Toggle compare mode ───────────────────────────────────────────────────
	$effect(() => {
		if (compareMode) activeTab = 'h2h';
		else if (data.compareTeamId) nav({ compare: null });
	});

	// ── Derived: filtered + sorted games ─────────────────────────────────────
	const filteredGames = $derived.by(() => {
		let gs: TeamGameRow[] = [...data.teamGames];
		if (resFilter === 'wins')   gs = gs.filter(g => g.result === 'W');
		if (resFilter === 'losses') gs = gs.filter(g => g.result === 'L');
		if (venFilter === 'home')   gs = gs.filter(g => g.isHome);
		if (venFilter === 'away')   gs = gs.filter(g => !g.isHome);
		if (oppSearch.trim()) gs = gs.filter(g => g.opponentName.toLowerCase().includes(oppSearch.toLowerCase()));
		return gs.sort((a, b) => {
			let av = (a as any)[sortCol]; let bv = (b as any)[sortCol];
			if (av == null) av = sortAsc ?  Infinity : -Infinity;
			if (bv == null) bv = sortAsc ?  Infinity : -Infinity;
			const r = av < bv ? -1 : av > bv ? 1 : 0;
			return sortAsc ? r : -r;
		});
	});

	// ── Chart games (sorted asc by round for chronological bar chart) ─────────
	const chartGames = $derived(
		[...data.teamGames].filter(g => g.margin != null).sort((a, b) => a.round - b.round)
	);

	// ── Current game detail ───────────────────────────────────────────────────
	const drawerGame   = $derived(selectedMatchId != null ? (data.gameDetails as Record<number, GameDetail>)[selectedMatchId] : null);
	const drawerRow    = $derived(selectedMatchId != null ? data.teamGames.find(g => g.matchId === selectedMatchId) : null);
	const drawerTeam   = $derived(data.allTeams.find(t => t.id === data.selectedTeamId));

	// ── H2H derived stats ─────────────────────────────────────────────────────
	const h2hCompareStats = $derived.by(() => {
		const a = data.teamSummary as TeamSummary | null;
		const b = data.compareSummary as TeamSummary | null;
		if (!a || !b) return null;
		return [
			{ label: 'avg points for',     aVal: a.avgFor,     bVal: b.avgFor,     lowerBetter: false },
			{ label: 'avg points against', aVal: a.avgAgainst, bVal: b.avgAgainst, lowerBetter: true  },
			{ label: 'avg margin',         aVal: a.avgMargin,  bVal: b.avgMargin,  lowerBetter: false },
		];
	});
	const aLeads = $derived(
		h2hCompareStats?.filter(s => s.lowerBetter ? s.aVal < s.bVal : s.aVal > s.bVal).length ?? 0
	);

	// ── H2H historical record ─────────────────────────────────────────────────
	const h2hRecord = $derived.by(() => {
		const gs = (data.h2hGames as TeamGameRow[]).filter(g => g.result != null);
		return {
			wins:   gs.filter(g => g.result === 'W').length,
			losses: gs.filter(g => g.result === 'L').length,
			draws:  gs.filter(g => g.result === 'D').length,
			last5:  gs.slice(0, 5),
		};
	});

	function setSortCol(col: string) {
		if (sortCol === col) sortAsc = !sortAsc;
		else { sortCol = col; sortAsc = col === 'round'; }
	}

	const ST = [
		{ key: 'kicks', label: 'Kicks' }, { key: 'handballs', label: 'HB' },
		{ key: 'disposals', label: 'Disp' }, { key: 'marks', label: 'Marks' },
		{ key: 'goals', label: 'Goals' }, { key: 'behinds', label: 'Bhd' },
		{ key: 'tackles', label: 'Tkl' }, { key: 'hitouts', label: 'HO' },
		{ key: 'inside50s', label: 'I50' }, { key: 'clearances', label: 'CL' },
		{ key: 'clangers', label: 'CG' }, { key: 'rebound50s', label: 'R50' },
		{ key: 'freesFor', label: 'FF' }, { key: 'freesAgainst', label: 'FA' },
	] as const;
</script>

<!-- ═══ Root ═════════════════════════════════════════════════════════════════ -->
<div class="page">

	<!-- ── Sticky toolbar ─────────────────────────────────────────────────── -->
	<div class="toolbar">
		<div class="toolbar-left">
			<Select.Root
				type="single"
				value={data.selectedTeamId}
				onValueChange={(v) => { if (v) nav({ team: v, compare: null }); }}
			>
				<Select.Trigger class="w-52 font-medium">
					{data.allTeams.find(t => t.id === data.selectedTeamId)?.name ?? 'Select team'}
				</Select.Trigger>
				<Select.Content>
					{#each data.allTeams as t (t.id)}
						<Select.Item value={t.id} label={t.name}>{t.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<Select.Root
				type="single"
				value={String(data.selectedYear)}
				onValueChange={(v) => { if (v) nav({ year: v, compare: null }); }}
			>
				<Select.Trigger class="w-24">{data.selectedYear}</Select.Trigger>
				<Select.Content>
					{#each data.allYears as y (y)}
						<Select.Item value={String(y)} label={String(y)}>{y}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<button
			class="compare-toggle"
			class:compare-active={compareMode}
			onclick={() => { compareMode = !compareMode; }}
		>
			compare mode
		</button>
	</div>

	<!-- ── Tab nav ────────────────────────────────────────────────────────── -->
	<nav class="tab-nav">
		{#each (['overview', 'games', 'h2h'] as const) as tab}
			<button
				class="tab-btn"
				class:tab-active={activeTab === tab}
				onclick={() => activeTab = tab}
			>
				{tab === 'h2h' ? 'head-to-head' : tab}
			</button>
		{/each}
	</nav>

	<!-- ═══════════════════════════════════════════════════════════════════════
	     SECTION 1 — OVERVIEW
	══════════════════════════════════════════════════════════════════════════ -->
	{#if activeTab === 'overview'}
		{#if !data.teamSummary || data.teamGames.length === 0}
			<div class="empty-state">
				<p class="empty-title">no data for {data.allTeams.find(t => t.id === data.selectedTeamId)?.name ?? 'this team'}</p>
				<p class="empty-sub">scrape some rounds on the matches &amp; stats page first</p>
			</div>
		{:else}
			{@const s = data.teamSummary as TeamSummary}
			{@const team = data.allTeams.find(t => t.id === data.selectedTeamId)}

			<!-- Hero block -->
			<div class="hero-card">
				<div class="hero-left">
					<h2 class="hero-name">{team?.name}</h2>
					<div class="hero-record">
						<span class="record-chip record-w">{s.wins}W</span>
						<span class="record-chip record-l">{s.losses}L</span>
						{#if s.draws > 0}<span class="record-chip record-d">{s.draws}D</span>{/if}
					</div>
					<div class="hero-meta">
						<span class="meta-item">
							<span class="meta-label">ladder</span>
							<span class="meta-val">{s.ladderPos}<span class="meta-ord">{s.ladderPos === 1 ? 'st' : s.ladderPos === 2 ? 'nd' : s.ladderPos === 3 ? 'rd' : 'th'}</span></span>
						</span>
						<span class="meta-sep">·</span>
						<span class="meta-item">
							<span class="meta-label">pct</span>
							<span class="meta-val">{s.pct.toFixed(1)}%</span>
						</span>
						<span class="meta-sep">·</span>
						<span class="meta-item">
							<span class="meta-label">played</span>
							<span class="meta-val">{s.played}</span>
						</span>
					</div>
				</div>
				<div class="hero-right">
					<p class="form-label">form</p>
					<div class="form-guide">
						{#each [...s.form].reverse() as r}
							<span class="form-pill form-{r.toLowerCase()}">{r}</span>
						{/each}
					</div>
				</div>
			</div>

			<!-- Stat cards -->
			<div class="stat-cards">
				<div class="stat-card">
					<span class="stat-val">{s.avgFor.toFixed(1)}</span>
					<span class="stat-label">avg points for</span>
				</div>
				<div class="stat-card">
					<span class="stat-val">{s.avgAgainst.toFixed(1)}</span>
					<span class="stat-label">avg points against</span>
				</div>
				<div class="stat-card">
					<span class="stat-val stat-margin" class:positive={s.avgMargin >= 0}>
						{s.avgMargin >= 0 ? '+' : ''}{s.avgMargin.toFixed(1)}
					</span>
					<span class="stat-label">avg margin</span>
				</div>
			</div>
		{/if}

	<!-- ═══════════════════════════════════════════════════════════════════════
	     SECTION 2 — GAMES
	══════════════════════════════════════════════════════════════════════════ -->
	{:else if activeTab === 'games'}
		{#if data.teamGames.length === 0}
			<div class="empty-state">
				<p class="empty-title">no games scraped yet</p>
				<p class="empty-sub">head to the matches &amp; stats page to scrape some rounds</p>
			</div>
		{:else}
			<!-- Margin bar chart -->
			{#if chartGames.length > 0}
				{@const BW = 18}
				{@const GAP = 5}
				{@const HALF = 68}
				{@const TH = HALF * 2 + 22}
				{@const maxAbs = Math.max(1, ...chartGames.map(g => Math.abs(g.margin!)))}
				{@const W = chartGames.length * (BW + GAP) - GAP}
				<div class="chart-wrap">
					<p class="chart-label">margin by round</p>
					<div class="chart-scroll">
						<svg viewBox="0 0 {W} {TH}" class="chart-svg" style="min-width: {W}px">
							<line x1="0" y1={HALF} x2={W} y2={HALF} stroke="var(--border)" stroke-width="1"/>
							{#each chartGames as g, i}
								{@const bh = Math.max(2, (Math.abs(g.margin!) / maxAbs) * HALF)}
								{@const x = i * (BW + GAP)}
								{@const y = g.margin! > 0 ? HALF - bh : HALF}
								{@const fill = g.margin! > 0 ? 'oklch(0.52 0.14 145)' : g.margin! < 0 ? 'var(--destructive)' : 'var(--muted-foreground)'}
								<rect
									{x} {y} width={BW} height={bh} fill={fill} rx="2"
									opacity={selectedMatchId != null && selectedMatchId !== g.matchId ? 0.35 : 1}
									class="chart-bar"
									role="button" tabindex="0"
									onclick={() => { selectedMatchId = selectedMatchId === g.matchId ? null : g.matchId; }}
									onkeydown={(e) => { if (e.key === 'Enter') selectedMatchId = selectedMatchId === g.matchId ? null : g.matchId; }}
								/>
								{#if chartGames.length <= 30}
									<text x={x + BW / 2} y={TH - 3} text-anchor="middle" font-size="7" fill="var(--muted-foreground)" font-family="inherit">
										R{g.round}
									</text>
								{/if}
							{/each}
						</svg>
					</div>
				</div>
			{/if}

			<!-- Filters -->
			<div class="filters">
				<div class="filter-group">
					{#each (['all', 'home', 'away'] as const) as v}
						<button class="filter-pill" class:filter-on={venFilter === v} onclick={() => venFilter = v}>{v}</button>
					{/each}
				</div>
				<div class="filter-group">
					{#each (['all', 'wins', 'losses'] as const) as v}
						<button class="filter-pill" class:filter-on={resFilter === v} onclick={() => resFilter = v}>{v}</button>
					{/each}
				</div>
				<input type="text" class="opp-search" placeholder="search opponent…" bind:value={oppSearch} />
			</div>

			<!-- Games table -->
			<div class="table-wrap">
				<table class="games-table">
					<thead>
						<tr>
							{#each [
								{ col: 'round',       label: 'Rd'       },
								{ col: 'opponentName',label: 'Opponent' },
								{ col: 'venue',       label: 'Venue'    },
								{ col: 'isHome',      label: 'H/A'      },
								{ col: 'teamScore',   label: 'For'      },
								{ col: 'oppScore',    label: 'Opp'      },
								{ col: 'margin',      label: 'Margin'   },
								{ col: 'result',      label: 'Result'   },
							] as h}
								<th
									class="th"
									class:th-active={sortCol === h.col}
									onclick={() => setSortCol(h.col)}
									role="button" tabindex="0"
									onkeydown={(e) => { if (e.key === 'Enter') setSortCol(h.col); }}
								>
									{h.label}
									{#if sortCol === h.col}
										<span class="sort-arrow">{sortAsc ? '↑' : '↓'}</span>
									{/if}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each filteredGames as g (g.matchId)}
							<tr
								class="game-row"
								class:game-row-active={selectedMatchId === g.matchId}
								onclick={() => { selectedMatchId = selectedMatchId === g.matchId ? null : g.matchId; }}
							>
								<td class="td td-num">R{g.round}</td>
								<td class="td td-opp">{g.opponentShort}</td>
								<td class="td td-venue">{g.venue}</td>
								<td class="td td-centre">{g.isHome ? 'H' : 'A'}</td>
								<td class="td td-num">{g.teamScore ?? '–'}</td>
								<td class="td td-num">{g.oppScore ?? '–'}</td>
								<td class="td td-num" class:margin-pos={g.margin != null && g.margin > 0} class:margin-neg={g.margin != null && g.margin < 0}>
									{g.margin != null ? (g.margin > 0 ? `+${g.margin}` : g.margin) : '–'}
								</td>
								<td class="td td-centre">
									{#if g.result}
										<span class="result-chip result-{g.result.toLowerCase()}">{g.result}</span>
									{:else}–{/if}
								</td>
							</tr>
						{/each}
						{#if filteredGames.length === 0}
							<tr><td colspan="8" class="td-empty">no games match the current filters</td></tr>
						{/if}
					</tbody>
				</table>
			</div>
		{/if}

	<!-- ═══════════════════════════════════════════════════════════════════════
	     SECTION 3 — HEAD-TO-HEAD
	══════════════════════════════════════════════════════════════════════════ -->
	{:else if activeTab === 'h2h'}
		<!-- Team pickers -->
		<div class="h2h-pickers">
			<div class="picker-block">
				<span class="picker-label">team a</span>
				<span class="picker-name">{data.allTeams.find(t => t.id === data.selectedTeamId)?.name ?? '—'}</span>
			</div>
			<button class="swap-btn" onclick={() => {
				if (data.compareTeamId) nav({ team: data.compareTeamId, compare: data.selectedTeamId });
			}} title="swap teams">⇄</button>
			<div class="picker-block picker-b">
				<span class="picker-label">team b</span>
				<Select.Root
					type="single"
					value={data.compareTeamId ?? ''}
					onValueChange={(v) => { if (v && v !== data.selectedTeamId) nav({ compare: v }); }}
				>
					<Select.Trigger class="w-48">
						{data.allTeams.find(t => t.id === data.compareTeamId)?.name ?? 'select team'}
					</Select.Trigger>
					<Select.Content>
						{#each data.allTeams.filter(t => t.id !== data.selectedTeamId) as t (t.id)}
							<Select.Item value={t.id} label={t.name}>{t.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		{#if !data.compareTeamId}
			<div class="empty-state">
				<p class="empty-title">select a team to compare</p>
				<p class="empty-sub">choose team b above to start the comparison</p>
			</div>
		{:else if !data.teamSummary || !data.compareSummary}
			<div class="empty-state">
				<p class="empty-title">not enough data</p>
				<p class="empty-sub">scrape rounds for both teams first</p>
			</div>
		{:else}
			{@const teamA = data.allTeams.find(t => t.id === data.selectedTeamId)}
			{@const teamB = data.allTeams.find(t => t.id === data.compareTeamId)}
			{@const sA = data.teamSummary as TeamSummary}
			{@const sB = data.compareSummary as TeamSummary}

			<!-- Stat comparison table -->
			<div class="compare-card">
				<div class="compare-header">
					<span class="cmp-team-label">{teamA?.shortName}</span>
					<span class="cmp-center-label">{data.selectedYear} season averages</span>
					<span class="cmp-team-label">{teamB?.shortName}</span>
				</div>
				{#if h2hCompareStats}
					{#each h2hCompareStats as row}
						{@const aWins = row.lowerBetter ? row.aVal < row.bVal : row.aVal > row.bVal}
						{@const bWins = row.lowerBetter ? row.bVal < row.aVal : row.bVal > row.aVal}
						<div class="cmp-row">
							<span class="cmp-val" class:cmp-leading={aWins}>{row.aVal.toFixed(1)}</span>
							<span class="cmp-label">{row.label}</span>
							<span class="cmp-val cmp-val-right" class:cmp-leading={bWins}>{row.bVal.toFixed(1)}</span>
						</div>
					{/each}
					<div class="cmp-tally">
						{teamA?.shortName} leads {aLeads} of {h2hCompareStats.length} categories
					</div>
				{/if}
			</div>

			<!-- Edge summary -->
			<div class="edge-card">
				<p class="edge-label">statistical edge — {data.selectedYear}</p>
				<div class="edge-scoreboard">
					<div class="edge-side">
						<span class="edge-team">{teamA?.shortName}</span>
						<span class="edge-score">{aLeads}</span>
					</div>
					<span class="edge-vs">—</span>
					<div class="edge-side edge-side-r">
						<span class="edge-score">{(h2hCompareStats?.length ?? 0) - aLeads}</span>
						<span class="edge-team">{teamB?.shortName}</span>
					</div>
				</div>
				<p class="edge-disclaimer">based on current season averages, not a prediction</p>
			</div>

			<!-- H2H historical record -->
			<div class="h2h-record-card">
				<p class="h2h-record-title">all-time head-to-head</p>
				<div class="h2h-record-tally">
					<span class="h2h-tally-item">{h2hRecord.wins}<span class="h2h-tally-label">W</span></span>
					<span class="h2h-tally-sep">·</span>
					<span class="h2h-tally-item">{h2hRecord.losses}<span class="h2h-tally-label">L</span></span>
					{#if h2hRecord.draws > 0}
						<span class="h2h-tally-sep">·</span>
						<span class="h2h-tally-item">{h2hRecord.draws}<span class="h2h-tally-label">D</span></span>
					{/if}
				</div>

				{#if h2hRecord.last5.length > 0}
					<p class="h2h-meetings-label">last {h2hRecord.last5.length} meetings</p>
					<div class="h2h-meetings">
						{#each h2hRecord.last5 as g (g.matchId)}
							<div class="h2h-meeting">
								<span class="h2h-meeting-meta">{g.year} R{g.round}</span>
								<span class="h2h-meeting-score">
									{g.teamScore ?? '–'} – {g.oppScore ?? '–'}
								</span>
								<span class="h2h-meeting-venue">{g.venue}</span>
								{#if g.result}
									<span class="result-chip result-{g.result.toLowerCase()} result-sm">{g.result}</span>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="h2h-no-meetings">no recorded meetings in the database</p>
				{/if}
			</div>
		{/if}
	{/if}

</div>

<!-- ═══ Game detail drawer ═════════════════════════════════════════════════ -->
{#if selectedMatchId != null && drawerRow && drawerGame}
	<!-- Backdrop -->
	<div class="drawer-backdrop" role="button" tabindex="-1" onclick={() => selectedMatchId = null} onkeydown={() => {}}></div>

	<aside class="drawer">
		<div class="drawer-header">
			<div class="drawer-title-block">
				<span class="drawer-round">R{drawerRow.round} · {drawerRow.date}</span>
				<span class="drawer-matchup">
					{drawerTeam?.shortName ?? ''} vs {drawerRow.opponentShort}
				</span>
				<span class="drawer-score">{drawerRow.teamScore ?? '–'} – {drawerRow.oppScore ?? '–'}</span>
			</div>
			<button class="drawer-close" onclick={() => selectedMatchId = null}>✕</button>
		</div>

		<!-- Team stat comparison -->
		<div class="drawer-section">
			<p class="drawer-section-title">team stats</p>
			<div class="drawer-stat-table">
				<div class="dst-header">
					<span>{drawerTeam?.shortName}</span>
					<span class="dst-label-col">stat</span>
					<span>{drawerRow.opponentShort}</span>
				</div>
				{#each ST as s}
					{@const av = (drawerGame.teamTotals as any)[s.key] ?? 0}
					{@const bv = (drawerGame.oppTotals  as any)[s.key] ?? 0}
					<div class="dst-row">
						<span class="dst-val" class:dst-leading={av > bv}>{av}</span>
						<span class="dst-label">{s.label}</span>
						<span class="dst-val dst-val-r" class:dst-leading={bv > av}>{bv}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Top performers -->
		<div class="drawer-section">
			<p class="drawer-section-title">top performers</p>
			<div class="top-perf-grid">
				{#each [
					{ label: 'disposals', players: drawerGame.topDisposals },
					{ label: 'goals',     players: drawerGame.topGoals     },
					{ label: 'tackles',   players: drawerGame.topTackles   },
				] as cat}
					<div class="top-perf-col">
						<p class="top-perf-label">{cat.label}</p>
						{#each cat.players as p, i}
							<div class="top-perf-row">
								<span class="top-perf-rank">{i + 1}</span>
								<span class="top-perf-name">{p.name}</span>
								<span class="top-perf-val">{p.val}</span>
							</div>
						{/each}
						{#if cat.players.length === 0}
							<p class="top-perf-empty">no data</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</aside>
{/if}

<style>
	/* ── Page ── */
	.page {
		max-width: 72rem;
		margin: 0 auto;
		padding: 1.5rem 1.5rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* ── Toolbar ── */
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.toolbar-left { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

	.compare-toggle {
		font-size: 0.75rem;
		font-family: inherit;
		color: var(--muted-foreground);
		background: none;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		padding: 0.35rem 0.75rem;
		cursor: pointer;
		transition: all 0.12s ease;
		letter-spacing: 0.02em;
	}
	.compare-toggle:hover { color: var(--foreground); border-color: var(--foreground); }
	.compare-active { color: var(--primary); border-color: var(--primary); background-color: color-mix(in oklch, var(--primary), transparent 90%); }

	/* ── Tabs ── */
	.tab-nav { display: flex; gap: 0; border-bottom: 1px solid var(--border); }
	.tab-btn {
		font-size: 0.8125rem;
		font-family: inherit;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		padding: 0.625rem 1rem;
		cursor: pointer;
		color: var(--muted-foreground);
		transition: color 0.12s, border-color 0.12s;
		margin-bottom: -1px;
		letter-spacing: 0.01em;
	}
	.tab-btn:hover { color: var(--foreground); }
	.tab-active { color: var(--foreground); border-bottom-color: var(--primary); font-weight: 600; }

	/* ── Empty state ── */
	.empty-state {
		display: flex; flex-direction: column; align-items: center; justify-content: center;
		gap: 0.375rem; padding: 4rem 2rem; border: 1px dashed var(--border); border-radius: 0.75rem; text-align: center;
	}
	.empty-title { font-size: 0.9375rem; font-weight: 600; color: var(--foreground); }
	.empty-sub   { font-size: 0.8125rem; color: var(--muted-foreground); }

	/* ── Hero card ── */
	.hero-card {
		display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap;
		gap: 1.25rem; padding: 1.5rem 1.75rem;
		border: 1px solid var(--border); border-radius: 0.75rem; background-color: var(--card);
		animation: rise 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	@keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

	.hero-name { font-size: 1.375rem; font-weight: 700; color: var(--foreground); letter-spacing: -0.025em; margin-bottom: 0.5rem; }
	.hero-record { display: flex; gap: 0.375rem; margin-bottom: 0.875rem; }
	.record-chip { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 0.375rem; letter-spacing: 0.03em; }
	.record-w { background-color: oklch(0.52 0.14 145 / 0.15); color: oklch(0.52 0.14 145); border: 1px solid oklch(0.52 0.14 145 / 0.3); }
	.record-l { background-color: color-mix(in oklch, var(--destructive), transparent 85%); color: var(--destructive); border: 1px solid color-mix(in oklch, var(--destructive), transparent 65%); }
	.record-d { background-color: var(--secondary); color: var(--muted-foreground); border: 1px solid var(--border); }

	.hero-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
	.meta-item { display: flex; flex-direction: column; align-items: flex-start; }
	.meta-label { font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); }
	.meta-val   { font-size: 0.9375rem; font-weight: 600; color: var(--foreground); }
	.meta-ord   { font-size: 0.625rem; vertical-align: super; font-weight: 500; }
	.meta-sep   { color: var(--muted-foreground); opacity: 0.4; font-size: 0.9rem; }

	.hero-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.375rem; }
	.form-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); }
	.form-guide { display: flex; gap: 0.25rem; }
	.form-pill  { font-size: 0.75rem; font-weight: 700; width: 1.5rem; height: 1.5rem; border-radius: 0.3rem; display: flex; align-items: center; justify-content: center; }
	.form-w { background-color: oklch(0.52 0.14 145 / 0.18); color: oklch(0.52 0.14 145); }
	.form-l { background-color: color-mix(in oklch, var(--destructive), transparent 82%); color: var(--destructive); }
	.form-d { background-color: var(--secondary); color: var(--muted-foreground); }

	/* ── Stat cards ── */
	.stat-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
	@media (max-width: 480px) { .stat-cards { grid-template-columns: repeat(2, 1fr); } }
	.stat-card {
		display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem;
		padding: 1.25rem 1.5rem; border: 1px solid var(--border); border-radius: 0.625rem;
		background-color: var(--card);
		animation: rise 0.35s 0.06s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	.stat-val    { font-size: 1.875rem; font-weight: 700; color: var(--foreground); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
	.stat-margin { color: var(--muted-foreground); }
	.positive    { color: oklch(0.52 0.14 145); }
	.stat-label  { font-size: 0.75rem; color: var(--muted-foreground); letter-spacing: 0.02em; }

	/* ── Chart ── */
	.chart-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
	.chart-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); }
	.chart-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 0.625rem; padding: 0.75rem 1rem; background-color: var(--card); }
	.chart-svg { display: block; height: 160px; }
	.chart-bar { cursor: pointer; transition: opacity 0.12s ease; }
	.chart-bar:hover { opacity: 0.8 !important; }

	/* ── Filters ── */
	.filters { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
	.filter-group { display: flex; gap: 0; border: 1px solid var(--border); border-radius: 0.5rem; overflow: hidden; }
	.filter-pill {
		font-size: 0.75rem; font-family: inherit; background: none; border: none;
		padding: 0.3rem 0.625rem; cursor: pointer; color: var(--muted-foreground);
		transition: background-color 0.1s, color 0.1s;
	}
	.filter-pill:not(:last-child) { border-right: 1px solid var(--border); }
	.filter-pill:hover { background-color: var(--secondary); color: var(--foreground); }
	.filter-on { background-color: var(--secondary); color: var(--foreground); font-weight: 600; }

	.opp-search {
		font-size: 0.8125rem; font-family: inherit;
		background-color: var(--background); color: var(--foreground);
		border: 1px solid var(--border); border-radius: 0.5rem;
		padding: 0.3rem 0.625rem; outline: none;
		transition: border-color 0.12s, box-shadow 0.12s;
	}
	.opp-search:focus { border-color: var(--ring); box-shadow: 0 0 0 2px color-mix(in oklch, var(--ring), transparent 75%); }
	.opp-search::placeholder { color: var(--muted-foreground); }

	/* ── Games table ── */
	.table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 0.625rem; }
	.games-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
	.th {
		padding: 0.5rem 0.875rem; text-align: left; font-weight: 600; font-size: 0.75rem;
		color: var(--muted-foreground); background-color: color-mix(in oklch, var(--muted), transparent 55%);
		border-bottom: 1px solid var(--border); cursor: pointer; white-space: nowrap; user-select: none;
		transition: color 0.1s;
	}
	.th:hover { color: var(--foreground); }
	.th-active { color: var(--foreground); }
	.sort-arrow { margin-left: 0.25rem; font-size: 0.6875rem; color: var(--primary); }

	.game-row { border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 45%); cursor: pointer; transition: background-color 0.1s; }
	.game-row:last-child { border-bottom: none; }
	.game-row:hover { background-color: color-mix(in oklch, var(--accent), transparent 85%); }
	.game-row-active { background-color: color-mix(in oklch, var(--primary), transparent 92%) !important; }

	.td          { padding: 0.5rem 0.875rem; color: var(--muted-foreground); white-space: nowrap; }
	.td-num      { text-align: right; font-variant-numeric: tabular-nums; }
	.td-centre   { text-align: center; }
	.td-opp      { font-weight: 500; color: var(--foreground); }
	.td-venue    { font-size: 0.75rem; max-width: 10rem; overflow: hidden; text-overflow: ellipsis; }
	.margin-pos  { color: oklch(0.52 0.14 145); font-weight: 600; }
	.margin-neg  { color: var(--destructive); font-weight: 600; }
	.td-empty    { padding: 2rem; text-align: center; color: var(--muted-foreground); }

	.result-chip { font-size: 0.6875rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 0.25rem; }
	.result-w { background-color: oklch(0.52 0.14 145 / 0.18); color: oklch(0.52 0.14 145); }
	.result-l { background-color: color-mix(in oklch, var(--destructive), transparent 82%); color: var(--destructive); }
	.result-d { background-color: var(--secondary); color: var(--muted-foreground); }
	.result-sm { font-size: 0.625rem; }

	/* ── H2H section ── */
	.h2h-pickers {
		display: flex; align-items: center; gap: 0.875rem; flex-wrap: wrap;
		padding: 1.25rem 1.5rem; border: 1px solid var(--border); border-radius: 0.75rem; background-color: var(--card);
	}
	.picker-block { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
	.picker-b     { align-items: flex-end; }
	.picker-label { font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); }
	.picker-name  { font-size: 0.9375rem; font-weight: 600; color: var(--foreground); }
	.swap-btn {
		font-size: 1rem; background: none; border: 1px solid var(--border); border-radius: 0.5rem;
		padding: 0.375rem 0.625rem; cursor: pointer; color: var(--muted-foreground);
		transition: all 0.12s; flex-shrink: 0;
	}
	.swap-btn:hover { color: var(--foreground); border-color: var(--foreground); }

	.compare-card { border: 1px solid var(--border); border-radius: 0.75rem; background-color: var(--card); overflow: hidden; }
	.compare-header {
		display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem;
		padding: 0.75rem 1.25rem; background-color: color-mix(in oklch, var(--muted), transparent 55%);
		border-bottom: 1px solid var(--border);
		font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground);
	}
	.compare-header span:last-child { text-align: right; }
	.cmp-center-label { text-align: center; font-weight: 400; font-size: 0.625rem; color: var(--muted-foreground); opacity: 0.7; }

	.cmp-row {
		display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem;
		padding: 0.625rem 1.25rem; border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 45%);
	}
	.cmp-row:last-child { border-bottom: none; }
	.cmp-val { font-size: 1rem; font-weight: 600; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
	.cmp-val-right { text-align: right; }
	.cmp-leading { color: var(--foreground); }
	.cmp-label { font-size: 0.75rem; color: var(--muted-foreground); text-align: center; }
	.cmp-tally { padding: 0.75rem 1.25rem; font-size: 0.75rem; color: var(--muted-foreground); text-align: center; border-top: 1px solid var(--border); }

	.edge-card {
		border: 1px solid var(--border); border-radius: 0.75rem; background-color: var(--card);
		padding: 1.25rem 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.625rem;
	}
	.edge-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); }
	.edge-scoreboard { display: flex; align-items: center; gap: 1rem; }
	.edge-side { display: flex; align-items: center; gap: 0.5rem; }
	.edge-side-r { flex-direction: row-reverse; }
	.edge-team { font-size: 0.875rem; font-weight: 600; color: var(--muted-foreground); }
	.edge-score { font-size: 2rem; font-weight: 800; color: var(--foreground); letter-spacing: -0.04em; }
	.edge-vs { font-size: 1rem; color: var(--muted-foreground); opacity: 0.5; }
	.edge-disclaimer { font-size: 0.6875rem; color: var(--muted-foreground); opacity: 0.6; }

	.h2h-record-card { border: 1px solid var(--border); border-radius: 0.75rem; background-color: var(--card); padding: 1.25rem 1.5rem; }
	.h2h-record-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); margin-bottom: 0.75rem; }
	.h2h-record-tally { display: flex; align-items: center; gap: 0.625rem; margin-bottom: 1rem; }
	.h2h-tally-item { font-size: 1.25rem; font-weight: 700; color: var(--foreground); }
	.h2h-tally-label { font-size: 0.75rem; color: var(--muted-foreground); margin-left: 0.15rem; font-weight: 400; }
	.h2h-tally-sep { color: var(--muted-foreground); opacity: 0.4; }
	.h2h-meetings-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); margin-bottom: 0.5rem; }
	.h2h-meetings { display: flex; flex-direction: column; gap: 0; }
	.h2h-meeting {
		display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0;
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 45%); font-size: 0.8125rem;
	}
	.h2h-meeting:last-child { border-bottom: none; }
	.h2h-meeting-meta  { color: var(--muted-foreground); font-size: 0.75rem; width: 5rem; flex-shrink: 0; }
	.h2h-meeting-score { font-weight: 600; color: var(--foreground); font-variant-numeric: tabular-nums; }
	.h2h-meeting-venue { color: var(--muted-foreground); font-size: 0.75rem; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.h2h-no-meetings   { font-size: 0.8125rem; color: var(--muted-foreground); padding: 0.5rem 0; }

	/* ── Drawer ── */
	.drawer-backdrop {
		position: fixed; inset: 0; background-color: oklch(0 0 0 / 0.35);
		z-index: 40; backdrop-filter: blur(2px);
		animation: fade-in 0.15s ease both;
	}
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

	.drawer {
		position: fixed; top: 0; right: 0; bottom: 0; width: min(480px, 100vw);
		background-color: var(--card); border-left: 1px solid var(--border);
		z-index: 50; overflow-y: auto; display: flex; flex-direction: column; gap: 0;
		animation: slide-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	@keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }

	.drawer-header {
		display: flex; align-items: flex-start; justify-content: space-between;
		padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border);
		background-color: color-mix(in oklch, var(--muted), transparent 55%);
		position: sticky; top: 0; z-index: 1;
	}
	.drawer-title-block { display: flex; flex-direction: column; gap: 0.25rem; }
	.drawer-round    { font-size: 0.6875rem; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.06em; }
	.drawer-matchup  { font-size: 1rem; font-weight: 700; color: var(--foreground); }
	.drawer-score    { font-size: 1.5rem; font-weight: 800; color: var(--foreground); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
	.drawer-close {
		background: none; border: 1px solid var(--border); border-radius: 0.375rem;
		padding: 0.25rem 0.5rem; cursor: pointer; color: var(--muted-foreground); font-size: 0.875rem;
		transition: all 0.12s;
	}
	.drawer-close:hover { color: var(--foreground); border-color: var(--foreground); }

	.drawer-section { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); }
	.drawer-section:last-child { border-bottom: none; }
	.drawer-section-title { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); margin-bottom: 0.75rem; font-weight: 600; }

	.drawer-stat-table { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border); border-radius: 0.5rem; overflow: hidden; }
	.dst-header {
		display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
		padding: 0.5rem 0.875rem;
		font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground);
		background-color: color-mix(in oklch, var(--muted), transparent 55%); border-bottom: 1px solid var(--border);
	}
	.dst-header span:last-child { text-align: right; }
	.dst-label-col { text-align: center; font-weight: 400; opacity: 0.7; }
	.dst-row {
		display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0.5rem;
		padding: 0.35rem 0.875rem; border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 50%);
		font-size: 0.8125rem;
	}
	.dst-row:last-child { border-bottom: none; }
	.dst-val         { font-variant-numeric: tabular-nums; color: var(--muted-foreground); }
	.dst-val-r       { text-align: right; }
	.dst-leading     { color: var(--foreground); font-weight: 600; }
	.dst-label       { font-size: 0.6875rem; color: var(--muted-foreground); text-align: center; }

	.top-perf-grid   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
	.top-perf-col    { display: flex; flex-direction: column; gap: 0.25rem; }
	.top-perf-label  { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); margin-bottom: 0.25rem; }
	.top-perf-row    { display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; }
	.top-perf-rank   { font-size: 0.625rem; color: var(--muted-foreground); width: 0.875rem; flex-shrink: 0; }
	.top-perf-name   { flex: 1; color: var(--foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.top-perf-val    { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--primary); }
	.top-perf-empty  { font-size: 0.75rem; color: var(--muted-foreground); }
</style>
