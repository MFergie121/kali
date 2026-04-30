<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import DarkToggle from '$lib/components/ui/custom/darkToggle.svelte';
	import FontPicker from '$lib/components/ui/custom/fontPicker.svelte';
	import Logo from '$lib/components/ui/custom/logo.svelte';
	import ThemePicker from '$lib/components/ui/custom/themePicker.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const limitFormatted = Number(data.apiLimit).toLocaleString();
</script>

<svelte:head>
	<title>Kali AFL — Free AFL Stats API</title>
	<meta name="description" content="Free AFL Stats API with historical data from 2000 to present. {limitFormatted} requests per day, no credit card required. Access teams, players, matches, standings, leaderboards, and advanced player stats." />
	<meta name="keywords" content="AFL API, free AFL API, AFL stats API, AFL data API, Australian Football League API, AFL historical data, AFL player stats, free sports API Australia, supercoach API, fantasy AFL API" />
	<meta property="og:title" content="Kali AFL — Free AFL Stats API" />
	<meta property="og:description" content="The AFL API that should've existed. Free, open source, {limitFormatted} requests/day. Historical data from 2000 to present." />
	<meta property="og:url" content="https://kaliaflstats.com/" />
	<meta property="og:type" content="website" />
	<meta property="og:image" content="https://kaliaflstats.com/og-image.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Kali AFL — Free AFL Stats API" />
	<meta name="twitter:description" content="The AFL API that should've existed. Free, open source, {limitFormatted} req/day. Historical data from 2000 to present." />
	<meta name="twitter:image" content="https://kaliaflstats.com/og-image.png" />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="https://kaliaflstats.com/" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		"name": "Kali AFL Stats API",
		"url": "https://kaliaflstats.com",
		"description": `Free AFL Stats API with historical data from 2000 to present. ${limitFormatted} requests per day, no credit card required.`,
		"applicationCategory": "DeveloperApplication",
		"operatingSystem": "Web",
		"offers": { "@type": "Offer", "price": "0", "priceCurrency": "AUD" }
	})}</script>`}
</svelte:head>

<div class="root">

	<!-- ── Hero ── -->
	<section class="hero">
		<div class="hero-inner">
			<div class="logo-row" style="animation-delay: 0ms">
				<Logo size={34} />
				<span class="wordmark">kali-afl</span>
			</div>

			<h1 class="headline" style="animation-delay: 80ms">
				The AFL API<br />that should've<br />existed.
			</h1>

			<p class="tagline" style="animation-delay: 160ms">
				free · open source · historical data from 2000 · {limitFormatted} req / day
			</p>

			<div class="hero-cta" style="animation-delay: 240ms">
				{#if data.session}
					<Button href="/home/kali-afl" class="hero-btn">enter →</Button>
					<Button href="/auth/logout/{data.session.provider}" variant="destructive" class="hero-btn-ghost">sign out</Button>
				{:else}
					<Button href="/auth/login" class="hero-btn">get started →</Button>
				{/if}
				<a href="https://github.com/MFergie121/kali-afl-stats" target="_blank" rel="noopener noreferrer" class="github-link">
					github ↗
				</a>
			</div>
		</div>

		<div class="hero-stats" style="animation-delay: 320ms">
			<div class="hero-stat">
				<span class="hero-stat-val">25+</span>
				<span class="hero-stat-label">seasons</span>
			</div>
			<div class="hero-divider"></div>
			<div class="hero-stat">
				<span class="hero-stat-val">{limitFormatted}</span>
				<span class="hero-stat-label">req / day</span>
			</div>
			<div class="hero-divider"></div>
			<div class="hero-stat">
				<span class="hero-stat-val">$0</span>
				<span class="hero-stat-label">forever</span>
			</div>
			<div class="hero-divider"></div>
			<div class="hero-stat">
				<span class="hero-stat-val">10+</span>
				<span class="hero-stat-label">endpoints</span>
			</div>
		</div>
	</section>

	<!-- ── Origin ── -->
	<section class="origin" style="animation-delay: 400ms">
		<span class="origin-comment">// why does this exist?</span>
		<p class="origin-text">
			there wasn't a decent free afl data source. so i decided to build one.
			it covers every season from 2000 to now — matches, scores, player stats, the works.
			completely free, completely open source, and you don't need a credit card to touch it.
			i hope this helps fellow afl fans, data nerds, and aspiring fantasy coaches build cool stuff without worrying about api limits or paywalls.
		</p>
	</section>

	<!-- ── Features ── -->
	<section class="features" style="animation-delay: 460ms">
		<span class="section-label">what you get</span>
		<div class="feature-grid">

			<div class="feature-card feature-card--primary">
				<span class="feature-badge">biggest selling point</span>
				<h3 class="feature-title">free api</h3>
				<p class="feature-desc">{limitFormatted} requests per day. key-based auth. no credit card, no waitlist. sign in and start building.</p>
				<span class="feature-highlight">{limitFormatted} req / day</span>
			</div>

			<div class="feature-card">
				<h3 class="feature-title">historical data</h3>
				<p class="feature-desc">every season from 2000 to present. match results, venues, crowds, round-by-round coverage — all of it.</p>
				<span class="feature-highlight">2000 → now</span>
			</div>

			<div class="feature-card">
				<h3 class="feature-title">standard + advanced stats</h3>
				<p class="feature-desc">kicks, handballs, disposals, goals, tackles, fantasy pts, supercoach pts — plus contested possessions, metres gained, disposal efficiency, intercepts, and more.</p>
			</div>

			<div class="feature-card">
				<h3 class="feature-title">built-in viewer</h3>
				<p class="feature-desc">browse matches, players, and team breakdowns directly in the app. no api calls needed.</p>
			</div>

		</div>
	</section>

	<!-- ── API Quick-look ── -->
	<section class="quicklook" style="animation-delay: 520ms">
		<span class="section-label">quick look</span>

		<div class="terminal">
			<div class="terminal-bar">
				<div class="terminal-dots">
					<span class="dot dot-r"></span>
					<span class="dot dot-y"></span>
					<span class="dot dot-g"></span>
				</div>
				<span class="terminal-title">request</span>
			</div>
			<pre
				class="terminal-body"
><span class="t-muted">$</span> curl <span class="t-str">"https://kaliaflstats.com/api/afl/v1/players/stats?year=2024&amp;round=1&amp;limit=2"</span> \
  -H <span class="t-str">"Authorization: Bearer YOUR_API_KEY"</span></pre>
		</div>

		<div class="terminal">
			<div class="terminal-bar">
				<div class="terminal-dots">
					<span class="dot dot-r"></span>
					<span class="dot dot-y"></span>
					<span class="dot dot-g"></span>
				</div>
				<span class="terminal-title">200 OK · application/json</span>
			</div>
			<pre
				class="terminal-body"
><span class="t-brace">{`{`}</span>
  <span class="t-key">"data"</span>: <span class="t-brace">[</span>
    <span class="t-brace">{`{`}</span>
      <span class="t-key">"playerId"</span>:       <span class="t-num">1421</span>,
      <span class="t-key">"playerName"</span>:     <span class="t-str">"Clayton Oliver"</span>,
      <span class="t-key">"teamId"</span>:         <span class="t-str">"melbourne"</span>,
      <span class="t-key">"kicks"</span>:          <span class="t-num">18</span>,
      <span class="t-key">"handballs"</span>:      <span class="t-num">22</span>,
      <span class="t-key">"disposals"</span>:      <span class="t-num">40</span>,
      <span class="t-key">"marks"</span>:          <span class="t-num">6</span>,
      <span class="t-key">"goals"</span>:          <span class="t-num">1</span>,
      <span class="t-key">"tackles"</span>:        <span class="t-num">8</span>,
      <span class="t-key">"aflFantasyPts"</span>:  <span class="t-num">142</span>,
      <span class="t-key">"supercoachPts"</span>:  <span class="t-num">138</span>
    <span class="t-brace">{`}`}</span><span class="t-muted">, ...</span>
  <span class="t-brace">]</span>,
  <span class="t-key">"meta"</span>: <span class="t-brace">{`{`}</span> <span class="t-key">"limit"</span>: <span class="t-num">2</span>, <span class="t-key">"offset"</span>: <span class="t-num">0</span>, <span class="t-key">"count"</span>: <span class="t-num">2</span>, <span class="t-key">"total"</span>: <span class="t-num">870</span> <span class="t-brace">{`}`}</span>
<span class="t-brace">{`}`}</span></pre>
		</div>
	</section>

	<!-- ── Endpoints ── -->
	<section class="endpoints" style="animation-delay: 580ms">
		<span class="section-label">endpoints</span>
		<div class="endpoint-grid">
			{#each [
				'/v1/teams',
				'/v1/players',
				'/v1/matches',
				'/v1/player-stats',
				'/v1/player-stats-advanced',
				'/v1/leaderboards',
				'/v1/head-to-head',
				'/v1/standings',
				'/v1/venues',
				'/v1/tips',
				'/v1/fixture ✦ public'
			] as ep}
				<span class="endpoint-chip">{ep}</span>
			{/each}
		</div>
		<a href="/docs" class="endpoints-note">full api reference →</a>
	</section>

	<!-- ── OSS Callout ── -->
	<section class="oss" style="animation-delay: 640ms">
		<div class="oss-inner">
			<div class="oss-left">
				<span class="oss-eyebrow">open source</span>
				<p class="oss-tagline">fully open source. read it, fork it, break it.</p>
			</div>
			<a
				href="https://github.com/MFergie121/kali-afl-stats"
				target="_blank"
				rel="noopener noreferrer"
				class="oss-link"
			>
				github/MFergie121/kali-afl-stats ↗
			</a>
		</div>
	</section>

	<!-- ── Sign-in Card ── -->
	<section class="signin-section" style="animation-delay: 700ms">
		<div class="card">
			<div class="card-logo-row">
				<Logo size={40} class="card-logo-icon" />
				<span class="card-wordmark">kali-afl</span>
			</div>
			<div class="card-divider"></div>
			<div class="card-body">
				{#if data.session}
					<p class="card-greeting">
						signed in as&nbsp;<span class="card-name">{data.session.user.name || data.session.user.email}</span>
					</p>
					<div class="card-actions">
						<Button href="/home/kali-afl" class="btn-full">enter</Button>
						<Button href="/auth/logout/{data.session.provider}" variant="destructive" class="btn-full">
							sign out
						</Button>
					</div>
				{:else}
					<p class="card-tagline">your workspace awaits</p>
					<Button href="/auth/login" class="btn-full">sign in</Button>
				{/if}
			</div>
		</div>
	</section>

	<!-- ── Prefs Footer ── -->
	<footer class="prefs">
		<DarkToggle />
		<ThemePicker />
		<FontPicker />
	</footer>

</div>

<style>
	/* ── Root ── */
	.root {
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		background-color: var(--background);
	}

	/* ── Animations ── */
	@keyframes rise {
		from { opacity: 0; transform: translateY(10px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── Hero ── */
	.hero {
		padding: 5rem 1.5rem 4rem;
		border-bottom: 1px solid var(--border);
		background-image: radial-gradient(circle, var(--border) 1px, transparent 1px);
		background-size: 24px 24px;
	}

	.hero-inner {
		max-width: 52rem;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.logo-row {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.wordmark {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--muted-foreground);
		letter-spacing: 0.02em;
	}

	.headline {
		font-size: clamp(2.5rem, 6vw, 4.25rem);
		font-weight: 700;
		color: var(--foreground);
		letter-spacing: -0.04em;
		line-height: 1.05;
		margin: 0;
		animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.tagline {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		letter-spacing: 0.04em;
		margin: 0;
		animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.hero-cta {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		flex-wrap: wrap;
		animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.github-link {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		text-decoration: none;
		letter-spacing: 0.02em;
		transition: color 0.15s ease;
	}

	.github-link:hover {
		color: var(--foreground);
	}

	/* Hero stats bar */
	.hero-stats {
		max-width: 52rem;
		margin: 2.5rem auto 0;
		display: flex;
		align-items: stretch;
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		overflow: hidden;
		background-color: var(--card);
		animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.hero-stat {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1.5rem 1rem;
		gap: 0.3rem;
	}

	.hero-stat-val {
		font-size: 1.875rem;
		font-weight: 700;
		color: var(--foreground);
		letter-spacing: -0.04em;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.hero-stat-label {
		font-size: 0.625rem;
		color: var(--muted-foreground);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.hero-divider {
		width: 1px;
		background-color: var(--border);
		flex-shrink: 0;
		align-self: stretch;
	}

	/* ── Shared ── */
	.section-label {
		display: block;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted-foreground);
		margin-bottom: 1.25rem;
	}

	/* ── Origin ── */
	.origin {
		max-width: 52rem;
		margin: 0 auto;
		padding: 5rem 1.5rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.origin-comment {
		font-size: 0.8125rem;
		color: var(--primary);
		letter-spacing: 0.02em;
	}

	.origin-text {
		font-size: 1.0625rem;
		color: var(--muted-foreground);
		line-height: 1.75;
		margin: 0;
		letter-spacing: -0.01em;
	}

	/* ── Features ── */
	.features {
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 1.5rem 5rem;
		width: 100%;
		animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}

	@media (max-width: 900px) {
		.feature-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 520px) {
		.feature-grid {
			grid-template-columns: 1fr;
		}
	}

	.feature-card {
		background-color: var(--card);
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.feature-card--primary {
		border-color: var(--primary);
		background-color: color-mix(in oklch, var(--card), var(--primary) 5%);
	}

	.feature-badge {
		display: inline-block;
		font-size: 0.5rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--primary);
		border: 1px solid var(--primary);
		border-radius: 0.25rem;
		padding: 0.125rem 0.375rem;
		align-self: flex-start;
	}

	.feature-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--foreground);
		margin: 0;
		letter-spacing: -0.02em;
	}

	.feature-desc {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		line-height: 1.6;
		margin: 0;
		flex: 1;
	}

	.feature-highlight {
		font-size: 1.625rem;
		font-weight: 700;
		color: var(--primary);
		letter-spacing: -0.04em;
		font-variant-numeric: tabular-nums;
		margin-top: auto;
		padding-top: 0.375rem;
	}

	/* ── Quick-look / Terminal ── */
	.quicklook {
		max-width: 52rem;
		margin: 0 auto;
		padding: 0 1.5rem 5rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.terminal {
		background-color: color-mix(in oklch, var(--background), black 30%);
		border: 1px solid color-mix(in oklch, var(--border), black 15%);
		border-radius: 0.625rem;
		overflow: hidden;
	}

	.terminal-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.875rem;
		border-bottom: 1px solid color-mix(in oklch, var(--border), black 15%);
		background-color: color-mix(in oklch, var(--background), black 40%);
	}

	.terminal-dots {
		display: flex;
		gap: 0.375rem;
	}

	.dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
	}

	.dot-r { background-color: #ff5f57; }
	.dot-y { background-color: #ffbd2e; }
	.dot-g { background-color: #28ca41; }

	.terminal-title {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.3);
		letter-spacing: 0.04em;
	}

	.terminal-body {
		padding: 1.25rem 1.5rem;
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.65);
		overflow-x: auto;
		white-space: pre;
	}

	.t-key   { color: var(--primary); }
	.t-str   { color: color-mix(in oklch, var(--primary), white 35%); }
	.t-num   { color: rgba(255, 255, 255, 0.85); }
	.t-brace { color: rgba(255, 255, 255, 0.45); }
	.t-muted { color: rgba(255, 255, 255, 0.2); }

	/* ── Endpoints ── */
	.endpoints {
		max-width: 52rem;
		margin: 0 auto;
		padding: 0 1.5rem 5rem;
		width: 100%;
		animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.endpoint-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.endpoint-chip {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		background-color: var(--card);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 0.3rem 0.625rem;
		letter-spacing: 0.01em;
		transition: border-color 0.15s ease, color 0.15s ease;
	}

	.endpoints-note {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		letter-spacing: 0.02em;
		margin: 0;
	}

	/* ── OSS Callout ── */
	.oss {
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		padding: 2.5rem 1.5rem;
		animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.oss-inner {
		max-width: 52rem;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.oss-left {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.oss-eyebrow {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted-foreground);
	}

	.oss-tagline {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--foreground);
		letter-spacing: -0.02em;
		margin: 0;
	}

	.oss-link {
		font-size: 0.8125rem;
		color: var(--primary);
		text-decoration: none;
		letter-spacing: 0.01em;
		transition: opacity 0.15s ease;
		white-space: nowrap;
	}

	.oss-link:hover {
		opacity: 0.7;
	}

	/* ── Sign-in Section ── */
	.signin-section {
		display: flex;
		justify-content: center;
		padding: 5rem 1.5rem;
		animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.card {
		width: 100%;
		max-width: 22rem;
		background-color: var(--card);
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.card-logo-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2.5rem 2rem 2rem;
	}

	.card-logo-row :global(.card-logo-icon) {
		color: var(--primary);
	}

	.card-wordmark {
		font-size: 1.375rem;
		font-weight: 600;
		letter-spacing: -0.03em;
		color: var(--foreground);
	}

	.card-divider {
		height: 1px;
		background-color: var(--border);
		margin: 0 1.5rem;
	}

	.card-body {
		padding: 1.75rem 2rem 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.card-tagline {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		text-align: center;
		letter-spacing: 0.02em;
		margin: 0;
	}

	.card-greeting {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		text-align: center;
		letter-spacing: 0.01em;
		margin: 0;
	}

	.card-name {
		color: var(--foreground);
		font-weight: 500;
	}

	.card-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.card-body :global(.btn-full) {
		width: 100%;
	}

	/* ── Prefs Footer ── */
	.prefs {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1.5rem;
		border-top: 1px solid var(--border);
	}

	/* ── Mobile ── */
	@media (max-width: 640px) {
		.hero {
			padding: 3.5rem 1.25rem 3rem;
		}

		.hero-stats {
			flex-direction: column;
			border-radius: 0.625rem;
		}

		.hero-stat {
			flex-direction: row;
			justify-content: space-between;
			padding: 0.875rem 1.25rem;
			border-bottom: 1px solid var(--border);
		}

		.hero-stat:last-child {
			border-bottom: none;
		}

		.hero-stat-val {
			font-size: 1.375rem;
		}

		.hero-divider {
			display: none;
		}

		.oss-inner {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.origin,
		.features,
		.quicklook,
		.endpoints {
			padding-bottom: 3.5rem;
		}

		.signin-section {
			padding: 3.5rem 1.5rem;
		}
	}
</style>
