<script lang="ts">
	import type { Snippet } from 'svelte';
	import { themeStore, type Theme } from '$lib/theme.svelte';
	import { fontStore, type Font } from '$lib/font.svelte';
	import { onMount } from 'svelte';

	let { children, data }: { children: Snippet; data: any } = $props();

	onMount(() => {
		const localTheme = localStorage.getItem('app-theme');
		const localFont = localStorage.getItem('app-font');

		// Prefer localStorage over DB — localStorage is already applied by the
		// blocking script in app.html, so we just need to sync the store state.
		// Fall back to DB on first load when localStorage is empty.
		const theme = (localTheme ?? data.prefs?.prefTheme) as Theme | null;
		const font = (localFont ?? data.prefs?.prefFont) as Font | null;

		if (theme) themeStore.apply(theme);
		if (font) fontStore.apply(font);
	});
</script>

{@render children()}
