<script lang="ts">
	import TryItPanel from '$lib/components/ui/custom/tryItPanel.svelte';
</script>

<section class="space-y-10">
	<h1 class="text-2xl font-bold">Leaderboards, Head-to-Head &amp; Venues</h1>

	<!-- GET /leaderboards -->
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/leaderboards</code>
		</div>
		<p class="text-muted-foreground text-sm">
			Returns the top players ranked by any basic stat column, ordered descending. Ideal for "who had the most goals in round X?" style queries.
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr class="border-b"><td class="py-2 font-mono text-xs">stat</td><td class="py-2 font-mono text-xs">string</td><td class="py-2 font-semibold">Yes</td><td class="text-muted-foreground py-2">Stat to rank by (see valid values below)</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">year</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by season year</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">round</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by round</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">team_id</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter to a single team's players</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">limit</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 50, max 200</td></tr>
					<tr><td class="py-2 font-mono text-xs">offset</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 0</td></tr>
				</tbody>
			</table>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Valid stat values</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-xs leading-relaxed">kicks, handballs, disposals, marks, goals, behinds, tackles, hitouts,
goal_assists, inside_50s, clearances, clangers, rebound_50s,
frees_for, frees_against, afl_fantasy_pts, supercoach_pts</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Examples</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm"># Top 10 disposal getters in 2024
GET /leaderboards?stat=disposals&year=2024&limit=10

# Highest goal tallies in round 5 for Sydney
GET /leaderboards?stat=goals&year=2024&round=5&team_id=sydney</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    { "playerId": 144, "playerName": "Chad Warner", "teamId": "sydney", "value": 32 },
    { "playerId": 201, "playerName": "Marcus Bontempelli", "teamId": "western-bulldogs", "value": 31 }
  ],
  "meta": { "limit": 10, "offset": 0, "count": 10, "total": 4820 }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/leaderboards"
			queryParams={[
				{ name: 'stat', placeholder: 'disposals', default: 'disposals' },
				{ name: 'year', placeholder: '2024', default: '2024' },
				{ name: 'round', placeholder: '5' },
				{ name: 'team_id', placeholder: 'sydney' },
				{ name: 'limit', placeholder: '10', default: '10' },
				{ name: 'offset', placeholder: '0' }
			]}
		/>
	</div>

	<!-- GET /head-to-head -->
	<div class="space-y-4 border-t pt-8">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/head-to-head</code>
		</div>
		<p class="text-muted-foreground text-sm">
			Returns the match history between two teams, regardless of which was home or away.
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr class="border-b"><td class="py-2 font-mono text-xs">team_a</td><td class="py-2 font-mono text-xs">string</td><td class="py-2 font-semibold">Yes</td><td class="text-muted-foreground py-2">First team slug</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">team_b</td><td class="py-2 font-mono text-xs">string</td><td class="py-2 font-semibold">Yes</td><td class="text-muted-foreground py-2">Second team slug</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">year</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter to a specific season</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">venue</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter to a specific venue</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">limit</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 50, max 200</td></tr>
					<tr><td class="py-2 font-mono text-xs">offset</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 0</td></tr>
				</tbody>
			</table>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm"># Swans vs Magpies all-time at the SCG
GET /head-to-head?team_a=sydney&team_b=collingwood&venue=SCG</pre>
		</div>
		<p class="text-muted-foreground text-sm">Response is a standard paginated list of match objects (same shape as <code class="bg-muted rounded px-1 font-mono text-xs">GET /matches</code>).</p>
		<TryItPanel
			endpoint="/head-to-head"
			queryParams={[
				{ name: 'team_a', placeholder: 'sydney', default: 'sydney' },
				{ name: 'team_b', placeholder: 'collingwood', default: 'collingwood' },
				{ name: 'year', placeholder: '2024' },
				{ name: 'venue', placeholder: 'SCG' },
				{ name: 'limit', placeholder: '50' },
				{ name: 'offset', placeholder: '0' }
			]}
		/>
	</div>

	<!-- GET /venues -->
	<div class="space-y-4 border-t pt-8">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/venues</code>
		</div>
		<p class="text-muted-foreground text-sm">
			Returns all venues in the database with match counts, ordered by most matches. Useful for getting valid venue values for the
			<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">venue</code> filter on other endpoints.
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    { "venue": "MCG", "matchCount": 412 },
    { "venue": "Marvel Stadium", "matchCount": 298 },
    { "venue": "SCG", "matchCount": 186 }
  ],
  "meta": { "count": 24 }
}`}</pre>
		</div>
		<TryItPanel endpoint="/venues" />
	</div>
</section>
