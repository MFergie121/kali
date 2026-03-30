<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const defaultRound = $derived(
		data.storedRounds.length > 0 ? data.storedRounds[data.storedRounds.length - 1] + 1 : 1,
	);
	let loading = $state(false);

	// ── Scrape single match state ─────────────────────────────────────────────
	let matchMid = $state('');
	let matchLoading = $state(false);
	let matchResult = $state<{ success?: boolean; error?: string; mid?: number; round?: number; year?: number; homeTeam?: string; awayTeam?: string; homeScore?: number; awayScore?: number } | null>(null);

	async function scrapeMatch() {
		const mid = parseInt(matchMid, 10);
		if (isNaN(mid) || mid <= 0) {
			matchResult = { error: 'Enter a valid match ID.' };
			return;
		}
		matchLoading = true;
		matchResult = null;
		try {
			const res = await fetch('/api/afl/admin/scrape/match', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mid }),
			});
			matchResult = await res.json();
		} catch {
			matchResult = { error: 'Network error.' };
		}
		matchLoading = false;
	}

	// ── Scrape latest game state ──────────────────────────────────────────────
	let latestYear = $state(data.selectedYear);
	let latestLoading = $state(false);
	let latestResult = $state<{ success?: boolean; error?: string; mid?: number; round?: number; year?: number; homeTeam?: string; awayTeam?: string; homeScore?: number; awayScore?: number } | null>(null);

	async function scrapeLatest() {
		latestLoading = true;
		latestResult = null;
		try {
			const res = await fetch('/api/afl/admin/scrape/latest', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ year: latestYear }),
			});
			latestResult = await res.json();
		} catch {
			latestResult = { error: 'Network error.' };
		}
		latestLoading = false;
	}

	// ── Bulk scrape state ──────────────────────────────────────────────────────
	const MAX_ROUND = 27;

	let bulkFromYear = $state(data.selectedYear);
	let bulkToYear   = $state(data.selectedYear);
	let bulkRunning  = $state(false);
	let bulkAbort    = $state(false);

	type RoundStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';
	interface RoundResult { status: RoundStatus; matchesScraped?: number; error?: string }

	let bulkResults  = $state<Record<string, RoundResult>>({});
	let bulkDone     = $state(0);
	let bulkSkipped  = $state(0);
	let bulkErrors   = $state(0);
	let bulkTotal    = $state(0);
	let bulkCurrent  = $state<{ year: number; round: number } | null>(null);
	let bulkFinished = $state(false);

	const bulkProgress = $derived(bulkTotal > 0 ? ((bulkDone + bulkSkipped + bulkErrors) / bulkTotal) * 100 : 0);

	async function startBulkScrape() {
		bulkRunning  = true;
		bulkAbort    = false;
		bulkFinished = false;
		bulkResults  = {};
		bulkDone     = 0;
		bulkSkipped  = 0;
		bulkErrors   = 0;
		bulkCurrent  = null;

		const years: number[] = [];
		for (let y = bulkFromYear; y <= bulkToYear; y++) years.push(y);
		const rounds = Array.from({ length: MAX_ROUND + 1 }, (_, i) => i);
		bulkTotal = years.length * rounds.length;

		for (const year of years) {
			for (const round of rounds) {
				if (bulkAbort) break;

				const key = `${year}-${round}`;
				bulkCurrent = { year, round };
				bulkResults[key] = { status: 'running' };

				try {
					const res = await fetch('/api/afl/admin/scrape', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ year, round }),
					});
					const json = await res.json();

					if (json.success) {
						bulkResults[key] = { status: 'done', matchesScraped: json.matchesScraped };
						bulkDone++;
					} else if (res.status === 422) {
						bulkResults[key] = { status: 'skipped' };
						bulkSkipped++;
					} else {
						bulkResults[key] = { status: 'error', error: json.error ?? 'Unknown error' };
						bulkErrors++;
					}
				} catch (e) {
					bulkResults[key] = { status: 'error', error: 'Network error' };
					bulkErrors++;
				}
			}
			if (bulkAbort) break;
		}

		bulkRunning  = false;
		bulkFinished = !bulkAbort;
		bulkCurrent  = null;
	}

	function roundLabel(r: number): string {
		return r === 0 ? 'Pre-Season' : `Round ${r}`;
	}

	function roundKey(year: number, round: number): string {
		return `${year}-${round}`;
	}
