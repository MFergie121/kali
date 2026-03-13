<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const WELCOME_MESSAGES: Record<string, string> = {
		github: 'Signed in with GitHub',
		google: 'Signed in with Google'
	};

	$effect(() => {
		const welcome = page.url.searchParams.get('welcome');
		if (welcome) {
			const message = WELCOME_MESSAGES[welcome] ?? 'Signed in successfully';
			toast.success(message, { description: 'Welcome back!' });
			history.replaceState(null, '', '/home');
		}
	});
</script>

<div class="mx-auto max-w-2xl space-y-6 p-8">
	<h1 class="text-3xl font-bold">Home</h1>

	{#if data.session}
		<div class="space-y-4 rounded-lg border p-6">
			<div class="flex items-center gap-4">
				{#if data.session.user.image}
					<img
						src={data.session.user.image}
						alt="Avatar"
						class="size-14 rounded-full"
					/>
				{/if}
				<div>
					<p class="text-lg font-semibold">{data.session.user.name}</p>
					<p class="text-sm text-muted-foreground">{data.session.user.email}</p>
				</div>
			</div>
			<p class="text-sm text-muted-foreground">
				Signed in via <span class="font-medium capitalize">{data.session.provider}</span>
			</p>
			<Button href="home/kali-afl-scraper" variant="outline" size="sm">
				AFL Stats
			</Button>
			<Button href="home/global-friends" variant="outline" size="sm">
				Global Friends
			</Button>
			<Button href="home/bpt" variant="outline" size="sm">
				BPT
			</Button>
			<Button href="/auth/logout/{data.session.provider}" variant="outline" size="sm">
				Sign out
			</Button>
		</div>
	{/if}
</div>
