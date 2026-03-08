<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import DarkToggle from '$lib/components/ui/custom/darkToggle.svelte';
	import FontPicker from '$lib/components/ui/custom/fontPicker.svelte';
	import Logo from '$lib/components/ui/custom/logo.svelte';
	import ThemePicker from '$lib/components/ui/custom/themePicker.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="min-h-svh flex flex-col items-center justify-center bg-background px-4">
	<div class="w-full max-w-sm flex flex-col gap-4">
		<div class="rounded-xl border border-border bg-card py-12 flex items-center justify-center">
			<Logo size={96} class="text-primary" />
		</div>

		<div class="rounded-xl border border-border bg-card p-6 text-center">
			<h1 class="text-2xl font-semibold tracking-tight">Welcome to Kali</h1>
		</div>

		<div class="rounded-xl border border-border bg-card p-6 text-center">
			<p class="text-sm text-muted-foreground">Please login to continue</p>
		</div>

		<div class="rounded-xl border border-border bg-card p-6 text-center">
			{#if data.session}
				<p class="text-sm text-muted-foreground mb-3">
					Signed in as <span class="text-foreground font-medium">{data.session.user.name || data.session.user.email}</span>
				</p>
				<div class="flex flex-col gap-2">
					<Button href="/home" class="w-full">Go to Home</Button>
					<Button href="/auth/logout/{data.session.provider}" variant="destructive" class="w-full">
						Sign out
					</Button>
				</div>
			{:else}
				<Button href="/auth/login" class="w-full">Login</Button>
			{/if}
		</div>

		<div class="flex items-center justify-center gap-2">
			<DarkToggle />
			<ThemePicker />
			<FontPicker />
		</div>
	</div>
</div>
