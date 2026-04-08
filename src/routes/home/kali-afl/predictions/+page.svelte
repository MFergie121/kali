<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let expandedGame = $state<number | null>(null);

	function roundLabel(r: number): string {
		if (r === 0) return 'pre-season';
		if (r === 25) return 'finals wk 1';
		if (r === 26) return 'semi finals';
		if (r === 27) return 'prelim finals';
		if (r === 28) return 'grand final';
		return `round ${r}`;
	}

	function formatFixtureDate(dateStr: string | null): string {
		if (!dateStr) return 'TBC';
		const d = new Date(dateStr.replace(' ', 'T') + '+10:00');
		if (isNaN(d.getTime())) return dateStr;
		return new Intl.DateTimeFormat('en-AU', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: 'Australia/Sydney',
		}).format(d);
	}

	const FACTOR_LABELS: Record<string, string> = {
		form: 'Form',
		scoring: 'Scoring',
		stats: 'Team Stats',
		venue: 'Venue',
		h2h: 'Head-to-Head',
		squiggle: 'Tipsters',
	};

	const FACTOR_KEYS = ['form', 'scoring', 'stats', 'venue', 'h2h', 'squiggle'] as const;
</script>

<div class="page">

	<!-- ── Toolbar ── -->
	<div class="toolbar" style="animation-delay: 0ms">
		<div class="toolbar-left">
			<h1 class="page-title">predictions</h1>
			<span class="page-sub">kali model</span>
		</div>
	</div>

	<!-- ── Round chip bar ── -->
	{#if data.availableRounds.length > 0}
		<div class="round-chips-panel" style="animation-delay: 40ms">
			<div class="round-chips-header">
				<span class="round-chips-label">round</span>
			</div>
			<div class="round-chips-grid">
				{#each data.availableRounds as r (r)}
					<button
						class="round-chip"
						class:round-chip-on={r === data.selectedRound}
						onclick={() => goto(`?round=${r}`)}
					>{r === 0 ? 'pre' : r === 25 ? 'QF' : r === 26 ? 'SF' : r === 27 ? 'PF' : r === 28 ? 'GF' : `r${r}`}</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Predictions ── -->
	{#if data.predictions.length === 0}
		<div class="empty-state" style="animation-delay: 80ms">
			<p class="empty-title">no predictions available</p>
			<p class="empty-sub">no fixture data found for {roundLabel(data.selectedRound)}</p>
		</div>
	{:else}
		<p class="list-meta" style="animation-delay: 80ms">
			{roundLabel(data.selectedRound)}
			<span class="list-count">{data.predictions.length} game{data.predictions.length === 1 ? '' : 's'}</span>
		</p>

		<div class="predictions-list">
			{#each data.predictions as pred, i (pred.fixtureId)}
				{@const isExpanded = expandedGame === pred.fixtureId}
				{@const favoured = pred.homeProbability >= 50 ? 'home' : 'away'}
				{@const confidence = Math.max(pred.homeProbability, pred.awayProbability)}

				<div class="prediction-card" style="animation-delay: {120 + i * 50}ms">

					<!-- Header -->
					<button
						class="prediction-header"
						onclick={() => { expandedGame = isExpanded ? null : pred.fixtureId; }}
					>
						<div class="pred-team pred-team-home">
							<span class="pred-team-name" class:pred-favoured={favoured === 'home'}>
								{pred.homeTeam}
							</span>
							<span class="pred-pct" class:pred-pct-strong={favoured === 'home'}>
								{pred.homeProbability.toFixed(0)}%
							</span>
						</div>

						<div class="pred-center">
							<span class="pred-confidence">{confidence.toFixed(0)}%</span>
							<span class="pred-verdict">
								{favoured === 'home' ? pred.homeTeam : pred.awayTeam}
							</span>
						</div>

						<div class="pred-team pred-team-away">
							<span class="pred-pct" class:pred-pct-strong={favoured === 'away'}>
								{pred.awayProbability.toFixed(0)}%
							</span>
							<span class="pred-team-name" class:pred-favoured={favoured === 'away'}>
								{pred.awayTeam}
							</span>
						</div>
					</button>

					<!-- Probability bar -->
					<div class="prob-wrap">
						<div class="prob-bar">
							<div class="prob-bar-fill" style="width: {pred.homeProbability}%"></div>
						</div>
					</div>

					<!-- Factor chips + meta -->
					<div class="pred-footer">
						<div class="factor-chips">
							{#each pred.factors as factor (factor.label)}
								<span class="factor-chip" class:factor-home={factor.team === 'home'} class:factor-away={factor.team === 'away'}>
									{factor.label}
								</span>
							{/each}
						</div>
						<div class="pred-meta">
							{#if pred.venue}<span class="pred-meta-item">{pred.venue}</span>{/if}
							<span class="pred-meta-item">{formatFixtureDate(pred.date)}</span>
							<span class="chevron" class:chevron-open={isExpanded}>&#x25BC;</span>
						</div>
					</div>

					<!-- Expanded breakdown -->
					{#if isExpanded}
						<div class="breakdown">
							<div class="breakdown-header">
								<span class="breakdown-label">factor</span>
								<span class="breakdown-team-label">{pred.homeTeam}</span>
								<span class="breakdown-team-label">{pred.awayTeam}</span>
							</div>
							{#each FACTOR_KEYS as key (key)}
								{@const homeVal = pred.homeBreakdown[key]}
								{@const awayVal = pred.awayBreakdown[key]}
								{@const homeStronger = homeVal > awayVal}
								<div class="breakdown-row">
									<span class="breakdown-factor">{FACTOR_LABELS[key]}</span>
									<div class="breakdown-bar-cell">
										<div class="breakdown-bar">
											<div
												class="breakdown-bar-fill"
												class:bar-strong={homeStronger}
												class:bar-weak={!homeStronger}
												style="width: {homeVal}%"
											></div>
										</div>
										<span class="breakdown-val">{homeVal.toFixed(0)}</span>
									</div>
									<div class="breakdown-bar-cell">
										<div class="breakdown-bar">
											<div
												class="breakdown-bar-fill"
												class:bar-strong={!homeStronger}
												class:bar-weak={homeStronger}
												style="width: {awayVal}%"
											></div>
										</div>
										<span class="breakdown-val">{awayVal.toFixed(0)}</span>
									</div>
								</div>
							{/each}

							{#if pred.squiggleConsensus != null}
								<div class="squiggle-compare">
									<span class="squiggle-label">squiggle tipster consensus</span>
									<div class="prob-wrap prob-wrap-squiggle">
										<span class="prob-pct-sm">{pred.squiggleConsensus}%</span>
										<div class="prob-bar">
											<div class="prob-bar-fill prob-bar-fill-squiggle" style="width: {pred.squiggleConsensus}%"></div>
										</div>
										<span class="prob-pct-sm">{100 - pred.squiggleConsensus}%</span>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

</div>

<style>
	/* ── Layout ── */
	.page {
		max-width: 72rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	@keyframes rise {
		from { opacity: 0; transform: translateY(8px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── Toolbar ── */
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.toolbar-left {
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--foreground);
		letter-spacing: -0.02em;
		margin: 0;
	}

	.page-sub {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		letter-spacing: 0.03em;
	}

	/* ── Round chip bar ── */
	.round-chips-panel {
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		padding: 0.75rem 0.875rem;
		background-color: color-mix(in oklch, var(--muted), transparent 65%);
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.round-chips-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.625rem;
	}

	.round-chips-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	.round-chips-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.round-chip {
		font-size: 0.6875rem;
		font-family: inherit;
		padding: 0.2rem 0.5rem;
		border-radius: 0.3rem;
		border: 1px solid var(--border);
		background: var(--card);
		color: var(--muted-foreground);
		cursor: pointer;
		transition: all 0.1s ease;
		opacity: 0.6;
	}

	.round-chip:hover {
		border-color: var(--foreground);
		color: var(--foreground);
		opacity: 1;
	}

	.round-chip-on {
		background-color: var(--foreground);
		color: var(--background);
		border-color: var(--foreground);
		font-weight: 600;
		opacity: 1;
	}

	.round-chip-on:hover {
		opacity: 0.85;
	}

	/* ── List meta ── */
	.list-meta {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
		margin: 0;
	}

	.list-count {
		background-color: var(--secondary);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 0.1rem 0.45rem;
		font-size: 0.6875rem;
		letter-spacing: 0.02em;
	}

	/* ── Empty state ── */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		padding: 5rem 2rem;
		border: 1px dashed var(--border);
		border-radius: 0.75rem;
		text-align: center;
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.empty-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--foreground);
		margin: 0;
	}

	.empty-sub {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		margin: 0;
	}

	/* ── Predictions list ── */
	.predictions-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* ── Prediction card ── */
	.prediction-card {
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		background-color: var(--card);
		overflow: hidden;
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	/* ── Header ── */
	.prediction-header {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: none;
		border: none;
		cursor: pointer;
		transition: background-color 0.12s ease;
		font-family: inherit;
	}

	.prediction-header:hover {
		background-color: var(--secondary);
	}

	.pred-team {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pred-team-home {
		justify-content: flex-end;
	}

	.pred-team-away {
		justify-content: flex-start;
	}

	.pred-team-name {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--muted-foreground);
		transition: color 0.12s ease;
	}

	.pred-favoured {
		color: var(--foreground);
		font-weight: 600;
	}

	.pred-pct {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
		opacity: 0.6;
	}

	.pred-pct-strong {
		color: var(--primary);
		opacity: 1;
	}

	.pred-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
		min-width: 5rem;
	}

	.pred-confidence {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--primary);
		letter-spacing: -0.03em;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.pred-verdict {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 8rem;
	}

	/* ── Probability bar ── */
	.prob-wrap {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0 1.25rem 0.75rem;
	}

	.prob-bar {
		flex: 1;
		height: 0.25rem;
		border-radius: 9999px;
		background-color: color-mix(in oklch, var(--muted), transparent 30%);
		overflow: hidden;
	}

	.prob-bar-fill {
		height: 100%;
		background-color: var(--primary);
		border-radius: 9999px;
		transition: width 0.4s ease;
	}

	/* ── Factor chips + meta ── */
	.pred-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.625rem 1.25rem;
		border-top: 1px solid color-mix(in oklch, var(--border), transparent 50%);
	}

	.factor-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.factor-chip {
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		padding: 0.15rem 0.5rem;
		border-radius: 0.3rem;
		white-space: nowrap;
	}

	.factor-home {
		background-color: color-mix(in oklch, var(--primary), transparent 85%);
		color: var(--primary);
		border: 1px solid color-mix(in oklch, var(--primary), transparent 70%);
	}

	.factor-away {
		background-color: color-mix(in oklch, var(--muted), transparent 40%);
		color: var(--muted-foreground);
		border: 1px solid var(--border);
	}

	.pred-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.pred-meta-item {
		font-size: 0.625rem;
		color: var(--muted-foreground);
		letter-spacing: 0.02em;
		white-space: nowrap;
	}

	.chevron {
		font-size: 0.5rem;
		color: var(--muted-foreground);
		opacity: 0.5;
		transition: transform 0.2s ease;
	}

	.chevron-open {
		transform: rotate(180deg);
	}

	/* ── Expanded breakdown ── */
	.breakdown {
		border-top: 1px solid var(--border);
		padding: 0.75rem 1.25rem 1rem;
		background-color: color-mix(in oklch, var(--muted), transparent 75%);
	}

	.breakdown-header {
		display: grid;
		grid-template-columns: 5rem 1fr 1fr;
		gap: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 50%);
		margin-bottom: 0.375rem;
	}

	.breakdown-label {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	.breakdown-team-label {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted-foreground);
		text-align: right;
	}

	.breakdown-row {
		display: grid;
		grid-template-columns: 5rem 1fr 1fr;
		gap: 0.75rem;
		align-items: center;
		padding: 0.375rem 0;
	}

	.breakdown-factor {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--muted-foreground);
	}

	.breakdown-bar-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.breakdown-bar {
		flex: 1;
		height: 0.375rem;
		border-radius: 9999px;
		background-color: color-mix(in oklch, var(--muted), transparent 30%);
		overflow: hidden;
	}

	.breakdown-bar-fill {
		height: 100%;
		border-radius: 9999px;
		transition: width 0.3s ease;
	}

	.bar-strong {
		background-color: var(--primary);
	}

	.bar-weak {
		background-color: color-mix(in oklch, var(--muted-foreground), transparent 60%);
	}

	.breakdown-val {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
		min-width: 1.5rem;
		text-align: right;
	}

	/* ── Squiggle comparison ── */
	.squiggle-compare {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid color-mix(in oklch, var(--border), transparent 50%);
	}

	.squiggle-label {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
		display: block;
		margin-bottom: 0.375rem;
	}

	.prob-wrap-squiggle {
		padding: 0;
	}

	.prob-pct-sm {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
		min-width: 2rem;
	}

	.prob-bar-fill-squiggle {
		background-color: var(--muted-foreground);
		opacity: 0.5;
	}

	/* ── Responsive ── */
	@media (max-width: 640px) {
		.pred-team-name {
			font-size: 0.8125rem;
		}

		.pred-confidence {
			font-size: 1.25rem;
		}

		.pred-footer {
			flex-direction: column;
			align-items: flex-start;
		}

		.pred-meta {
			flex-wrap: wrap;
		}

		.breakdown-header,
		.breakdown-row {
			grid-template-columns: 4rem 1fr 1fr;
			gap: 0.5rem;
		}
	}
</style>