</script>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">admin</h1>
		<span class="page-sub">scraper controls</span>
	</div>

	<!-- ── Scrape single round ── -->
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

				<button type="submit" class="btn-primary" disabled={loading}>
					{loading ? 'scraping…' : 'scrape'}
				</button>
			</div>
		</form>

		{#if form?.success}
			<div class="result result-ok">
				scraped {form.matchesScraped} match{form.matchesScraped === 1 ? '' : 'es'} —
				{roundLabel(form.round)}, {form.year}
			</div>
		{:else if form?.error}
			<div class="result result-err">{form.error}</div>
		{/if}
	</div>

	<!-- ── Scrape single match ── -->
	<div class="card">
		<p class="card-label">scrape match</p>
		<p class="card-hint">scrape a single match by its footywire match ID (mid).</p>

		<div class="form-row">
			<div class="field">
				<label class="field-label" for="match-mid">match id</label>
				<input
					id="match-mid"
					type="number"
					class="input"
					placeholder="e.g. 12345"
					bind:value={matchMid}
					disabled={matchLoading}
				/>
			</div>

			<button class="btn-primary" disabled={matchLoading} onclick={scrapeMatch}>
				{matchLoading ? 'scraping…' : 'scrape'}
			</button>
		</div>

		{#if matchResult?.success}
			<div class="result result-ok">
				scraped mid {matchResult.mid} — {roundLabel(matchResult.round ?? 0)}, {matchResult.year}: {matchResult.homeTeam} {matchResult.homeScore} v {matchResult.awayTeam} {matchResult.awayScore}
			</div>
		{:else if matchResult?.error}
			<div class="result result-err">{matchResult.error}</div>
		{/if}
	</div>

	<!-- ── Scrape latest game ── -->
	<div class="card">
		<p class="card-label">scrape latest game</p>
		<p class="card-hint">find and scrape the most recently completed game for a given year.</p>

		<div class="form-row">
			<div class="field">
				<label class="field-label" for="latest-year">year</label>
				<select id="latest-year" class="select" bind:value={latestYear} disabled={latestLoading}>
					{#each data.allYears as year (year)}
						<option value={year}>{year}</option>
					{/each}
				</select>
			</div>

			<button class="btn-primary" disabled={latestLoading} onclick={scrapeLatest}>
				{latestLoading ? 'scraping…' : 'scrape latest'}
			</button>
		</div>

		{#if latestResult?.success}
			<div class="result result-ok">
				scraped mid {latestResult.mid} — {roundLabel(latestResult.round ?? 0)}, {latestResult.year}: {latestResult.homeTeam} {latestResult.homeScore} v {latestResult.awayTeam} {latestResult.awayScore}
			</div>
		{:else if latestResult?.error}
			<div class="result result-err">{latestResult.error}</div>
		{/if}
	</div>

	<!-- ── Scrape year / range ── -->
	<div class="card">
		<p class="card-label">scrape year / range</p>
		<p class="card-hint">scrapes all rounds (0–27) for the selected year or range. rounds with no data are skipped automatically.</p>

		<div class="form-row">
			<div class="field">
				<label class="field-label" for="bulk-from">from</label>
				<select
					id="bulk-from"
					class="select"
					disabled={bulkRunning}
					bind:value={bulkFromYear}
					onchange={() => { if (bulkToYear < bulkFromYear) bulkToYear = bulkFromYear; }}
				>
					{#each data.allYears as year (year)}
						<option value={year}>{year}</option>
					{/each}
				</select>
			</div>

			<div class="field">
				<label class="field-label" for="bulk-to">to</label>
				<select
					id="bulk-to"
					class="select"
					disabled={bulkRunning}
					bind:value={bulkToYear}
				>
					{#each data.allYears.filter(y => y >= bulkFromYear) as year (year)}
						<option value={year}>{year}</option>
					{/each}
				</select>
			</div>

			{#if !bulkRunning}
				<button class="btn-primary" onclick={startBulkScrape}>
					scrape
				</button>
			{:else}
				<button class="btn-cancel" onclick={() => (bulkAbort = true)}>
					cancel
				</button>
			{/if}
		</div>

		<!-- Progress -->
		{#if bulkRunning || bulkFinished || bulkAbort}
			<div class="bulk-progress">

				<!-- Status line -->
				<div class="bulk-status">
					{#if bulkRunning && bulkCurrent}
						<span class="bulk-status-text">
							scraping {bulkCurrent.year} · {roundLabel(bulkCurrent.round).toLowerCase()}…
						</span>
					{:else if bulkFinished}
						<span class="bulk-status-text bulk-status-done">complete</span>
					{:else if bulkAbort && !bulkRunning}
						<span class="bulk-status-text bulk-status-cancel">cancelled</span>
					{/if}
					<span class="bulk-counters">
						{#if bulkDone > 0}<span class="counter counter-done">{bulkDone} scraped</span>{/if}
						{#if bulkSkipped > 0}<span class="counter counter-skip">{bulkSkipped} skipped</span>{/if}
						{#if bulkErrors > 0}<span class="counter counter-err">{bulkErrors} errors</span>{/if}
					</span>
				</div>

				<!-- Progress bar -->
				<div class="progress-track">
					<div class="progress-fill" style="width: {bulkProgress}%"></div>
				</div>

				<!-- Round grid -->
				{#each Array.from({ length: bulkToYear - bulkFromYear + 1 }, (_, i) => bulkFromYear + i) as year (year)}
					<div class="bulk-year-block">
						{#if bulkToYear > bulkFromYear}
							<p class="bulk-year-label">{year}</p>
						{/if}
						<div class="bulk-round-grid">
							{#each Array.from({ length: MAX_ROUND + 1 }, (_, i) => i) as r (r)}
								{@const key = roundKey(year, r)}
								{@const result = bulkResults[key]}
								<span
									class="bulk-chip"
									class:bulk-chip-running={result?.status === 'running'}
									class:bulk-chip-done={result?.status === 'done'}
									class:bulk-chip-skip={result?.status === 'skipped'}
									class:bulk-chip-err={result?.status === 'error'}
									title={result?.status === 'done'
										? `${result.matchesScraped} match${result.matchesScraped === 1 ? '' : 'es'} scraped`
										: result?.status === 'error'
										? result.error
										: result?.status ?? 'pending'}
								>{r === 0 ? 'pre' : `r${r}`}</span>
							{/each}
						</div>
					</div>
				{/each}

			</div>
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

	.card-hint {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		margin-top: -0.375rem;
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

	.input,
	.select {
		font-family: inherit;
		font-size: 0.875rem;
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background-color: var(--background);
		color: var(--foreground);
	}

	.select {
		cursor: pointer;
	}

	.input:focus,
	.select:focus {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	.input:disabled,
	.select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
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

	.btn-primary:hover:not(:disabled) { opacity: 0.88; }
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

	.btn-cancel {
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		padding: 0.4rem 1.25rem;
		border-radius: 0.375rem;
		border: 1px solid var(--border);
		background: none;
		color: var(--muted-foreground);
		cursor: pointer;
		transition: color 0.12s ease, border-color 0.12s ease;
		white-space: nowrap;
	}

	.btn-cancel:hover {
		color: var(--foreground);
		border-color: var(--foreground);
	}

	/* ── Bulk progress ── */
	.bulk-progress {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.bulk-status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.bulk-status-text {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.bulk-status-done { color: var(--foreground); font-weight: 500; }
	.bulk-status-cancel { color: var(--muted-foreground); }

	.bulk-counters {
		display: flex;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.counter {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.15rem 0.45rem;
		border-radius: 0.3rem;
		border: 1px solid;
	}

	.counter-done {
		color: var(--primary);
		border-color: color-mix(in oklch, var(--primary), transparent 60%);
		background-color: color-mix(in oklch, var(--primary), transparent 88%);
	}

	.counter-skip {
		color: var(--muted-foreground);
		border-color: var(--border);
		background-color: var(--secondary);
	}

	.counter-err {
		color: var(--destructive);
		border-color: color-mix(in oklch, var(--destructive), transparent 60%);
		background-color: color-mix(in oklch, var(--destructive), transparent 88%);
	}

	/* Progress bar */
	.progress-track {
		height: 0.25rem;
		border-radius: 9999px;
		background-color: color-mix(in oklch, var(--muted), transparent 30%);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background-color: var(--primary);
		border-radius: 9999px;
		transition: width 0.3s ease;
	}

	/* Round status grid */
	.bulk-year-block {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.bulk-year-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted-foreground);
	}

	.bulk-round-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.bulk-chip {
		font-size: 0.625rem;
		font-family: inherit;
		padding: 0.15rem 0.4rem;
		border-radius: 0.25rem;
		border: 1px solid var(--border);
		background: var(--card);
		color: var(--muted-foreground);
		opacity: 0.4;
		cursor: default;
		transition: all 0.15s ease;
	}

	.bulk-chip-running {
		opacity: 1;
		border-color: var(--primary);
		color: var(--primary);
		animation: pulse 1s ease-in-out infinite;
	}

	.bulk-chip-done {
		opacity: 1;
		background-color: var(--foreground);
		color: var(--background);
		border-color: var(--foreground);
		font-weight: 600;
	}

	.bulk-chip-skip {
		opacity: 0.4;
		color: var(--muted-foreground);
	}

	.bulk-chip-err {
		opacity: 1;
		border-color: color-mix(in oklch, var(--destructive), transparent 40%);
		color: var(--destructive);
		background-color: color-mix(in oklch, var(--destructive), transparent 90%);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* ── Result banners ── */
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

	/* ── Scraped rounds chip list ── */
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
