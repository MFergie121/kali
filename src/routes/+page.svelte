<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import DarkToggle from '$lib/components/ui/custom/darkToggle.svelte';
	import FontPicker from '$lib/components/ui/custom/fontPicker.svelte';
	import Logo from '$lib/components/ui/custom/logo.svelte';
	import ThemePicker from '$lib/components/ui/custom/themePicker.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="root">
	<main class="card">
		<div class="logo-wrap">
			<Logo size={52} class="logo-icon" />
			<span class="wordmark">Kali-AFL</span>
		</div>

		<div class="divider"></div>

		<div class="body">
			{#if data.session}
				<p class="greeting">
					signed in as&nbsp;<span class="name">{data.session.user.name || data.session.user.email}</span>
				</p>
				<div class="actions">
					<Button href="/home/kali-afl" class="btn-full">enter</Button>
					<Button href="/auth/logout/{data.session.provider}" variant="destructive" class="btn-full">
						sign out
					</Button>
				</div>
			{:else}
				<p class="tagline">your workspace awaits</p>
				<Button href="/auth/login" class="btn-full">sign in</Button>
			{/if}
		</div>
	</main>

	<footer class="prefs">
		<DarkToggle />
		<ThemePicker />
		<FontPicker />
	</footer>
</div>

<style>
	.root {
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background-color: var(--background);
		padding: 1.5rem;
		gap: 1.25rem;
	}

	.card {
		width: 100%;
		max-width: 22rem;
		background-color: var(--card);
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		overflow: hidden;
		animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.logo-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2.5rem 2rem 2rem;
	}

	.logo-wrap :global(.logo-icon) {
		color: var(--primary);
	}

	.wordmark {
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: -0.03em;
		color: var(--foreground);
	}

	.divider {
		height: 1px;
		background-color: var(--border);
		margin: 0 1.5rem;
	}

	.body {
		padding: 1.75rem 2rem 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.tagline {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		text-align: center;
		letter-spacing: 0.02em;
	}

	.greeting {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		text-align: center;
		letter-spacing: 0.01em;
	}

	.name {
		color: var(--foreground);
		font-weight: 500;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.body :global(.btn-full) {
		width: 100%;
	}

	.prefs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		animation: rise 0.4s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
</style>
