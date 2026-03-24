<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const defaultRound = $derived(
		data.storedRounds.length > 0 ? data.storedRounds[data.storedRounds.length - 1] + 1 : 1,
	);
	let loading = $state(false);

	function roundLabel(r: number): string {
		return r === 0 ? 'Pre-Season' : `Round ${r}`;
	}
</script>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">admin</h1>
		<span class="page-sub">scraper controls</span>
	</div>

	<!-- ── Scrape form ── -->
	<div class="card">
		<p class="card-label">scrape round</p>

		<form
			method="POST"
			action="?/scrape"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
			class="form"
		>
			<div class="form-row">
				<div class="field">
					<label class="field-label" for="year">year</label>
					<select id="year" name="year" class="select">
						{#each data.allYears as year (year)}
							<option value={year} selected={year === data.selectedYear}>{year}</option>
						{/each}
					</select>
				</div>

				<div class="field">
					<label class="field-label" for="round">round</label>
					<select id="round" name="round" class="select">
						{#each data.allRounds as r (r)}
							<option value={r} selected={r === defaultRound}>{roundLabel(r)}</option>
						{/each}
					</select>
				</div>

				<button type="submit" class="btn-scrape" disabled={loading}>
					{loading ? 'scraping…' : 'scrape'}
				</button>
			</div>
		</form>

		<!-- Result -->
		{#if form?.success}
			<div class="result result-ok">
				scraped {form.matchesScraped} match{form.matchesScraped === 1 ? '' : 'es'} —
				{roundLabel(form.round)}, {form.year}
			</div>
		{:else if form?.error}
			<div class="result result-err">{form.error}</div>
		{/if}
	</div>

	<!-- ── Scraped rounds ── -->
	<div class="card">
		<p class="card-label">scraped rounds — {data.selectedYear}</p>
		{#if data.storedRounds.length === 0}
			<p class="empty">no rounds scraped yet for {data.selectedYear}</p>
		{:else}
			<div class="round-chips">
				{#each data.storedRounds as r (r)}
					<span class="round-chip">{roundLabel(r)}</span>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.page {
		max-width: 48rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.page-header {
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--foreground);
		letter-spacing: -0.02em;
	}

	.page-sub {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		letter-spacing: 0.03em;
	}

	.card {
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		background-color: var(--card);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.card-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	.form-row {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--muted-foreground);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.select {
		font-family: inherit;
		font-size: 0.875rem;
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background-color: var(--background);
		color: var(--foreground);
		cursor: pointer;
	}

	.select:focus {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	.btn-scrape {
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		padding: 0.4rem 1.25rem;
		border-radius: 0.375rem;
		border: none;
		background-color: var(--primary);
		color: var(--primary-foreground);
		cursor: pointer;
		transition: opacity 0.12s ease;
		white-space: nowrap;
	}

	.btn-scrape:hover:not(:disabled) {
		opacity: 0.88;
	}

	.btn-scrape:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.result {
		font-size: 0.8125rem;
		padding: 0.625rem 0.875rem;
		border-radius: 0.375rem;
	}

	.result-ok {
		background-color: color-mix(in oklch, var(--primary), transparent 88%);
		color: var(--foreground);
		border: 1px solid color-mix(in oklch, var(--primary), transparent 70%);
	}

	.result-err {
		background-color: color-mix(in oklch, var(--destructive), transparent 88%);
		color: var(--destructive);
		border: 1px solid color-mix(in oklch, var(--destructive), transparent 70%);
	}

	.empty {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.round-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.round-chip {
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.2rem 0.5rem;
		border-radius: 0.375rem;
		background-color: var(--secondary);
		border: 1px solid var(--border);
		color: var(--foreground);
	}
</style>
