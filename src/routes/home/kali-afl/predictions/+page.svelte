<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/state';
	import { formatFixtureDate, roundLongLabel } from '$lib/afl/format';
	import EmptyState from '$lib/components/ui/custom/emptyState.svelte';
	import RoundChips from '$lib/components/ui/custom/roundChips.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let expandedGame = $state<number | null>(null);
	let methodologyOpen = $state(false);

	const FACTOR_LABELS: Record<string, string> = {
		form: 'Form',
		scoring: 'Scoring',
		stats: 'Team Stats',
		venue: 'Venue',
		h2h: 'Head-to-Head',
		squiggle: 'Tipsters',
	};

	const FACTOR_KEYS = ['form', 'scoring', 'stats', 'venue', 'h2h', 'squiggle'] as const;

	type Outcome = 'correct' | 'wrong' | 'draw' | 'pending';

	function predictionOutcome(p: { homeProbability: number; actualWinner: 'home' | 'away' | 'draw' | null }): Outcome {
		if (p.actualWinner === null) return 'pending';
		if (p.actualWinner === 'draw') return 'draw';
		const favoured = p.homeProbability >= 50 ? 'home' : 'away';
		return favoured === p.actualWinner ? 'correct' : 'wrong';
	}

	const summary = $derived.by(() => {
		let hits = 0;
		let misses = 0;
		let pending = 0;
		for (const p of data.predictions) {
			const o = predictionOutcome(p);
			if (o === 'correct') hits++;
			else if (o === 'wrong') misses++;
			else pending++; // draws fold in here — neither hit nor miss
		}
		const decided = hits + misses;
		const accuracy = decided > 0 ? Math.round((hits / decided) * 100) : null;
		return { hits, misses, pending, decided, accuracy };
	});
</script>

<svelte:head>
	<title>Predictions · Kali AFL</title>
</svelte:head>

