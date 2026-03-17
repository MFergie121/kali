<script lang="ts">
	import type { Snippet } from 'svelte';
	import { themeStore, type Theme } from '$lib/theme.svelte';
	import { fontStore, type Font } from '$lib/font.svelte';
	import { onMount } from 'svelte';

	let { children, data }: { children: Snippet; data: any } = $props();

	onMount(() => {
		if (data.prefs?.prefTheme) themeStore.apply(data.prefs.prefTheme as Theme);
		if (data.prefs?.prefFont) fontStore.apply(data.prefs.prefFont as Font);
	});
</script>

{@render children()}
