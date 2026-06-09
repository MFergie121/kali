<script lang="ts">
	import UseCases from '$lib/components/overview/use-cases.svelte';
	import ContactCta from '$lib/components/overview/contact-cta.svelte';
</script>

<svelte:head>
	<title>Overview — Kali AFL</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-10 p-6">
	<!-- Gap it fills -->
	<section class="space-y-2">
		<span class="text-primary text-[0.8125rem]">// why this exists</span>
		<h1 class="text-foreground text-2xl font-semibold tracking-tight">The AFL API that should've existed.</h1>
		<p class="text-muted-foreground text-[0.9375rem] leading-relaxed">
			There wasn't a decent, freely accessible AFL API out there — so this one got built. It covers
			every season from 2000 to now: matches, scores, standings, and standard plus advanced player
			stats. Completely free, completely open source, no credit card. The goal is to let fellow AFL
			fans, data nerds, and aspiring fantasy coaches build cool stuff without worrying about paywalls
			or limits.
		</p>
	</section>

	<!-- Ways to leverage the data -->
	<section class="space-y-4">
		<span
			class="text-muted-foreground block text-[0.625rem] font-semibold uppercase tracking-[0.12em]"
		>
			what you can build
		</span>
		<UseCases />
	</section>

	<!-- Contact / more usage -->
	<section>
		<ContactCta />
	</section>
</div>
