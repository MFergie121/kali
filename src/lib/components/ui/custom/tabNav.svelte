<script lang="ts">
	let {
		tabs,
		active,
		onChange,
	}: {
		tabs: { id: string; label: string }[];
		active: string;
		onChange: (id: string) => void;
	} = $props();
</script>

<div class="tab-nav" role="tablist">
	{#each tabs as tab (tab.id)}
		<button
			class="tab-btn"
			class:tab-active={active === tab.id}
			role="tab"
			aria-selected={active === tab.id}
			onclick={() => onChange(tab.id)}
		>{tab.label}</button>
	{/each}
</div>

<style>
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
</style>
