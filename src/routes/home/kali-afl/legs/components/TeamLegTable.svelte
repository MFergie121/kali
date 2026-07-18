<script lang="ts">
	import SortableTh from '$lib/components/ui/custom/sortableTh.svelte';
	import type { FixtureContext, TeamTableRow } from '$lib/afl/legs.server';
	import { STAT_KEYS, STAT_LABELS, type StatKey } from '$lib/afl/legs-engine';

	let {
		rows,
		teamName,
		fixture,
		isHome
	}: {
		rows: TeamTableRow[];
		teamName: string;
		fixture: FixtureContext;
		isHome: boolean;
	} = $props();

	type SortKey = StatKey | 'name';
	let sortKey = $state<SortKey>('disposals');
	let asc = $state(false);

	function toggle(key: SortKey) {
		if (sortKey === key) {
			asc = !asc;
		} else {
			sortKey = key;
			asc = key === 'name'; // names default A→Z, stats default high→low
		}
	}

	const sorted = $derived.by(() => {
		const dir = asc ? 1 : -1;
		return [...rows].sort((a, b) => {
			if (sortKey === 'name') return a.playerName.localeCompare(b.playerName) * dir;
			return (a.stats[sortKey].expected - b.stats[sortKey].expected) * dir;
		});
	});

	const opponentShort = $derived(isHome ? fixture.awayShortName : fixture.homeShortName);
	const winPct = $derived(
		Math.round((isHome ? fixture.homeWinProb : 1 - fixture.homeWinProb) * 100)
	);
	const winSourceLabel: Record<FixtureContext['winSource'], string> = {
		tipster: 'tipster consensus',
		model: 'kali model',
		neutral: 'no win read'
	};
</script>

<div class="team-card">
	<div class="team-head">
		<div>
			<h2 class="team-name">{teamName}</h2>
			<div class="fixture-line">
				<span class="vs">{isHome ? 'vs' : '@'}</span>
				<span class="opp">{opponentShort}</span>
				<span class="dot">·</span><span>R{fixture.round}</span>
				{#if fixture.date}<span class="dot">·</span><span>{fixture.date.slice(0, 10)}</span>{/if}
			</div>
		</div>
		<div class="win-badge" title="Win probability driving the stat adjustment">
			<span class="win-pct">{winPct}%</span>
			<span class="win-src">win · {winSourceLabel[fixture.winSource]}</span>
		</div>
	</div>

	<div class="table-scroll">
		<table class="team-table">
			<thead>
				<tr>
					<SortableTh
						label="Player"
						active={sortKey === 'name'}
						{asc}
						onSort={() => toggle('name')}
						minWidth="10rem"
					/>
					{#each STAT_KEYS as stat (stat)}
						<SortableTh
							label={STAT_LABELS[stat]}
							active={sortKey === stat}
							{asc}
							onSort={() => toggle(stat)}
						/>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each sorted as row (row.playerId)}
					<tr>
						<td class="pcell">
							{row.playerName}
							{#if row.lowSample}<span class="thin" title="Built on thin data">thin</span>{/if}
						</td>
						{#each STAT_KEYS as stat (stat)}
							<td class="scell">
								<span class="exp">{row.stats[stat].expected}</span>
								<span class="safe">{row.stats[stat].safeLine}+</span>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="hint">Expected value on top, safe line (cleared every sampled game) below.</p>
</div>

<style>
	.team-card {
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: var(--card);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.team-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.team-name {
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
	.fixture-line .opp {
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
	.table-scroll {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
	}
	.team-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}
	.pcell {
		padding: 0.5rem 0.875rem;
		white-space: nowrap;
		font-weight: 500;
		color: var(--foreground);
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 40%);
	}
	.thin {
		font-size: 0.5625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 700;
		color: var(--muted-foreground);
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		padding: 0.05rem 0.25rem;
		margin-left: 0.375rem;
	}
	.scell {
		padding: 0.4rem 0.875rem;
		text-align: right;
		white-space: nowrap;
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 40%);
		font-variant-numeric: tabular-nums;
	}
	.exp {
		display: block;
		font-weight: 600;
		color: var(--foreground);
	}
	.safe {
		display: block;
		font-size: 0.6875rem;
		color: var(--primary);
	}
	.hint {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		margin: 0;
	}
</style>
