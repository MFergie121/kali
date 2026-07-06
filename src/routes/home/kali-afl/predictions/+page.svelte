<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/state';
	import { formatFixtureDate, roundLongLabel } from '$lib/afl/format';
	import EmptyState from '$lib/components/ui/custom/emptyState.svelte';
	import RoundChips from '$lib/components/ui/custom/roundChips.svelte';
	import type { PageData } from './$types';
	import type { PredictionRow } from './+page.server';

	let { data }: { data: PageData } = $props();

	let expandedGame = $state<number | null>(null);
	let methodologyOpen = $state(false);

	type Outcome = 'correct' | 'wrong' | 'draw' | 'pending';

	function favoured(p: PredictionRow): 'home' | 'away' {
		return p.homeProbability >= 50 ? 'home' : 'away';
	}

	function outcome(p: PredictionRow): Outcome {
		if (p.actualWinner === null) return 'pending';
		if (p.actualWinner === 'draw') return 'draw';
		return favoured(p) === p.actualWinner ? 'correct' : 'wrong';
	}

	function marginError(p: PredictionRow): number | null {
		if (p.predictedMargin === null || p.actualMargin === null || p.actualWinner === null) return null;
		return Math.abs(p.predictedMargin - p.actualMargin);
	}

	/** Model disagrees with the tipster consensus on who wins. */
	function isUpsetPick(p: PredictionRow): boolean {
		return p.squiggleConsensus !== null && (p.squiggleConsensus >= 50) !== (p.homeProbability >= 50);
	}

	function verdict(p: PredictionRow): string {
		const short = favoured(p) === 'home' ? p.homeShortName : p.awayShortName;
		const m = Math.abs(p.predictedMargin ?? 0);
		return m >= 1 ? `${short} by ${m}` : `${short} · line-ball`;
	}

	function actualText(p: PredictionRow): string | null {
		if (p.actualWinner === null) return null;
		if (p.actualWinner === 'draw') return 'draw';
		const short = p.actualWinner === 'home' ? p.homeShortName : p.awayShortName;
		return p.actualMargin !== null ? `${short} by ${Math.abs(p.actualMargin)}` : short;
	}

	function signed(v: number): string {
		return v > 0 ? `+${v}` : `${v}`;
	}

	/** Points for an inline sparkline polyline, normalised into a w×h box. */
	function sparkPoints(values: number[], w: number, h: number): string {
		if (values.length === 0) return '';
		if (values.length === 1) return `0,${h / 2} ${w},${h / 2}`;
		const min = Math.min(...values);
		const max = Math.max(...values);
		const span = Math.max(max - min, 1);
		const pad = 2;
		return values
			.map((v, i) => {
				const x = (i / (values.length - 1)) * w;
				const y = pad + (1 - (v - min) / span) * (h - pad * 2);
				return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
			})
			.join(' ');
	}

	const summary = $derived.by(() => {
		let hits = 0;
		let misses = 0;
		let pending = 0;
		for (const p of data.predictions) {
			const o = outcome(p);
			if (o === 'correct') hits++;
			else if (o === 'wrong') misses++;
			else pending++; // draws fold in here — neither hit nor miss
		}
		return { hits, misses, pending, decided: hits + misses };
	});

	const benchmark = $derived.by(() => {
		const b = data.scoreboard.benchmark;
		if (!b || b.games === 0) return null;
		const model = (b.modelHits / b.games) * 100;
		const tipsters = (b.tipsterHits / b.games) * 100;
		return {
			games: b.games,
			model: Math.round(model * 10) / 10,
			tipsters: Math.round(tipsters * 10) / 10,
			delta: Math.round((model - tipsters) * 10) / 10,
		};
	});

	// ── Backtest chart geometry ──
	const chart = $derived.by(() => {
		const seasons = data.backtest.seasons;
		const live =
			data.scoreboard.accuracy !== null && data.scoreboard.decided >= 20
				? { year: data.year, accuracy: data.scoreboard.accuracy }
				: null;
		const bw = 22;
		const gap = 6;
		const n = seasons.length + (live ? 1 : 0);
		const yMin = 45;
		const yMax = 80;
		const plotH = 150;
		const axisW = 26;
		const labelH = 16;
		const w = axisW + n * (bw + gap) - gap;
		const y = (v: number) => plotH - ((v - yMin) / (yMax - yMin)) * plotH;
		return { seasons, live, bw, gap, yMin, yMax, plotH, axisW, labelH, w, y };
	});

	const factorLegend = $derived.by(() => {
		const p = data.backtest.params;
		return [
			{
				name: 'rating edge',
				detail: `Elo difference between the sides. Ratings update after every match across the last ${p.historyYears} seasons (K=${p.k}, margin-weighted) and regress ${Math.round(p.seasonRegression * 100)}% to the mean between seasons.`,
			},
			{
				name: 'home ground',
				detail: `A constant +${p.homeAdvantage} rating points to the designated home side.`,
			},
			{
				name: 'recent scoring form',
				detail: `${p.formWeight} rating points per point of net-margin differential over each side's last ${p.formWindow} games — recent scoring beyond what the ratings have absorbed.`,
			},
			{
				name: 'venue record',
				detail: `Up to ±${p.venueWeight} rating points for a side's win rate at this ground (last 3 years, min ${p.venueMinGames} games) relative to its overall record.`,
			},
			{
				name: 'travel',
				detail: `−${p.travelPenalty} rating points to any side playing outside its home state.`,
			},
			{
				name: 'rest & head-to-head',
				detail: `Tested as candidates and pruned by the backtest — neither improved held-out accuracy, so both carry zero weight. They're still shown as context on each game.`,
			},
		];
	});
