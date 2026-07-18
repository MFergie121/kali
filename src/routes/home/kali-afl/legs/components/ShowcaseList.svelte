<script lang="ts">
	import type { ShowcaseRow } from '$lib/afl/legs.server';

	let { rows, onPick }: { rows: ShowcaseRow[]; onPick: (playerId: number) => void } = $props();

	function pct(deviation: number): string {
		const v = Math.round(deviation * 100);
		return `${v > 0 ? '+' : ''}${v}%`;
	}
</script>

<ol class="showcase">
	{#each rows as row, i (row.playerId)}
		<li class="row" style="animation-delay: {i * 30}ms">
			<button class="row-btn" onclick={() => onPick(row.playerId)}>
				<span class="rank">{i + 1}</span>

				<span class="who">
					<span class="name">
						{row.playerName}
						{#if row.lowSample}<span class="thin" title="Built on thin data">thin</span>{/if}
					</span>
					<span class="fixture">
						{row.teamShortName}
						<span class="vs">{row.isHome ? 'vs' : '@'}</span>
						{row.opponentShortName}
					</span>
				</span>

				<span class="stat">
					<span class="stat-name">{row.statLabel}</span>
					<span class="stat-values">
						<span class="predicted" class:up={row.direction === 'up'} class:down={row.direction === 'down'}>
							{row.predicted}
						</span>
						<span class="avg">avg {row.average}</span>
					</span>
				</span>

				<span
					class="dev"
					class:up={row.direction === 'up'}
					class:down={row.direction === 'down'}
				>
					<span class="arrow">{row.direction === 'up' ? '▲' : '▼'}</span>
					{pct(row.deviation)}
				</span>
			</button>
		</li>
	{/each}
</ol>

<style>
	.showcase {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.row {
		animation: rise 0.34s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	.row-btn {
		display: grid;
		grid-template-columns: 1.5rem 1fr auto auto;
		align-items: center;
		gap: 0.875rem;
		width: 100%;
		text-align: left;
		font-family: inherit;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--card);
		padding: 0.625rem 0.875rem;
		cursor: pointer;
		transition:
			border-color 0.12s ease,
			background 0.12s ease;
	}
	.row-btn:hover {
		border-color: var(--primary);
		background: color-mix(in oklch, var(--primary), transparent 94%);
	}
	.rank {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--muted-foreground);
		text-align: center;
	}
	.who {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}
	.name {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--foreground);
		display: flex;
		align-items: center;
		gap: 0.375rem;
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
	}
	.fixture {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}
	.vs {
		opacity: 0.6;
		margin: 0 0.1rem;
	}
	.stat {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.125rem;
	}
	.stat-name {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted-foreground);
	}
	.stat-values {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.predicted {
		font-size: 1rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.predicted.up {
		color: var(--primary);
	}
	.avg {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}
	.dev {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8125rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		min-width: 3.5rem;
		justify-content: flex-end;
	}
	.dev.up {
		color: var(--primary);
	}
	.dev.down {
		color: var(--muted-foreground);
	}
	.arrow {
		font-size: 0.625rem;
	}
	@media (max-width: 560px) {
		.row-btn {
			grid-template-columns: 1.25rem 1fr auto;
			gap: 0.5rem;
		}
		.stat {
			display: none;
		}
	}
</style>
