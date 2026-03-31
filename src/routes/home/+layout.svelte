<script lang="ts">
	import type { Snippet } from 'svelte';
	import { themeStore, type Theme } from '$lib/theme.svelte';
	import { fontStore, type Font } from '$lib/font.svelte';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

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

		// If DB prefs existed but localStorage didn't, seed localStorage for
		// the blocking script on next refresh.
		if (!localTheme && data.prefs?.prefTheme) {
			localStorage.setItem('app-theme', data.prefs.prefTheme);
		}
		if (!localFont && data.prefs?.prefFont) {
			localStorage.setItem('app-font', data.prefs.prefFont);
		}
	});
</script>

{@render children()}
