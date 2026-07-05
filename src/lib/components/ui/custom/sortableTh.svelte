<script lang="ts">
	let {
		label,
		active,
		asc,
		onSort,
		minWidth,
	}: {
		label: string;
		active: boolean;
		asc: boolean;
		onSort: () => void;
		minWidth?: string;
	} = $props();
</script>

<th
	class="th"
	class:th-active={active}
	aria-sort={active ? (asc ? 'ascending' : 'descending') : undefined}
	style={minWidth ? `min-width:${minWidth}` : undefined}
>
	<button class="th-btn" onclick={onSort}>
		{label}
		{#if active}
			<span class="sort-arrow">{asc ? '↑' : '↓'}</span>
		{/if}
	</button>
</th>

<style>
	.th {
		padding: 0; text-align: left; font-weight: 600; font-size: 0.75rem;
		color: var(--muted-foreground); background-color: color-mix(in oklch, var(--muted), transparent 55%);
		border-bottom: 1px solid var(--border); white-space: nowrap;
	}
	.th-btn {
		font-family: inherit; font-size: inherit; font-weight: inherit; color: inherit;
		background: none; border: none; cursor: pointer;
		padding: 0.5rem 0.875rem; width: 100%; text-align: left;
		user-select: none; transition: color 0.1s;
	}
	.th-btn:hover { color: var(--foreground); }
	.th-active .th-btn { color: var(--foreground); }
	.sort-arrow { margin-left: 0.25rem; font-size: 0.6875rem; color: var(--primary); }
</style>
