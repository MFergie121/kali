<script lang="ts">
	let {
		years,
		selected,
		onSelect,
	}: {
		years: number[];
		selected: number;
		onSelect: (year: number) => void;
	} = $props();

	const idx = $derived(years.indexOf(selected));
</script>

<div class="year-nav">
	<button
		class="year-nav-btn"
		aria-label="previous year"
		disabled={idx <= 0}
		onclick={() => onSelect(years[idx - 1])}
	>←</button>
	<span class="year-nav-label">{selected}</span>
	<button
		class="year-nav-btn"
		aria-label="next year"
		disabled={idx < 0 || idx >= years.length - 1}
		onclick={() => onSelect(years[idx + 1])}
	>→</button>
</div>

<style>
	.year-nav {
		display: flex;
		align-items: center;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		overflow: hidden;
	}
	.year-nav-btn {
		font-family: inherit;
		font-size: 0.8125rem;
		padding: 0.25rem 0.5rem;
		background: none;
		border: none;
		color: var(--muted-foreground);
		cursor: pointer;
		transition: background-color 0.12s ease, color 0.12s ease;
		line-height: 1;
	}
	.year-nav-btn:hover:not(:disabled) {
		background-color: var(--secondary);
		color: var(--foreground);
	}
	.year-nav-btn:disabled { opacity: 0.3; cursor: default; }
	.year-nav-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--foreground);
		padding: 0.25rem 0.5rem;
		border-left: 1px solid var(--border);
		border-right: 1px solid var(--border);
		min-width: 3rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
</style>
