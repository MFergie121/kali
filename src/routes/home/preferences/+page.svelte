<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import DarkToggle from '$lib/components/ui/custom/darkToggle.svelte';
	import ThemePicker from '$lib/components/ui/custom/themePicker.svelte';
	import FontPicker from '$lib/components/ui/custom/fontPicker.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto max-w-2xl space-y-8 p-8">
	<h1 class="text-3xl font-bold">Preferences</h1>

	<!-- Profile -->
	<section class="space-y-4 rounded-lg border p-6">
		<h2 class="text-lg font-semibold">Profile</h2>
		<div class="flex items-center gap-4">
			{#if data.session?.user.image}
				<img
					src={data.session.user.image}
					alt={data.session.user.name}
					class="size-16 rounded-full object-cover"
					referrerpolicy="no-referrer"
				/>
			{:else}
				<span
					class="bg-muted flex size-16 items-center justify-center rounded-full text-xl font-medium"
				>
					{data.session?.user.name?.charAt(0).toUpperCase() ?? '?'}
				</span>
			{/if}
			<div class="space-y-1">
				<p class="font-semibold">{data.session?.user.name}</p>
				<p class="text-muted-foreground text-sm">{data.session?.user.email}</p>
				<span class="bg-muted rounded-full px-2 py-0.5 text-xs capitalize">
					{data.session?.provider}
				</span>
			</div>
		</div>
	</section>

	<!-- Appearance -->
	<section class="space-y-4 rounded-lg border p-6">
		<h2 class="text-lg font-semibold">Appearance</h2>
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<span class="text-sm">Dark mode</span>
				<DarkToggle />
			</div>
			<div class="flex items-center justify-between">
				<span class="text-sm">Theme</span>
				<ThemePicker />
			</div>
			<div class="flex items-center justify-between">
				<span class="text-sm">Font</span>
				<FontPicker />
			</div>
		</div>
	</section>

	<!-- Account -->
	<section class="space-y-4 rounded-lg border p-6">
		<h2 class="text-lg font-semibold">Account</h2>
		<Button href="/auth/logout/{data.session?.provider}" variant="outline">Sign out</Button>
	</section>
</div>
