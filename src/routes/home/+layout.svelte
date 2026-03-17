<script lang="ts">
	import { fontStore } from '$lib/font.svelte';
	import { themeStore } from '$lib/theme.svelte';
	import { setMode } from 'mode-watcher';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	onMount(() => {
		if (data.prefs) {
			themeStore.apply(data.prefs.prefTheme as Parameters<typeof themeStore.apply>[0]);
			fontStore.apply(data.prefs.prefFont as Parameters<typeof fontStore.apply>[0]);
			setMode(data.prefs.prefDarkMode as 'light' | 'dark' | 'system');
		}
	});
</script>

{@render children()}
