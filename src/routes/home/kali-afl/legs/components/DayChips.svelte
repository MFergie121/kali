<script lang="ts">
	import type { LegsDay } from '$lib/afl/legs.server';

	let {
		days,
		selected,
		onSelect
	}: {
		days: LegsDay[];
		selected: string | null;
		onSelect: (date: string) => void;
	} = $props();
</script>

<div class="day-chips-panel">
	<span class="day-chips-label">day</span>
	<div class="day-chips-grid">
		{#each days as d (d.date)}
			<button
				class="day-chip"
				class:day-chip-on={d.date === selected}
				aria-pressed={d.date === selected}
				onclick={() => onSelect(d.date)}>{d.label}</button
			>
		{/each}
	</div>
</div>

<style>
	.day-chips-panel {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		padding: 0.75rem 0.875rem;
		background-color: color-mix(in oklch, var(--muted), transparent 65%);
	}
	.day-chips-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}
	.day-chips-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}
	.day-chip {
		font-size: 0.75rem;
		font-family: inherit;
		padding: 0.25rem 0.625rem;
		border-radius: 0.3rem;
		border: 1px solid var(--border);
		background: var(--card);
		color: var(--muted-foreground);
		cursor: pointer;
		transition: all 0.1s ease;
	}
	.day-chip:hover {
		border-color: var(--foreground);
		color: var(--foreground);
	}
	.day-chip-on {
		background-color: var(--foreground);
		color: var(--background);
		border-color: var(--foreground);
		font-weight: 600;
	}
	.day-chip-on:hover {
		color: var(--background);
	}
</style>
