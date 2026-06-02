<script lang="ts">
	import TryItPanel from '$lib/components/ui/custom/tryItPanel.svelte';
</script>

<section class="space-y-10">
	<h1 class="text-2xl font-bold">Players</h1>

	<!-- GET /players -->
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
			<code class="font-mono text-base">/players</code>
		</div>
		<p class="text-muted-foreground text-sm">
			Returns players ordered alphabetically. Filter by team, search by name, or filter by season year (players who appeared in at least one match that year).
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr class="border-b"><td class="py-2 font-mono text-xs">team_id</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by current team slug</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">name</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Partial name search (case-insensitive)</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">year</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Only players who played in this season</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">limit</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 50, max 200</td></tr>
					<tr><td class="py-2 font-mono text-xs">offset</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 0</td></tr>
				</tbody>
			</table>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Examples</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm"># Search for a player by name
GET /players?name=warner

# All Collingwood players who played in 2024
GET /players?team_id=collingwood&year=2024</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    { "id": 144, "name": "Chad Warner", "currentTeamId": "sydney", "onlineId": "12345" }
  ],
  "meta": { "limit": 50, "offset": 0, "count": 1, "total": 1 }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/players"
			queryParams={[
				{ name: 'name', placeholder: 'warner', default: 'warner' },
				{ name: 'team_id', placeholder: 'collingwood' },
				{ name: 'year', placeholder: '2024' },
				{ name: 'limit', placeholder: '50' },
				{ name: 'offset', placeholder: '0' }
			]}
		/>
	</div>

	<!-- GET /players/:id -->
	<div class="space-y-4 border-t pt-8">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
			<code class="font-mono text-base">/players/:id</code>
		</div>
		<p class="text-muted-foreground text-sm">Returns a single player by numeric ID.</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": { "id": 144, "name": "Chad Warner", "currentTeamId": "sydney", "onlineId": "12345" }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/players/:id"
			pathParams={[{ name: 'id', placeholder: '144', default: '144' }]}
		/>
	</div>

	<!-- GET /players/:id/career -->
	<div class="space-y-4 border-t pt-8">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
			<code class="font-mono text-base">/players/:id/career</code>
		</div>
		<p class="text-muted-foreground text-sm">
			Returns career totals and per-game averages for a player across all seasons in the database.
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": {
    "playerId": 144,
    "playerName": "Chad Warner",
    "currentTeamId": "sydney",
    "gamesPlayed": 85,
    "totals": { "kicks": 1020, "handballs": 780, "disposals": 1800, ... },
    "averages": { "kicks": 12.0, "handballs": 9.18, "disposals": 21.18, ... }
  }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/players/:id/career"
			pathParams={[{ name: 'id', placeholder: '144', default: '144' }]}
		/>
	</div>

	<!-- GET /players/:id/season -->
	<div class="space-y-4 border-t pt-8">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
			<code class="font-mono text-base">/players/:id/season</code>
		</div>
		<p class="text-muted-foreground text-sm">
			Returns season totals and per-game averages for a player in a specific year.
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr><td class="py-2 font-mono text-xs">year</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2 font-semibold">Yes</td><td class="text-muted-foreground py-2">Season year</td></tr>
				</tbody>
			</table>
		</div>
		<p class="text-muted-foreground text-sm">Response shape is identical to <code class="bg-muted rounded px-1 font-mono text-xs">/players/:id/career</code> but scoped to the given year.</p>
		<TryItPanel
			endpoint="/players/:id/season"
			pathParams={[{ name: 'id', placeholder: '144', default: '144' }]}
			queryParams={[{ name: 'year', placeholder: '2024', default: '2024' }]}
		/>
	</div>
</section>
