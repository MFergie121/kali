<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
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
				AFL Stats Scraper
			</Button>
			<Button href="/auth/logout/{data.session.provider}" variant="outline" size="sm">
				Sign out
			</Button>
		</div>
	{/if}
</div>
