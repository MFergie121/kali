<script lang="ts">
	import TryItPanel from '$lib/components/ui/custom/tryItPanel.svelte';
</script>

<section class="space-y-10">
	<h1 class="text-2xl font-bold">Matches</h1>

	<!-- GET /matches -->
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/matches</code>
		</div>
		<p class="text-muted-foreground text-sm">
			Returns matches with scores, teams, venue, and crowd. Ordered newest first (year desc, round desc).
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr class="border-b"><td class="py-2 font-mono text-xs">year</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by season year</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">round</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by round (0 = finals)</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">team_id</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Matches involving this team (home or away)</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">venue</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by venue name (exact match)</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">date_from</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">ISO date, e.g. <code class="bg-muted rounded px-1 font-mono text-xs">2024-01-01</code></td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">date_to</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">ISO date (inclusive)</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">limit</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 50, max 200</td></tr>
					<tr><td class="py-2 font-mono text-xs">offset</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 0</td></tr>
				</tbody>
			</table>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Examples</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm"># All Sydney Swans matches in 2024
GET /matches?team_id=sydney&year=2024

# Matches at the MCG in a date range
GET /matches?venue=MCG&date_from=2024-06-01&date_to=2024-06-30

# Round 10, 2024
GET /matches?year=2024&round=10</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    {
      "id": 9812, "round": 5, "year": 2024,
      "homeTeam": "Sydney Swans", "homeShortName": "SYD",
      "awayTeam": "Greater Western Sydney", "awayShortName": "GWS",
      "homeScore": 104, "awayScore": 87,
      "venue": "SCG", "date": "2024-04-20T13:45:00",
      "crowd": 38214, "sourcedAt": "2024-04-21T00:12:44.231Z"
    }
  ],
  "meta": { "limit": 50, "offset": 0, "count": 9, "total": 9 }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/matches"
			queryParams={[
				{ name: 'year', placeholder: '2024', default: '2024' },
				{ name: 'round', placeholder: '10', default: '10' },
				{ name: 'team_id', placeholder: 'sydney' },
				{ name: 'venue', placeholder: 'MCG' },
				{ name: 'date_from', placeholder: '2024-06-01' },
				{ name: 'date_to', placeholder: '2024-06-30' },
				{ name: 'limit', placeholder: '50' },
				{ name: 'offset', placeholder: '0' }
			]}
		/>
	</div>

	<!-- GET /matches/:id -->
	<div class="space-y-4 border-t pt-8">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/matches/:id</code>
		</div>
		<p class="text-muted-foreground text-sm">Returns a single match by numeric ID.</p>
		<p class="text-muted-foreground text-sm">Response shape is the same as a single item from <code class="bg-muted rounded px-1 font-mono text-xs">GET /matches</code>, wrapped in <code class="bg-muted rounded px-1 font-mono text-xs">{`{ "data": { ... } }`}</code>.</p>
		<TryItPanel
			endpoint="/matches/:id"
			pathParams={[{ name: 'id', placeholder: '9812', default: '9812' }]}
		/>
	</div>
</section>