</script>

<svelte:head>
	<title>Predictions · Kali AFL</title>
</svelte:head>

{#snippet teamPanel(name: string, breakdown: PredictionRow['homeBreakdown'], side: 'home' | 'away')}
	<div class="team-panel">
		<div class="team-panel-head">
			<span class="team-panel-name" class:panel-home={side === 'home'}>{name}</span>
			<span class="team-panel-elo">{breakdown.elo}<span class="elo-unit">elo</span></span>
		</div>
		{#if breakdown.eloHistory.length > 1}
			<svg class="spark" viewBox="0 0 120 28" preserveAspectRatio="none" role="img" aria-label="{name} season rating trend">
				<polyline
					points={sparkPoints(breakdown.eloHistory, 120, 28)}
					fill="none"
					stroke={side === 'home' ? 'var(--primary)' : 'var(--muted-foreground)'}
					stroke-width="2"
					stroke-linejoin="round"
					stroke-linecap="round"
				/>
			</svg>
		{/if}
		<div class="team-facts">
			{#if breakdown.form.length > 0}
				<span class="team-fact form-fact">
					{#each breakdown.form as r, i (i)}
						<span class="form-dot" class:form-w={r === 'W'} class:form-l={r === 'L'}>{r}</span>
					{/each}
				</span>
			{/if}
			{#if breakdown.attack !== null && breakdown.defence !== null}
				<span class="team-fact">{breakdown.attack} for · {breakdown.defence} against <span class="fact-dim">(last 8)</span></span>
			{/if}
			{#if breakdown.venueRecord}
				<span class="team-fact">{breakdown.venueRecord.wins}–{breakdown.venueRecord.played - breakdown.venueRecord.wins} here <span class="fact-dim">(3yr)</span></span>
			{/if}
			{#if breakdown.restDays !== null}
				<span class="team-fact">{breakdown.restDays} days rest</span>
			{/if}
		</div>
	</div>
{/snippet}

<div class="page" class:page-loading={!!navigating.to}>

	<!-- ── Toolbar ── -->
	<div class="toolbar" style="animation-delay: 0ms">
		<div class="toolbar-left">
			<h1 class="page-title">predictions</h1>
			<span class="page-sub">kali model v2 · elo + adjustments</span>
		</div>
	</div>

	<!-- ── Season scoreboard ── -->
	{#if data.scoreboard.decided > 0}
		<div class="scoreboard" style="animation-delay: 40ms">
			<div class="score-tiles">
				<div class="score-tile">
					<span class="score-value">{data.scoreboard.accuracy}%</span>
					<span class="score-label">tip accuracy</span>
					<span class="score-sub">{data.scoreboard.hits}/{data.scoreboard.decided} this season</span>
				</div>
				<div class="score-tile">
					<span class="score-value">{data.scoreboard.marginMae ?? '—'}</span>
					<span class="score-label">avg margin error</span>
					<span class="score-sub">points per game</span>
				</div>
				<div class="score-tile">
					<span class="score-value">{data.scoreboard.brier?.toFixed(3) ?? '—'}</span>
					<span class="score-label">brier score</span>
					<span class="score-sub">0.25 = coin flip</span>
				</div>
				{#if benchmark}
					<div class="score-tile">
						<span class="score-value" class:score-ahead={benchmark.delta > 0} class:score-behind={benchmark.delta < 0}>
							{signed(benchmark.delta)}<span class="score-value-unit">pts</span>
						</span>
						<span class="score-label">vs tipster consensus</span>
						<span class="score-sub">model {benchmark.model}% · tipsters {benchmark.tipsters}%</span>
					</div>
				{/if}
			</div>
			{#if data.scoreboard.rounds.length > 1}
				<div class="round-strip" role="img" aria-label="accuracy by round">
					{#each data.scoreboard.rounds as r (r.round)}
						{@const pct = r.decided > 0 ? r.hits / r.decided : 0}
						<button
							class="round-bar-btn"
							class:round-bar-current={r.round === data.selectedRound}
							onclick={() => goto(`?round=${r.round}`)}
							title="{roundLongLabel(r.round)}: {r.hits}/{r.decided} correct"
						>
							<span class="round-bar" style="height: {Math.max(8, pct * 100)}%"></span>
						</button>
					{/each}
					<span class="round-strip-label">accuracy by round</span>
				</div>
			{/if}
		</div>
	{/if}

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
			{#if summary.decided > 0}
				<span class="summary-pill summary-pill-correct">&check; {summary.hits}</span>
				<span class="summary-pill summary-pill-wrong">&times; {summary.misses}</span>
				{#if summary.pending > 0}
					<span class="summary-pill summary-pill-pending">{summary.pending} pending</span>
				{/if}
			{/if}
		</p>

		<div class="predictions-list">
			{#each data.predictions as pred, i (pred.fixtureId)}
				{@const isExpanded = expandedGame === pred.fixtureId}
				{@const fav = favoured(pred)}
				{@const o = outcome(pred)}
				{@const err = marginError(pred)}
				{@const upset = isUpsetPick(pred)}
				{@const visibleContribs = pred.factors.contributions.filter((c) => Math.abs(c.value) >= 0.5)}
				{@const maxAbs = Math.max(1, ...visibleContribs.map((c) => Math.abs(c.value)))}

				<div
					class="prediction-card"
					class:card-correct={o === 'correct'}
					class:card-wrong={o === 'wrong'}
					class:card-draw={o === 'draw'}
					style="animation-delay: {120 + i * 40}ms"
				>

					<!-- Header -->
					<button
						class="prediction-header"
						aria-expanded={isExpanded}
						onclick={() => { expandedGame = isExpanded ? null : pred.fixtureId; }}
					>
						<div class="pred-team pred-team-home">
							<span class="pred-team-name" class:pred-favoured={fav === 'home'}>
								{pred.homeTeam}
							</span>
							<span class="pred-pct" class:pred-pct-strong={fav === 'home'}>
								{pred.homeProbability.toFixed(0)}%
							</span>
						</div>

						<div class="pred-center">
							<span class="pred-verdict-main">{verdict(pred)}</span>
							<span class="pred-verdict-sub">{Math.max(pred.homeProbability, pred.awayProbability).toFixed(0)}% win probability</span>
							{#if o === 'correct'}
								<span class="status-pill status-pill-correct">&check; correct{err !== null ? ` · off by ${err}` : ''}</span>
							{:else if o === 'wrong'}
								<span class="status-pill status-pill-wrong">&times; wrong{err !== null ? ` · off by ${err}` : ''}</span>
							{:else if o === 'draw'}
								<span class="status-pill status-pill-draw">draw</span>
							{:else if upset}
								<span class="status-pill status-pill-upset">&#9889; upset pick</span>
							{/if}
						</div>

						<div class="pred-team pred-team-away">
							<span class="pred-pct" class:pred-pct-strong={fav === 'away'}>
								{pred.awayProbability.toFixed(0)}%
							</span>
							<span class="pred-team-name" class:pred-favoured={fav === 'away'}>
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

					<!-- Footer: consensus + meta -->
					<div class="pred-footer">
						<div class="pred-footer-left">
							{#if pred.squiggleConsensus != null}
								<span class="consensus-chip" class:consensus-disagree={upset}>
									tipsters: {pred.squiggleConsensus >= 50 ? pred.homeShortName : pred.awayShortName}
									{pred.squiggleConsensus >= 50 ? pred.squiggleConsensus : 100 - pred.squiggleConsensus}%
								</span>
							{/if}
							{#if actualText(pred)}
								<span class="pred-meta-item pred-meta-actual">actual: {actualText(pred)}</span>
							{/if}
						</div>
						<div class="pred-meta">
							{#if pred.venue}<span class="pred-meta-item">{pred.venue}</span>{/if}
							<span class="pred-meta-item">{formatFixtureDate(pred.date)}</span>
							<span class="chevron" class:chevron-open={isExpanded}>&#x25BC;</span>
						</div>
					</div>

					<!-- Expanded why-panel -->
					{#if isExpanded}
						<div class="breakdown">
							<div class="contrib-header">
								<span class="contrib-side">&#9666; {pred.homeShortName}</span>
								<span class="contrib-title">what moved the number</span>
								<span class="contrib-side">{pred.awayShortName} &#9656;</span>
							</div>
							{#each visibleContribs as c (c.key)}
								<div class="contrib-row">
									<span class="contrib-label">{c.label}</span>
									<div class="contrib-bar-track">
										<span class="contrib-mid"></span>
										<span
											class="contrib-bar"
											class:contrib-home={c.value > 0}
											class:contrib-away={c.value < 0}
											style="width: {(Math.abs(c.value) / maxAbs) * 50}%; {c.value > 0 ? 'right: 50%' : 'left: 50%'}"
										></span>
									</div>
									<span class="contrib-value">{signed(c.value)}</span>
								</div>
							{/each}
							<div class="contrib-total">
								total edge {signed(pred.factors.totalEdge)} &rarr;
								<strong>{fav === 'home' ? pred.homeTeam : pred.awayTeam}</strong>
								{Math.max(pred.homeProbability, pred.awayProbability).toFixed(0)}%{pred.predictedMargin !== null && Math.abs(pred.predictedMargin) >= 1 ? ` · by ${Math.abs(pred.predictedMargin)}` : ''}
							</div>

							<div class="context-grid">
								{@render teamPanel(pred.homeTeam, pred.homeBreakdown, 'home')}
								<div class="context-mid">
									{#if pred.factors.h2h.homeWins + pred.factors.h2h.awayWins + pred.factors.h2h.draws > 0}
										<span class="mid-fact">
											<span class="mid-fact-label">last {pred.factors.h2h.homeWins + pred.factors.h2h.awayWins + pred.factors.h2h.draws} meetings</span>
											{pred.homeShortName} {pred.factors.h2h.homeWins}–{pred.factors.h2h.awayWins} {pred.awayShortName}{pred.factors.h2h.draws > 0 ? ` · ${pred.factors.h2h.draws}d` : ''}
										</span>
									{/if}
									{#if pred.squiggleConsensus != null}
										<span class="mid-fact">
											<span class="mid-fact-label">tipster consensus</span>
											<span class="consensus-bar-wrap">
												<span class="consensus-pct">{pred.squiggleConsensus}%</span>
												<span class="consensus-bar"><span class="consensus-fill" style="width: {pred.squiggleConsensus}%"></span></span>
												<span class="consensus-pct">{100 - pred.squiggleConsensus}%</span>
											</span>
										</span>
									{/if}
								</div>
								{@render teamPanel(pred.awayTeam, pred.awayBreakdown, 'away')}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- ── Model performance ── -->
	<div class="perf-card" style="animation-delay: {160 + data.predictions.length * 40}ms">
		<div class="perf-head">
			<span class="section-label">model performance</span>
			<span class="perf-sub">walk-forward backtest · tuned {data.backtest.tunedOn} · validated {data.backtest.validatedOn}</span>
		</div>

		<div class="perf-chart-scroll">
			<svg
				viewBox="0 0 {chart.w} {chart.plotH + chart.labelH}"
				class="perf-svg"
				style="min-width: {chart.w}px"
				role="img"
				aria-label="Model tip accuracy by season, backtested 2003 onwards"
			>
				{#each [50, 60, 70, 80] as g (g)}
					<line x1={chart.axisW} y1={chart.y(g)} x2={chart.w} y2={chart.y(g)} stroke="var(--border)" stroke-width="1" />
					<text x={chart.axisW - 5} y={chart.y(g) + 3} text-anchor="end" class="axis-text">{g}</text>
				{/each}
				{#each chart.seasons as s, i (s.year)}
					{@const x = chart.axisW + i * (chart.bw + chart.gap)}
					{@const barY = chart.y(s.accuracy)}
					<rect
						{x}
						y={barY}
						width={chart.bw}
						height={chart.plotH - barY}
						rx="3"
						fill="var(--primary)"
						opacity="0.85"
					>
						<title>{s.year}: {s.accuracy}% ({s.games} games) · brier {s.brier} · margin MAE {s.marginMae} · home-team baseline {s.homeBaselineAccuracy}%</title>
					</rect>
					<line
						x1={x}
						y1={chart.y(s.homeBaselineAccuracy)}
						x2={x + chart.bw}
						y2={chart.y(s.homeBaselineAccuracy)}
						stroke="var(--foreground)"
						stroke-width="1.5"
						opacity="0.55"
					/>
					<text x={x + chart.bw / 2} y={chart.plotH + 12} text-anchor="middle" class="axis-text">'{String(s.year).slice(2)}</text>
				{/each}
				{#if chart.live}
					{@const x = chart.axisW + chart.seasons.length * (chart.bw + chart.gap)}
					{@const barY = chart.y(chart.live.accuracy)}
					<rect
						{x}
						y={barY}
						width={chart.bw}
						height={chart.plotH - barY}
						rx="3"
						fill="none"
						stroke="var(--primary)"
						stroke-width="2"
					>
						<title>{chart.live.year} (live): {chart.live.accuracy}% on {data.scoreboard.decided} settled games</title>
					</rect>
					<text x={x + chart.bw / 2} y={chart.plotH + 12} text-anchor="middle" class="axis-text">'{String(chart.live.year).slice(2)}*</text>
				{/if}
			</svg>
		</div>
		<p class="perf-legend">
			<span class="legend-swatch"></span> model tip accuracy (%)
			<span class="legend-tick"></span> home-team baseline
			{#if chart.live}<span class="legend-live"></span> live season{/if}
		</p>

		<!-- Methodology -->
		<button class="methodology-toggle" onclick={() => (methodologyOpen = !methodologyOpen)}>
			<span class="section-label">how the model works</span>
			<span class="toggle-chevron" class:toggle-open={methodologyOpen}>&#x25B8;</span>
		</button>
		{#if methodologyOpen}
			<div class="methodology-body">
				<p class="methodology-text">
					Every game is scored as a single <strong>edge</strong> in rating points for the home side: the Elo rating
					difference plus a small set of situational adjustments. That one number converts to a win probability and an
					expected margin — so the contribution rows on each card always sum to the prediction. The model is fully
					independent of the Squiggle tipster panel; consensus is shown purely as a benchmark to grade against.
				</p>
				<div class="factor-table">
					{#each factorLegend as f (f.name)}
						<div class="factor-table-row">
							<span class="factor-table-name">{f.name}</span>
							<span class="factor-table-desc">{f.detail}</span>
						</div>
					{/each}
				</div>
				<div class="formula-block">
					<code>P(home) = 1 / (1 + 10<sup>&minus;edge/400</sup>)</code>
					<code>margin &asymp; edge &times; {data.backtest.params.pointsPerElo}</code>
				</div>
				<p class="methodology-text">
					Parameters were fitted by replaying each season in order with a rolling {data.backtest.params.historyYears}-season
					training window — predict, grade, then update — choosing
					the values that minimised the Brier score on {data.backtest.tunedOn}. The chart above reports that same
					replay per season; {data.backtest.validatedOn} was never fitted on, so those bars are honest out-of-sample
					results. Match data comes from FootyWire; fixtures and tipster consensus from Squiggle.
				</p>
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

	/* ── Scoreboard ── */
	.scoreboard {
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		background-color: var(--card);
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.score-tiles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
		gap: 1rem;
	}

	.score-tile {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.score-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--foreground);
		letter-spacing: -0.03em;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}

	.score-value-unit {
		font-size: 0.75rem;
		font-weight: 600;
		margin-left: 0.125rem;
		color: var(--muted-foreground);
	}

	.score-ahead { color: var(--success); }
	.score-behind { color: var(--destructive); }

	.score-label {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	.score-sub {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		opacity: 0.8;
		font-variant-numeric: tabular-nums;
	}

	.round-strip {
		display: flex;
		align-items: flex-end;
		gap: 3px;
		height: 2.25rem;
		position: relative;
		padding-top: 0.25rem;
		border-top: 1px solid color-mix(in oklch, var(--border), transparent 50%);
	}

	.round-bar-btn {
		flex: 0 0 0.875rem;
		height: 100%;
		display: flex;
		align-items: flex-end;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.round-bar {
		width: 100%;
		border-radius: 2px 2px 0 0;
		background-color: color-mix(in oklch, var(--primary), transparent 45%);
		transition: background-color 0.12s ease;
	}

	.round-bar-btn:hover .round-bar { background-color: var(--primary); }
	.round-bar-current .round-bar { background-color: var(--primary); }

	.round-strip-label {
		position: absolute;
		right: 0;
		top: 0.375rem;
		font-size: 0.5625rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	/* ── List meta ── */
	.list-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
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

	.summary-pill {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		padding: 0.15rem 0.5rem;
		border-radius: 0.3rem;
		border: 1px solid var(--border);
		font-variant-numeric: tabular-nums;
		text-transform: none;
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

	/* ── Predictions list ── */
	.predictions-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

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

	/* ── Card header ── */
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

	.pred-team-home { justify-content: flex-end; }
	.pred-team-away { justify-content: flex-start; }

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
		min-width: 7rem;
	}

	.pred-verdict-main {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--primary);
		letter-spacing: -0.02em;
		line-height: 1.1;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.pred-verdict-sub {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted-foreground);
		white-space: nowrap;
	}

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

	.status-pill-upset {
		background-color: color-mix(in oklch, var(--success), transparent 85%);
		color: var(--success);
		border: 1px solid color-mix(in oklch, var(--success), transparent 70%);
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

	/* ── Card footer ── */
	.pred-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.625rem 1.25rem;
		border-top: 1px solid color-mix(in oklch, var(--border), transparent 50%);
	}

	.pred-footer-left {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.consensus-chip {
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		padding: 0.15rem 0.5rem;
		border-radius: 0.3rem;
		background-color: color-mix(in oklch, var(--muted), transparent 40%);
		color: var(--muted-foreground);
		border: 1px solid var(--border);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.consensus-disagree {
		background-color: color-mix(in oklch, var(--success), transparent 88%);
		color: var(--success);
		border-color: color-mix(in oklch, var(--success), transparent 70%);
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

	.pred-meta-actual {
		color: var(--foreground);
		font-weight: 600;
	}

	.chevron {
		font-size: 0.5rem;
		color: var(--muted-foreground);
		opacity: 0.5;
		transition: transform 0.2s ease;
	}

	.chevron-open { transform: rotate(180deg); }

	/* ── Why panel ── */
	.breakdown {
		border-top: 1px solid var(--border);
		padding: 0.875rem 1.25rem 1.125rem;
		background-color: color-mix(in oklch, var(--muted), transparent 75%);
	}

	.contrib-header {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: baseline;
		gap: 0.75rem;
		padding-bottom: 0.5rem;
	}

	.contrib-title {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	.contrib-side {
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--muted-foreground);
	}

	.contrib-side:first-child { text-align: left; color: var(--primary); }
	.contrib-side:last-child { text-align: right; }

	.contrib-row {
		display: grid;
		grid-template-columns: 10rem 1fr 3rem;
		gap: 0.75rem;
		align-items: center;
		padding: 0.25rem 0;
	}

	.contrib-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--muted-foreground);
	}

	.contrib-bar-track {
		position: relative;
		height: 0.5rem;
		border-radius: 9999px;
		background-color: color-mix(in oklch, var(--muted), transparent 30%);
		overflow: hidden;
	}

	.contrib-mid {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		width: 1px;
		background-color: var(--border);
	}

	.contrib-bar {
		position: absolute;
		top: 1px;
		bottom: 1px;
		border-radius: 9999px;
		min-width: 2px;
	}

	.contrib-home { background-color: var(--primary); }
	.contrib-away { background-color: color-mix(in oklch, var(--muted-foreground), transparent 25%); }

	.contrib-value {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.contrib-total {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid color-mix(in oklch, var(--border), transparent 50%);
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}

	.contrib-total strong { color: var(--foreground); font-weight: 600; }

	/* ── Context grid ── */
	.context-grid {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 1.25rem;
		margin-top: 0.875rem;
		padding-top: 0.875rem;
		border-top: 1px solid color-mix(in oklch, var(--border), transparent 50%);
	}

	.team-panel {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		min-width: 0;
	}

	.team-panel-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.team-panel-name {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.panel-home { color: var(--primary); }

	.team-panel-elo {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
	}

	.elo-unit {
		font-size: 0.5625rem;
		font-weight: 600;
		color: var(--muted-foreground);
		margin-left: 0.125rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.spark {
		width: 100%;
		height: 1.75rem;
		display: block;
	}

	.team-facts {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.team-fact {
		font-size: 0.625rem;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}

	.fact-dim { opacity: 0.65; }

	.form-fact { display: flex; gap: 0.2rem; }

	.form-dot {
		font-size: 0.5625rem;
		font-weight: 700;
		width: 1rem;
		height: 1rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		background-color: color-mix(in oklch, var(--muted), transparent 40%);
		color: var(--muted-foreground);
	}

	.form-w {
		background-color: color-mix(in oklch, var(--success), transparent 82%);
		color: var(--success);
	}

	.form-l {
		background-color: color-mix(in oklch, var(--destructive), transparent 85%);
		color: var(--destructive);
	}

	.context-mid {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.625rem;
		min-width: 10rem;
	}

	.mid-fact {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.6875rem;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
		text-align: center;
	}

	.mid-fact-label {
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	.consensus-bar-wrap {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.consensus-pct {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}

	.consensus-bar {
		flex: 1;
		height: 0.25rem;
		border-radius: 9999px;
		background-color: color-mix(in oklch, var(--muted), transparent 30%);
		overflow: hidden;
	}

	.consensus-fill {
		display: block;
		height: 100%;
		background-color: var(--muted-foreground);
		opacity: 0.6;
		border-radius: 9999px;
	}

	/* ── Model performance ── */
	.perf-card {
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		background-color: var(--card);
		overflow: hidden;
		animation: rise 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
		padding: 1rem 1.25rem 0;
	}

	.perf-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.875rem;
	}

	.section-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	.perf-sub {
		font-size: 0.625rem;
		color: var(--muted-foreground);
		letter-spacing: 0.02em;
	}

	.perf-chart-scroll { overflow-x: auto; }

	.perf-svg {
		display: block;
		height: 170px;
	}

	.axis-text {
		font-size: 8px;
		fill: var(--muted-foreground);
		font-family: inherit;
	}

	.perf-legend {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.625rem;
		color: var(--muted-foreground);
		margin: 0.625rem 0 0.875rem;
	}

	.legend-swatch {
		width: 0.75rem;
		height: 0.5rem;
		border-radius: 2px;
		background-color: var(--primary);
		opacity: 0.85;
	}

	.legend-tick {
		width: 0.75rem;
		height: 2px;
		background-color: var(--foreground);
		opacity: 0.55;
		margin-left: 0.75rem;
	}

	.legend-live {
		width: 0.75rem;
		height: 0.5rem;
		border-radius: 2px;
		border: 2px solid var(--primary);
		margin-left: 0.75rem;
	}

	/* ── Methodology ── */
	.methodology-toggle {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.875rem 0;
		background: none;
		border: none;
		border-top: 1px solid var(--border);
		cursor: pointer;
		font-family: inherit;
	}

	.toggle-chevron {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	.toggle-open { transform: rotate(90deg); }

	.methodology-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 1.25rem;
	}

	.methodology-text {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		line-height: 1.6;
		margin: 0;
	}

	.methodology-text strong { color: var(--foreground); font-weight: 600; }

	.factor-table {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.factor-table-row {
		display: grid;
		grid-template-columns: 9rem 1fr;
		gap: 0.75rem;
		padding: 0.5rem 0.875rem;
		border-bottom: 1px solid color-mix(in oklch, var(--border), transparent 50%);
		align-items: baseline;
	}

	.factor-table-row:last-child { border-bottom: none; }

	.factor-table-name {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--foreground);
	}

	.factor-table-desc {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		line-height: 1.5;
	}

	.formula-block {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 2rem;
		justify-content: center;
		padding: 0.75rem 1rem;
		background-color: color-mix(in oklch, var(--muted), transparent 50%);
		border: 1px solid var(--border);
		border-radius: 0.5rem;
	}

	.formula-block code {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--foreground);
		letter-spacing: -0.01em;
	}

	/* ── Responsive ── */
	@media (max-width: 640px) {
		.pred-team-name { font-size: 0.8125rem; }
		.pred-verdict-main { font-size: 1rem; }

		.pred-footer {
			flex-direction: column;
			align-items: flex-start;
		}

		.pred-meta { flex-wrap: wrap; }

		.contrib-row {
			grid-template-columns: 6.5rem 1fr 2.5rem;
			gap: 0.5rem;
		}

		.context-grid {
			grid-template-columns: 1fr;
		}

		.context-mid { min-width: 0; }

		.factor-table-row {
			grid-template-columns: 1fr;
			gap: 0.2rem;
		}
	}
</style>
