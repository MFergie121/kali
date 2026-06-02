<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const navItems = [
		{ label: 'Overview', href: '/docs' },
		{ label: 'Teams', href: '/docs/teams' },
		{ label: 'Players', href: '/docs/players' },
		{ label: 'Matches', href: '/docs/matches' },
		{ label: 'Player Stats', href: '/docs/player-stats' },
		{ label: 'Standings', href: '/docs/standings' },
		{ label: 'Fixture', href: '/docs/fixture' },
		{ label: 'Tips', href: '/docs/tips' },
		{ label: 'Predictions', href: '/docs/predictions' },
		{ label: 'Leaderboards', href: '/docs/leaderboards' }
	];

	let sidebarOpen = $state(false);

	const isActive = (href: string) => page.url.pathname === href;
</script>

<!-- ── Minimal public nav ── -->
<header class="doc-nav">
	<div class="flex items-center gap-3">
		<button
			type="button"
			class="text-foreground hover:bg-accent rounded-md p-1.5 md:hidden"
			aria-label="Toggle navigation"
			onclick={() => (sidebarOpen = !sidebarOpen)}
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="3" y1="12" x2="21" y2="12" />
				<line x1="3" y1="18" x2="21" y2="18" />
			</svg>
		</button>
		<a href="/" class="doc-nav-brand">kali-afl</a>
	</div>
	<a href="/auth/login" class="doc-nav-cta">get api key →</a>
</header>

<div class="mx-auto flex max-w-6xl gap-8 px-4">
	<!-- Desktop sidebar -->
	<aside class="hidden w-52 shrink-0 md:block">
		<nav class="sticky top-16 space-y-1 py-8">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class="block rounded-md px-3 py-2 text-sm transition-colors {isActive(item.href)
						? 'bg-accent text-foreground font-medium'
						: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
				>
					{item.label}
				</a>
			{/each}
		</nav>
	</aside>

	<!-- Main content -->
	<main class="min-w-0 flex-1 py-6 pb-24">
		{@render children()}
	</main>
</div>

<!-- Mobile drawer -->
{#if sidebarOpen}
	<div class="fixed inset-0 z-50 md:hidden">
		<button
			type="button"
			class="bg-background/80 absolute inset-0"
			aria-label="Close navigation"
			onclick={() => (sidebarOpen = false)}
		></button>
		<nav class="border-border bg-background absolute left-0 top-0 h-full w-64 space-y-1 border-r p-4">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					onclick={() => (sidebarOpen = false)}
					class="block rounded-md px-3 py-2 text-sm {isActive(item.href)
						? 'bg-accent text-foreground font-medium'
						: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
				>
					{item.label}
				</a>
			{/each}
		</nav>
	</div>
{/if}

<style>
	.doc-nav {
		position: sticky;
		top: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--border);
		background-color: var(--background);
	}

	.doc-nav-brand {
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--foreground);
		text-decoration: none;
		letter-spacing: -0.02em;
	}

	.doc-nav-cta {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--primary);
		text-decoration: none;
		padding: 0.3rem 0.75rem;
		border: 1px solid var(--primary);
		border-radius: 0.375rem;
		transition:
			background-color 0.12s ease,
			color 0.12s ease;
	}

	.doc-nav-cta:hover {
		background-color: var(--primary);
		color: var(--primary-foreground);
	}

	:global(.doc-cta-btn) {
		display: inline-block;
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--primary-foreground);
		background-color: var(--primary);
		padding: 0.6rem 1.5rem;
		border-radius: 0.5rem;
		text-decoration: none;
		transition: opacity 0.12s ease;
	}

	:global(.doc-cta-btn):hover {
		opacity: 0.88;
	}
</style>
