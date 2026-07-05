<script lang="ts">
	import TryItPanel from '$lib/components/ui/custom/tryItPanel.svelte';
</script>

<section class="space-y-10">
	<h1 class="text-2xl font-bold">Teams</h1>

	<!-- GET /teams -->
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/teams</code>
		</div>
		<p class="text-muted-foreground text-sm">Returns all 18 AFL teams, ordered alphabetically.</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr class="border-b"><td class="py-2 font-mono text-xs">limit</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 50, max 200</td></tr>
					<tr><td class="py-2 font-mono text-xs">offset</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 0</td></tr>
				</tbody>
			</table>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    { "id": "adelaide-crows", "name": "Adelaide Crows", "shortName": "ADL" },
    { "id": "brisbane-lions", "name": "Brisbane Lions", "shortName": "BRL" }
  ],
  "meta": { "limit": 50, "offset": 0, "count": 18, "total": 18 }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/teams"
			queryParams={[
				{ name: 'limit', placeholder: '50' },
				{ name: 'offset', placeholder: '0' }
			]}
		/>
	</div>

	<!-- GET /teams/:id -->
	<div class="space-y-4 border-t pt-8">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/teams/:id</code>
		</div>
		<p class="text-muted-foreground text-sm">Returns a single team by its slug ID.</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Path Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr><td class="py-2 font-mono text-xs">id</td><td class="py-2 font-mono text-xs">string</td><td class="text-muted-foreground py-2">Team slug, e.g. <code class="bg-muted rounded px-1 font-mono text-xs">sydney</code></td></tr>
				</tbody>
			</table>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": { "id": "sydney", "name": "Sydney Swans", "shortName": "SYD" }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/teams/:id"
			pathParams={[{ name: 'id', placeholder: 'sydney', default: 'sydney' }]}
		/>
	</div>

	<!-- GET /teams/:id/stats -->
	<div class="space-y-4 border-t pt-8">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/teams/:id/stats</code>
		</div>
		<p class="text-muted-foreground text-sm">
			Returns aggregated team statistics per match. Each row sums all player stats for that team in a single match.
			Useful for comparing team-level performance across a season.
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr class="border-b"><td class="py-2 font-mono text-xs">id</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">Yes (path)</td><td class="text-muted-foreground py-2">Team slug</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">year</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by season year</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">round</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by round</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">limit</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 50, max 200</td></tr>
					<tr><td class="py-2 font-mono text-xs">offset</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 0</td></tr>
				</tbody>
			</table>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    {
      "matchId": 9812, "round": 5, "year": 2024,
      "opponent": "Greater Western Sydney", "opponentShortName": "GWS",
      "isHome": true, "teamScore": 104, "opponentScore": 87,
      "kicks": 210, "handballs": 158, "disposals": 368,
      "marks": 95, "goals": 16, "behinds": 8,
      "tackles": 62, "hitouts": 38, ...
    }
  ],
  "meta": { "limit": 50, "offset": 0, "count": 22, "total": 22 }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/teams/:id/stats"
			pathParams={[{ name: 'id', placeholder: 'sydney', default: 'sydney' }]}
			queryParams={[
				{ name: 'year', placeholder: '2024', default: '2024' },
				{ name: 'round', placeholder: '5' },
				{ name: 'limit', placeholder: '50' },
				{ name: 'offset', placeholder: '0' }
			]}
		/>
	</div>
</section>
