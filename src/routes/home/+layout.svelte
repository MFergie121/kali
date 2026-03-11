<script lang="ts">
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import Logo from '$lib/components/ui/custom/logo.svelte';
	import UserMenu from '$lib/components/ui/custom/userMenu.svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<header class="bg-background sticky top-0 z-40 flex h-14 items-center border-b px-4">
		<nav class="flex w-full items-center justify-between">
			<a href="/home" class="flex items-center gap-2">
				<Logo size={22} />
				<span class="text-sm font-semibold">Kali</span>
			</a>
			{#if data.session}
				<UserMenu session={data.session} />
			{/if}
		</nav>
	</header>
	<main class="flex-1">
		{@render children()}
	</main>
</div>
