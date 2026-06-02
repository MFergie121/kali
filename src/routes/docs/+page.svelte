<script lang="ts">
	import Overview from '$lib/components/docs/overview.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const limitFormatted = Number(data.apiLimit).toLocaleString();
</script>

<svelte:head>
	<title>AFL Stats API Documentation — Kali AFL</title>
	<meta name="description" content="Full reference for the free Kali AFL REST API. Access AFL match results, player stats, standings, leaderboards, head-to-head, and more. {limitFormatted} requests/day, no credit card required." />
	<meta name="keywords" content="AFL API documentation, AFL REST API, AFL player stats API, AFL API endpoints, Australian football API reference, free AFL data API" />
	<meta property="og:title" content="AFL Stats API Documentation — Kali AFL" />
	<meta property="og:description" content="Free AFL REST API with 11+ endpoints. Teams, players, matches, standings, leaderboards, and advanced stats from 2000 to present." />
	<meta property="og:url" content="https://kaliaflstats.com/docs" />
	<meta property="og:type" content="website" />
	<meta property="og:image" content="https://kaliaflstats.com/og-image.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="AFL Stats API Documentation — Kali AFL" />
	<meta name="twitter:description" content="Free AFL REST API. Teams, players, matches, standings, leaderboards and advanced stats from 2000 to present." />
	<meta name="twitter:image" content="https://kaliaflstats.com/og-image.png" />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="https://kaliaflstats.com/docs" />
</svelte:head>

<Overview />

<!-- Get started CTA (public docs only) -->
<section class="mt-12 border-t pt-12 text-center">
	<p class="text-muted-foreground mb-4 text-sm">Ready to start building?</p>
	<a href="/auth/login" class="doc-cta-btn">get a free api key →</a>
</section>
