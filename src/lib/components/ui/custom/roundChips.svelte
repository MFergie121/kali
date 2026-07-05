<script lang="ts">
	import { roundChipLabel } from '$lib/afl/format';

	let {
		rounds,
		selected,
		onSelect,
		statusFor,
		showLegend = false,
	}: {
		rounds: number[];
		selected: number;
		onSelect: (round: number) => void;
		/** Optional per-round status used for chip styling and the legend. */
		statusFor?: (round: number) => 'scraped' | 'upcoming' | 'none';
		showLegend?: boolean;
	} = $props();
</script>

<div class="round-chips-panel">
	<div class="round-chips-header">
		<span class="round-chips-label">round</span>
		{#if showLegend}
			<div class="round-chips-legend">
				<span class="legend-item">
					<span class="legend-swatch legend-swatch-scraped"></span>scraped
				</span>
				<span class="legend-item">
					<span class="legend-swatch legend-swatch-upcoming"></span>upcoming
				</span>
			</div>
		{/if}
	</div>
	<div class="round-chips-grid">
		{#each rounds as r (r)}
			{@const status = statusFor?.(r) ?? 'none'}
			<button
				class="round-chip"
				class:round-chip-on={r === selected}
				class:round-chip-scraped={r !== selected && status === 'scraped'}
				class:round-chip-upcoming={r !== selected && status === 'upcoming'}
				class:round-chip-plain={!statusFor}
				aria-pressed={r === selected}
				onclick={() => onSelect(r)}
			>{roundChipLabel(r)}</button>
		{/each}
	</div>
</div>

<style>
	.round-chips-panel {
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		padding: 0.75rem 0.875rem;
		background-color: color-mix(in oklch, var(--muted), transparent 65%);
	}
	.round-chips-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.625rem;
	}
	.round-chips-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}
	.round-chips-legend { display: flex; align-items: center; gap: 0.75rem; }
	.legend-item {
		display: flex; align-items: center; gap: 0.3rem;
		font-size: 0.625rem; color: var(--muted-foreground); letter-spacing: 0.03em;
	}
	.legend-swatch { width: 0.5rem; height: 0.5rem; border-radius: 0.15rem; flex-shrink: 0; }
	.legend-swatch-scraped  { background-color: var(--foreground); opacity: 0.6; }
	.legend-swatch-upcoming { background-color: var(--primary); opacity: 0.7; }

	.round-chips-grid { display: flex; flex-wrap: wrap; gap: 0.375rem; }
	.round-chip {
		font-size: 0.6875rem;
		font-family: inherit;
		padding: 0.2rem 0.5rem;
		border-radius: 0.3rem;
		border: 1px solid var(--border);
		background: var(--card);
		color: var(--muted-foreground);
		cursor: pointer;
		transition: all 0.1s ease;
		opacity: 0.4;
	}
	.round-chip-plain { opacity: 0.6; }
	.round-chip:hover { border-color: var(--foreground); color: var(--foreground); opacity: 1; }
	.round-chip-on {
		background-color: var(--foreground);
		color: var(--background);
		border-color: var(--foreground);
		font-weight: 600;
		opacity: 1;
	}
	.round-chip-on:hover { opacity: 0.85; }
	.round-chip-scraped {
		border-color: color-mix(in oklch, var(--primary), transparent 50%);
		color: var(--foreground);
		opacity: 1;
	}
	.round-chip-upcoming {
		border-color: var(--primary);
		color: var(--primary);
		background: color-mix(in oklch, var(--primary), transparent 90%);
		opacity: 1;
	}
</style>
