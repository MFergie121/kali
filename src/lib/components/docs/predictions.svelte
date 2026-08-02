<script lang="ts">
	import TryItPanel from '$lib/components/ui/custom/tryItPanel.svelte';
</script>

<section class="space-y-10">
	<h1 class="text-2xl font-bold">Predictions</h1>
	<p class="text-muted-foreground text-sm">
		Win-probability and margin predictions for AFL fixtures, computed by an Elo rating model trained on the last five seasons of results, with situational adjustments (home ground, recent scoring form, venue record, interstate travel).
		The model is independent of the Squiggle tipster panel — <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">squiggleConsensus</code> is stored alongside each prediction purely as a benchmark.
		Predictions are versioned — <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">model_version</code> tags each row so historical predictions are preserved when the algorithm changes;
		the current model is <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">v2</code>, and rows tagged <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">v1</code> carry the legacy factor-score payloads instead of the shapes below.
		Probabilities are floats (<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">72.5</code> = 72.5%); margins are points, positive toward the home side.
	</p>

	<!-- GET /predictions -->
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/predictions</code>
		</div>
		<p class="text-muted-foreground text-sm">Returns predictions ordered by year desc, round desc, then chronologically by match start time within each round. Filter by round, team, or settlement status.</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr class="border-b"><td class="py-2 font-mono text-xs">year</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by season year</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">round</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by round</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">fixture_id</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by Squiggle fixture ID</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">team_id</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Predictions involving this team (home or away)</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">model_version</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Algorithm version, e.g. <code class="bg-muted rounded px-1 font-mono text-xs">v2</code></td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">settled</td><td class="py-2 font-mono text-xs">boolean</td><td class="py-2">No</td><td class="text-muted-foreground py-2"><code class="bg-muted rounded px-1 font-mono text-xs">true</code> = outcome known, <code class="bg-muted rounded px-1 font-mono text-xs">false</code> = pending</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">limit</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 50, max 200</td></tr>
					<tr><td class="py-2 font-mono text-xs">offset</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 0</td></tr>
				</tbody>
			</table>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Examples</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm"># Predictions for round 9, 2026
GET /predictions?year=2026&round=9

# All settled predictions for a team
GET /predictions?team_id=sydney&settled=true</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    {
      "id": 214, "fixtureId": 38566, "year": 2026, "round": 9,
      "homeTeamId": "fremantle", "homeTeam": "Fremantle", "homeShortName": "FRE",
      "awayTeamId": "hawthorn", "awayTeam": "Hawthorn", "awayShortName": "HAW",
      "venue": "Optus Stadium", "date": "2026-05-09 19:40:00",
      "homeProbability": 58.3, "awayProbability": 41.7,
      "predictedMargin": 5,
      "squiggleConsensus": 61,
      "factors": {
        "totalEdge": 33.9,
        "contributions": [
          { "key": "rating", "label": "rating edge", "value": 11.2 },
          { "key": "homeGround", "label": "home ground advantage", "value": 38 },
          { "key": "form", "label": "recent scoring form", "value": -6.4 },
          { "key": "venueRecord", "label": "venue record", "value": 4.1 },
          { "key": "travel", "label": "travel (Hawthorn interstate)", "value": 40 },
          { "key": "rest", "label": "rest (7 vs 8 days)", "value": 0 },
          { "key": "h2h", "label": "head-to-head (last 6)", "value": 0 }
        ],
        "h2h": { "homeWins": 3, "awayWins": 3, "draws": 0 }
      },
      "homeBreakdown": {
        "elo": 1541, "eloHistory": [1512, 1528, 1541],
        "form": ["W", "W", "L", "W", "L"],
        "attack": 88.4, "defence": 82.1,
        "venueRecord": { "wins": 9, "played": 12 }, "restDays": 7
      },
      "awayBreakdown": { "...same shape for the away side...": "" },
      "modelVersion": "v2",
      "actualWinner": null, "actualMargin": null,
      "computedAt": "2026-05-06T08:00:00.000Z", "settledAt": null
    }
  ],
  "meta": { "limit": 50, "offset": 0, "count": 9, "total": 9 }
}`}</pre>
		<p class="text-muted-foreground text-xs">
			<code class="bg-muted rounded px-1 font-mono text-xs">factors.contributions</code> values are rating points, positive toward the home side; they sum to
			<code class="bg-muted rounded px-1 font-mono text-xs">totalEdge</code>, which converts to the probability via
			<code class="bg-muted rounded px-1 font-mono text-xs">{'P(home) = 1 / (1 + 10^(-edge/400))'}</code>.
			Once a game completes, <code class="bg-muted rounded px-1 font-mono text-xs">actualWinner</code> and
			<code class="bg-muted rounded px-1 font-mono text-xs">actualMargin</code> (home-positive points) are populated.
		</p>
		</div>
		<TryItPanel
			endpoint="/predictions"
			queryParams={[
				{ name: 'year', placeholder: '2026', default: '2026' },
				{ name: 'round', placeholder: '9' },
				{ name: 'fixture_id', placeholder: '38566' },
				{ name: 'team_id', placeholder: 'fremantle' },
				{ name: 'model_version', placeholder: 'v2' },
				{ name: 'settled', placeholder: 'true' },
				{ name: 'limit', placeholder: '50' },
				{ name: 'offset', placeholder: '0' }
			]}
		/>
	</div>

	<!-- GET /predictions/:id -->
	<div class="space-y-4 border-t pt-8">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/predictions/:id</code>
		</div>
		<p class="text-muted-foreground text-sm">Returns a single prediction by numeric ID. Response is the same shape wrapped in <code class="bg-muted rounded px-1 font-mono text-xs">{`{ "data": { ... } }`}</code>.</p>
		<TryItPanel
			endpoint="/predictions"
			queryParams={[
				{ name: 'year', placeholder: '2026', default: '2026' },
				{ name: 'round', placeholder: '9', default: '9' }
			]}
		/>
	</div>
</section>
