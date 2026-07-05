<script lang="ts">
	let {
		bars,
		selectedId = null,
		onToggle,
		caption,
	}: {
		bars: { id: number; delta: number; label: string }[];
		selectedId?: number | null;
		onToggle?: (id: number) => void;
		caption?: string;
	} = $props();

	const BW = 18;
	const GAP = 5;
	const HALF = 68;
	const TH = HALF * 2 + 22;

	const W = $derived(Math.max(1, bars.length * (BW + GAP) - GAP));
	const maxAbs = $derived(Math.max(1, ...bars.map((b) => Math.abs(b.delta))));

	function toggle(id: number) {
		onToggle?.(id);
	}
</script>

<div class="chart-wrap">
	{#if caption}<p class="chart-label">{caption}</p>{/if}
	<div class="chart-scroll">
		<svg viewBox="0 0 {W} {TH}" class="chart-svg" style="min-width:{W}px" role="img" aria-label={caption}>
			<line x1="0" y1={HALF} x2={W} y2={HALF} stroke="var(--border)" stroke-width="1"/>
			{#each bars as b, i (b.id)}
				{@const bh = Math.max(2, (Math.abs(b.delta) / maxAbs) * HALF)}
				{@const bx = i * (BW + GAP)}
				{@const by = b.delta > 0 ? HALF - bh : HALF}
				{@const fill = b.delta > 0 ? 'var(--success)' : b.delta < 0 ? 'var(--destructive)' : 'var(--muted-foreground)'}
				<rect
					x={bx} y={by} width={BW} height={bh} {fill} rx="2"
					opacity={selectedId != null && selectedId !== b.id ? 0.35 : 1}
					class="chart-bar"
					role="button" tabindex="0"
					aria-label="{b.label}: {b.delta > 0 ? '+' : ''}{Math.round(b.delta * 10) / 10}"
					onclick={() => toggle(b.id)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(b.id); } }}
				/>
				{#if bars.length <= 30}
					<text x={bx + BW / 2} y={TH - 3} text-anchor="middle" font-size="7" fill="var(--muted-foreground)" font-family="inherit">{b.label}</text>
				{/if}
			{/each}
		</svg>
	</div>
</div>

<style>
	.chart-wrap   { display: flex; flex-direction: column; gap: 0.5rem; }
	.chart-label  { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); margin: 0; }
	.chart-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 0.625rem; padding: 0.75rem 1rem; background-color: var(--card); }
	.chart-svg    { display: block; height: 160px; }
	.chart-bar    { cursor: pointer; transition: opacity 0.12s ease; }
	.chart-bar:hover { opacity: 0.75 !important; }
</style>
