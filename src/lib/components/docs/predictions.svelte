<script lang="ts">
	import TryItPanel from '$lib/components/ui/custom/tryItPanel.svelte';
</script>

<section class="space-y-10">
	<h1 class="text-2xl font-bold">Predictions</h1>
	<p class="text-muted-foreground text-sm">
		Win-probability predictions for AFL fixtures, computed using a 6-factor weighted model (form, scoring power, team stats, venue, H2H, Squiggle tipster consensus).
		Predictions are versioned — <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">model_version</code> tags each row so historical predictions are preserved when the algorithm changes.
		Probabilities are expressed as floats, e.g. <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">72.5</code> = 72.5%.
	</p>

	<!-- GET /predictions -->
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/predictions</code>
		</div>
		<p class="text-muted-foreground text-sm">Returns predictions ordered by year desc, round desc. Filter by round, team, or settlement status.</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr class="border-b"><td class="py-2 font-mono text-xs">year</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by season year</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">round</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by round</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">fixture_id</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by Squiggle fixture ID</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">team_id</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Predictions involving this team (home or away)</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">model_version</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Algorithm version, e.g. <code class="bg-muted rounded px-1 font-mono text-xs">v1</code></td></tr>
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
      "id": 1, "fixtureId": 38566, "year": 2026, "round": 9,
      "homeTeamId": "fremantle", "homeTeam": "Fremantle",
      "awayTeamId": "hawthorn", "awayTeam": "Hawthorn",
      "venue": "Optus Stadium", "date": "2026-05-09 19:40:00",
      "homeProbability": 58.3, "awayProbability": 41.7,
      "squiggleConsensus": 61,
      "factors": [
        { "label": "Form", "homeScore": 0.72, "awayScore": 0.41, "weight": 0.2 }
      ],
      "homeBreakdown": { "form": 0.72, "scoring": 0.65, "stats": 0.58, "venue": 0.70, "h2h": 0.55, "squiggle": 0.61 },
      "awayBreakdown": { "form": 0.41, "scoring": 0.50, "stats": 0.44, "venue": 0.30, "h2h": 0.45, "squiggle": 0.39 },
      "modelVersion": "v1", "actualWinner": null,
      "computedAt": "2026-05-06T08:00:00.000Z", "settledAt": null
    }
  ],
  "meta": { "limit": 50, "offset": 0, "count": 9, "total": 9 }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/predictions"
			queryParams={[
				{ name: 'year', placeholder: '2026', default: '2026' },
				{ name: 'round', placeholder: '9' },
				{ name: 'fixture_id', placeholder: '38566' },
				{ name: 'team_id', placeholder: 'fremantle' },
				{ name: 'model_version', placeholder: 'v1' },
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
