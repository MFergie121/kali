<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="error-page">
	<div class="error-card">
		<span class="error-code">{page.status}</span>
		<h1 class="error-title">
			{#if page.status === 404}
				Page not found
			{:else if page.status === 403}
				Access denied
			{:else if page.status === 500}
				Something went wrong
			{:else}
				Error
			{/if}
		</h1>
		<p class="error-message">{page.error?.message ?? 'An unexpected error occurred.'}</p>
		<div class="error-actions">
			<a href="/home/kali-afl" class="btn-back">Back to dashboard</a>
		</div>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		padding: 2rem;
	}

	.error-card {
		max-width: 28rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.error-code {
		font-size: 4rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		color: var(--muted-foreground);
		opacity: 0.3;
		line-height: 1;
	}

	.error-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--foreground);
		letter-spacing: -0.02em;
	}

	.error-message {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		line-height: 1.5;
	}

	.error-actions {
		margin-top: 0.75rem;
	}

	.btn-back {
		display: inline-block;
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		padding: 0.5rem 1.25rem;
		border-radius: 0.375rem;
		background-color: var(--primary);
		color: var(--primary-foreground);
		text-decoration: none;
		transition: opacity 0.12s ease;
	}

	.btn-back:hover {
		opacity: 0.88;
	}
</style>
