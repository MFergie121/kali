<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		sub,
		icon,
	}: {
		title: string;
		sub?: string;
		icon?: Snippet;
	} = $props();
</script>

<div class="empty-state">
	{#if icon}
		<span class="empty-icon">{@render icon()}</span>
	{/if}
	<p class="empty-title">{title}</p>
	{#if sub}<p class="empty-sub">{sub}</p>{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 4rem 2rem;
		border: 1px dashed var(--border);
		border-radius: 0.75rem;
		text-align: center;
	}
	.empty-icon {
		color: var(--muted-foreground);
		opacity: 0.4;
		margin-bottom: 0.25rem;
	}
	.empty-title { font-size: 0.9375rem; font-weight: 600; color: var(--foreground); margin: 0; }
	.empty-sub   { font-size: 0.8125rem; color: var(--muted-foreground); margin: 0; }
</style>
