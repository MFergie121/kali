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

	const navItems = [
		{ href: 'home/kali-afl-scraper', label: 'afl stats', description: 'Australian football data' },
		{ href: 'home/global-friends',   label: 'global friends', description: 'Worldwide connections' },
		{ href: 'home/bpt',              label: 'bpt', description: 'BPT tools' },
	];
</script>

{#if data.session}
<div class="root">
	<div class="card" style="animation-delay: 0ms">
		<div class="profile">
			{#if data.session.user.image}
				<img src={data.session.user.image} alt="Avatar" class="avatar" />
			{/if}
			<div class="profile-text">
				<p class="profile-name">{data.session.user.name}</p>
				<p class="profile-meta">{data.session.user.email}</p>
			</div>
			<span class="provider-badge">{data.session.provider}</span>
		</div>
	</div>

	<nav class="card nav-card" style="animation-delay: 60ms">
		{#each navItems as item, i}
			<a href={item.href} class="nav-item" style="animation-delay: {80 + i * 40}ms">
				<span class="nav-label">{item.label}</span>
				<span class="nav-desc">{item.description}</span>
				<span class="nav-arrow">→</span>
			</a>
			{#if i < navItems.length - 1}
				<div class="nav-divider"></div>
			{/if}
		{/each}
	</nav>

	<div class="card signout-card" style="animation-delay: 220ms">
		<Button
			href="/auth/logout/{data.session.provider}"
			variant="ghost"
			class="signout-btn"
		>
			sign out
		</Button>
	</div>
</div>
{/if}

<style>
	.root {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 2.5rem 1.5rem;
		min-height: 100%;
	}

	.card {
		width: 100%;
		max-width: 22rem;
		background-color: var(--card);
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		overflow: hidden;
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes rise {
		from { opacity: 0; transform: translateY(8px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* — Profile — */
	.profile {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 1.25rem 1.5rem;
	}

	.avatar {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 9999px;
		flex-shrink: 0;
		border: 1px solid var(--border);
	}

	.profile-text {
		flex: 1;
		min-width: 0;
	}

	.profile-name {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.profile-meta {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.provider-badge {
		font-size: 0.6875rem;
		letter-spacing: 0.04em;
		color: var(--muted-foreground);
		background-color: var(--secondary);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 0.2rem 0.5rem;
		flex-shrink: 0;
		text-transform: lowercase;
	}

	/* — Nav — */
	.nav-card {
		padding: 0.375rem 0;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1.5rem;
		text-decoration: none;
		transition: background-color 0.15s ease;
		cursor: pointer;
	}

	.nav-item:hover {
		background-color: var(--secondary);
	}

	.nav-item:hover .nav-arrow {
		transform: translateX(3px);
		color: var(--primary);
	}

	.nav-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--foreground);
		flex: 1;
	}

	.nav-desc {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.nav-arrow {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		transition: transform 0.15s ease, color 0.15s ease;
		flex-shrink: 0;
	}

	.nav-divider {
		height: 1px;
		background-color: var(--border);
		margin: 0 1.5rem;
	}

	/* — Sign out — */
	.signout-card {
		background-color: transparent;
		border-color: transparent;
	}

	.signout-card :global(.signout-btn) {
		width: 100%;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		letter-spacing: 0.01em;
	}

	.signout-card :global(.signout-btn:hover) {
		color: var(--destructive);
		background-color: transparent;
	}
</style>
