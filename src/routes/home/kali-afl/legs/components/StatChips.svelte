<script lang="ts">
	import { SHOWCASE_STAT_KEYS, STAT_LABELS, type ShowcaseStatKey } from '$lib/afl/legs-engine';

	let {
		selected,
		onSelect
	}: {
		selected: ShowcaseStatKey | null;
		onSelect: (stat: ShowcaseStatKey | null) => void;
	} = $props();
</script>

<div class="stat-chips-panel">
	<span class="stat-chips-label">stat</span>
	<div class="stat-chips-grid">
		<button
			class="stat-chip"
			class:stat-chip-on={selected === null}
			aria-pressed={selected === null}
			onclick={() => onSelect(null)}>All</button
		>
		{#each SHOWCASE_STAT_KEYS as stat (stat)}
			<button
				class="stat-chip"
				class:stat-chip-on={selected === stat}
				aria-pressed={selected === stat}
				onclick={() => onSelect(stat)}>{STAT_LABELS[stat]}</button
			>
		{/each}
	</div>
</div>

<style>
	.stat-chips-panel {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		padding: 0.75rem 0.875rem;
		background-color: color-mix(in oklch, var(--muted), transparent 65%);
	}
	.stat-chips-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}
	.stat-chips-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}
	.stat-chip {
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
	.stat-chip:hover {
		border-color: var(--primary);
		color: var(--foreground);
	}
	.stat-chip-on {
		background-color: var(--primary);
		color: var(--primary-foreground);
		border-color: var(--primary);
		font-weight: 600;
	}
	.stat-chip-on:hover {
		color: var(--primary-foreground);
	}
</style>