<div class="page" class:page-loading={!!navigating.to}>

	<!-- ── Toolbar ── -->
	<div class="toolbar" style="animation-delay: 0ms">
		<div class="toolbar-left">
			<h1 class="page-title">predictions</h1>
			<span class="page-sub">kali model</span>
		</div>
	</div>

	<!-- ── Round chip bar ── -->
	{#if data.availableRounds.length > 0}
		<RoundChips
			rounds={data.availableRounds}
			selected={data.selectedRound}
			onSelect={(r) => goto(`?round=${r}`)}
		/>
	{/if}

	<!-- ── Predictions ── -->
	{#if data.predictions.length === 0}
		{#if data.loadError}
			<EmptyState
				title="couldn't load predictions"
				sub="the database is unreachable right now — try again shortly"
			/>
		{:else if !data.hasFixtures}
			<EmptyState
				title="no predictions available"
				sub="no fixture data found for {roundLongLabel(data.selectedRound)}"
			/>
		{:else}
			<EmptyState
				title="predictions not generated yet"
				sub="fixtures exist for {roundLongLabel(data.selectedRound)}, but the model hasn't produced predictions for it"
			/>
		{/if}
	{:else}
		<p class="list-meta" style="animation-delay: 80ms">
			{roundLongLabel(data.selectedRound)}
			<span class="list-count">{data.predictions.length} game{data.predictions.length === 1 ? '' : 's'}</span>
		</p>

		{#if summary.decided > 0}
			<div class="summary-pills" style="animation-delay: 100ms">
				<span class="summary-pill summary-pill-correct">&check; {summary.hits} hit{summary.hits === 1 ? '' : 's'}</span>
				<span class="summary-pill summary-pill-wrong">&times; {summary.misses} miss{summary.misses === 1 ? '' : 'es'}</span>
				{#if summary.pending > 0}
					<span class="summary-pill summary-pill-pending">{summary.pending} pending</span>
				{/if}
				<span class="summary-accuracy">{summary.accuracy}% accuracy</span>
			</div>
		{/if}

		<div class="predictions-list">
			{#each data.predictions as pred, i (pred.fixtureId)}
				{@const isExpanded = expandedGame === pred.fixtureId}
				{@const favoured = pred.homeProbability >= 50 ? 'home' : 'away'}
				{@const confidence = Math.max(pred.homeProbability, pred.awayProbability)}
				{@const outcome = predictionOutcome(pred)}
				{@const actualTeam = pred.actualWinner === 'home' ? pred.homeTeam : pred.actualWinner === 'away' ? pred.awayTeam : null}

				<div
					class="prediction-card"
					class:card-correct={outcome === 'correct'}
					class:card-wrong={outcome === 'wrong'}
					class:card-draw={outcome === 'draw'}
					style="animation-delay: {120 + i * 50}ms"
				>

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
							{#if outcome === 'correct'}
								<span class="status-pill status-pill-correct">&check; correct</span>
							{:else if outcome === 'wrong'}
								<span class="status-pill status-pill-wrong">&times; wrong</span>
							{:else if outcome === 'draw'}
								<span class="status-pill status-pill-draw">draw</span>
							{/if}
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
							{#if actualTeam}
								<span class="pred-meta-item pred-meta-actual">actual: {actualTeam}</span>
							{:else if outcome === 'draw'}
								<span class="pred-meta-item pred-meta-actual">actual: draw</span>
							{/if}
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

	<!-- ── Methodology ── -->
	<div class="methodology-card" style="animation-delay: {160 + data.predictions.length * 50}ms">
		<button class="methodology-toggle" onclick={() => (methodologyOpen = !methodologyOpen)}>
			<span class="section-label">how predictions work</span>
			<span class="toggle-chevron" class:toggle-open={methodologyOpen}>&#x25B8;</span>
		</button>
		{#if methodologyOpen}
			<div class="methodology-body">
				<p class="methodology-intro">
					Each prediction is generated by a composite model that evaluates six weighted factors for both teams, then converts the rating difference into a win probability.
				</p>

				<div class="methodology-section">
					<h3 class="methodology-heading">factors & weights</h3>
					<div class="factor-table">
						<div class="factor-table-row factor-table-header">
							<span class="factor-table-name">Factor</span>
							<span class="factor-table-weight">Weight</span>
							<span class="factor-table-desc">Description</span>
						</div>
						<div class="factor-table-row">
							<span class="factor-table-name">Recent Form</span>
							<span class="factor-table-weight">20%</span>
							<span class="factor-table-desc">Win/loss record over the team's last 5 completed matches. Each win scores 20 points, a draw 10, and a loss 0, giving a 0-100 scale.</span>
						</div>
						<div class="factor-table-row">
							<span class="factor-table-name">Scoring Power</span>
							<span class="factor-table-weight">20%</span>
							<span class="factor-table-desc">Blends average winning margin (60%) with points percentage (40%) over the last 8 matches. A team averaging +50 point margins scores ~75, while -50 scores ~25.</span>
						</div>
						<div class="factor-table-row">
							<span class="factor-table-name">Team Stats</span>
							<span class="factor-table-weight">20%</span>
							<span class="factor-table-desc">Ranks all teams by six key per-game averages over the last 8 matches: disposals, inside 50s, clearances, tackles, contested possessions, and turnovers (inverted). The score is the average of each rank converted to a 0-100 scale.</span>
						</div>
						<div class="factor-table-row">
							<span class="factor-table-name">Venue</span>
							<span class="factor-table-weight">10%</span>
							<span class="factor-table-desc">Home teams start at 55, away at 45 (reflecting the ~7-8% AFL home advantage). This baseline is blended 50/50 with the team's win percentage at that specific venue over the last 3 years, when available.</span>
						</div>
						<div class="factor-table-row">
							<span class="factor-table-name">Head-to-Head</span>
							<span class="factor-table-weight">10%</span>
							<span class="factor-table-desc">Win rate from the last 6 meetings between the two teams across the past 3 seasons. Defaults to 50 (neutral) if no prior meetings exist.</span>
						</div>
						<div class="factor-table-row">
							<span class="factor-table-name">Tipster Consensus</span>
							<span class="factor-table-weight">20%</span>
							<span class="factor-table-desc">Average predicted win probability from Squiggle's tipster panel. When unavailable, this weight is redistributed equally across the other five factors.</span>
						</div>
					</div>
				</div>

				<div class="methodology-section">
					<h3 class="methodology-heading">probability conversion</h3>
					<p class="methodology-text">
						Each team's weighted factor scores are summed into a composite rating. The difference between the two ratings is then converted to a win probability using a logistic function:
					</p>
					<div class="formula-block">
						<code>P(home) = 1 / (1 + 10<sup>-d/30</sup>)</code>
					</div>
					<p class="methodology-text">
						where <code class="inline-code">d</code> is the rating difference (home - away). The divisor of 30 is calibrated so that a 30-point rating gap corresponds to approximately 75% win probability, which aligns with observed AFL outcomes.
					</p>
				</div>

				<div class="methodology-section">
					<h3 class="methodology-heading">key factors display</h3>
					<p class="methodology-text">
						For each game, the model identifies which factors contribute the most to the prediction gap. Each factor's impact is calculated as the absolute score difference between the two teams multiplied by the factor's weight. The top 3 are shown as chips on the prediction card.
					</p>
				</div>

				<div class="methodology-section">
					<h3 class="methodology-heading">data sources</h3>
					<p class="methodology-text">
						Historical match data and player statistics are sourced from FootyWire. Upcoming fixtures and tipster predictions are sourced from Squiggle. The model uses current-season data only (form, scoring, team stats) with multi-year lookback for venue records and head-to-head history.
					</p>
				</div>
			</div>
		{/if}
	</div>

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
		transition: opacity 0.15s ease;
	}
	.page-loading { opacity: 0.55; pointer-events: none; }

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
		position: relative;
	}

	.card-correct {
		background-color: color-mix(in oklch, var(--primary), var(--card) 92%);
		box-shadow: inset 3px 0 0 var(--primary);
	}

	.card-wrong {
		background-color: color-mix(in oklch, var(--destructive), var(--card) 92%);
		box-shadow: inset 3px 0 0 var(--destructive);
	}

	.card-draw {
		box-shadow: inset 3px 0 0 var(--muted-foreground);
	}

	/* ── Round summary pills ── */
	.summary-pills {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.summary-pill {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		padding: 0.2rem 0.55rem;
		border-radius: 0.3rem;
		border: 1px solid var(--border);
		font-variant-numeric: tabular-nums;
	}

	.summary-pill-correct {
		background-color: color-mix(in oklch, var(--primary), transparent 85%);
		color: var(--primary);
		border-color: color-mix(in oklch, var(--primary), transparent 70%);
	}

	.summary-pill-wrong {
		background-color: color-mix(in oklch, var(--destructive), transparent 85%);
		color: var(--destructive);
		border-color: color-mix(in oklch, var(--destructive), transparent 70%);
	}

	.summary-pill-pending {
		background-color: color-mix(in oklch, var(--muted), transparent 40%);
		color: var(--muted-foreground);
	}

	.summary-accuracy {
		margin-left: auto;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}

	/* ── Status pill (per-card) ── */
	.status-pill {
		font-size: 0.5625rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0.1rem 0.375rem;
		border-radius: 0.25rem;
		margin-top: 0.2rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.status-pill-correct {
		background-color: color-mix(in oklch, var(--primary), transparent 85%);
		color: var(--primary);
		border: 1px solid color-mix(in oklch, var(--primary), transparent 70%);
	}

	.status-pill-wrong {
		background-color: color-mix(in oklch, var(--destructive), transparent 85%);
		color: var(--destructive);
		border: 1px solid color-mix(in oklch, var(--destructive), transparent 70%);
	}

	.status-pill-draw {
		background-color: color-mix(in oklch, var(--muted), transparent 40%);
		color: var(--muted-foreground);
		border: 1px solid var(--border);
	}

	.pred-meta-actual {
		color: var(--foreground);
		font-weight: 600;
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

	/* ── Methodology ── */
	.methodology-card {
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		background-color: var(--card);
		overflow: hidden;
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.methodology-toggle {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.875rem 1.25rem;
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		transition: background-color 0.12s ease;
	}

	.methodology-toggle:hover {
		background-color: var(--secondary);
	}

	.section-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	.toggle-chevron {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	.toggle-open {
		transform: rotate(90deg);
	}

	.methodology-body {
		border-top: 1px solid var(--border);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.methodology-intro {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		line-height: 1.6;
		margin: 0;
	}

	.methodology-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.methodology-heading {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--foreground);
		margin: 0;
	}

	.methodology-text {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		line-height: 1.6;
		margin: 0;
	}

	/* ── Factor table ── */
	.factor-table {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.factor-table-row {
		display: grid;
		grid-template-columns: 7.5rem 3.5rem 1fr;
		gap: 0.75rem;
		padding: 0.5rem 0.875rem;
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 50%);
		align-items: baseline;
	}

	.factor-table-row:last-child {
		border-bottom: none;
	}

	.factor-table-header {
		background-color: color-mix(in oklch, var(--muted), transparent 60%);
	}

	.factor-table-header .factor-table-name,
	.factor-table-header .factor-table-weight,
	.factor-table-header .factor-table-desc {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	.factor-table-name {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--foreground);
	}

	.factor-table-weight {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--primary);
		font-variant-numeric: tabular-nums;
	}

	.factor-table-desc {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		line-height: 1.5;
	}

	/* ── Formula block ── */
	.formula-block {
		padding: 0.75rem 1rem;
		background-color: color-mix(in oklch, var(--muted), transparent 50%);
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		text-align: center;
	}

	.formula-block code {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--foreground);
		letter-spacing: -0.01em;
	}

	.inline-code {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--foreground);
		background-color: color-mix(in oklch, var(--muted), transparent 50%);
		padding: 0.1rem 0.3rem;
		border-radius: 0.25rem;
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

		.factor-table-row {
			grid-template-columns: 5.5rem 2.5rem 1fr;
			gap: 0.5rem;
			padding: 0.5rem 0.625rem;
		}
	}
</style>
