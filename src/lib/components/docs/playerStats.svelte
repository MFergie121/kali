<script lang="ts">
	import TryItPanel from '$lib/components/ui/custom/tryItPanel.svelte';

	const basicFields: [string, string][] = [
		['kicks', 'Kicks'],
		['handballs', 'Handballs'],
		['disposals', 'Total disposals (kicks + handballs)'],
		['marks', 'Marks'],
		['goals', 'Goals scored'],
		['behinds', 'Behinds scored'],
		['tackles', 'Tackles'],
		['hitouts', 'Hitouts (ruck contests)'],
		['goalAssists', 'Goal assists'],
		['inside50s', 'Inside 50s'],
		['clearances', 'Clearances'],
		['clangers', 'Clangers (turnover errors)'],
		['rebound50s', 'Rebound 50s'],
		['freesFor', 'Frees for (free kicks awarded)'],
		['freesAgainst', 'Frees against (free kicks conceded)'],
		['aflFantasyPts', 'AFL Fantasy points'],
		['supercoachPts', 'SuperCoach points']
	];

	const advancedFields: [string, string][] = [
		['contestedPossessions', 'Contested possessions'],
		['uncontestedPossessions', 'Uncontested possessions'],
		['effectiveDisposals', 'Effective disposals'],
		['disposalEfficiencyPct', 'Disposal efficiency (percentage)'],
		['contestedMarks', 'Contested marks'],
		['goalAssists', 'Goal assists'],
		['marksInside50', 'Marks inside 50'],
		['onePercenters', 'One percenters'],
		['bounces', 'Bounces'],
		['centreClearances', 'Centre clearances'],
		['stoppageClearances', 'Stoppage clearances'],
		['scoreInvolvements', 'Score involvements'],
		['metresGained', 'Metres gained'],
		['turnovers', 'Turnovers'],
		['intercepts', 'Intercepts'],
		['tacklesInside50', 'Tackles inside 50'],
		['timeOnGroundPct', 'Time on ground (percentage)']
	];
</script>

<section class="space-y-10">
	<h1 class="text-2xl font-bold">Player Stats</h1>

	<!-- GET /player-stats -->
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/player-stats</code>
		</div>
		<p class="text-muted-foreground text-sm">
			Returns per-match player statistics (17 categories). Each row is one player in one match. At least one filter is recommended.
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr class="border-b"><td class="py-2 font-mono text-xs">match_id</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by match ID</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">player_id</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by player ID</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">year</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by season year</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">round</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by round</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">team_id</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Filter by team slug</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">sort_by</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Sort column (default: <code class="bg-muted rounded px-1 font-mono text-xs">disposals</code>)</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">order</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2"><code class="bg-muted rounded px-1 font-mono text-xs">asc</code> or <code class="bg-muted rounded px-1 font-mono text-xs">desc</code> (default: desc)</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">limit</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 50, max 200</td></tr>
					<tr><td class="py-2 font-mono text-xs">offset</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 0</td></tr>
				</tbody>
			</table>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Valid sort_by values</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-xs leading-relaxed">kicks, handballs, disposals, marks, goals, behinds, tackles, hitouts,
goal_assists, inside_50s, clearances, clangers, rebound_50s,
frees_for, frees_against, afl_fantasy_pts, supercoach_pts</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Examples</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm"># All stats for a single match
GET /player-stats?match_id=9812

# One player's 2024 season, sorted by fantasy points
GET /player-stats?player_id=144&year=2024&sort_by=afl_fantasy_pts

# Top tacklers in round 10
GET /player-stats?year=2024&round=10&sort_by=tackles&limit=10</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    {
      "matchId": 9812, "playerName": "Chad Warner", "teamId": "sydney",
      "kicks": 18, "handballs": 14, "disposals": 32,
      "marks": 6, "goals": 1, "behinds": 0,
      "tackles": 5, "hitouts": 0, "goalAssists": 2,
      "inside50s": 7, "clearances": 8, "clangers": 3,
      "rebound50s": 1, "freesFor": 2, "freesAgainst": 1,
      "aflFantasyPts": 118, "supercoachPts": 124
    }
  ],
  "meta": { "limit": 50, "offset": 0, "count": 44, "total": 44 }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/player-stats"
			queryParams={[
				{ name: 'year', placeholder: '2024', default: '2024' },
				{ name: 'round', placeholder: '10', default: '10' },
				{ name: 'sort_by', placeholder: 'tackles', default: 'tackles' },
				{ name: 'order', placeholder: 'desc' },
				{ name: 'match_id', placeholder: '9812' },
				{ name: 'player_id', placeholder: '144' },
				{ name: 'team_id', placeholder: 'sydney' },
				{ name: 'limit', placeholder: '10', default: '10' },
				{ name: 'offset', placeholder: '0' }
			]}
		/>

		<div class="space-y-2 pt-2">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Stat Fields Reference</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Field</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					{#each basicFields as [field, desc] (field)}
						<tr class="border-b last:border-0">
							<td class="py-1.5 font-mono text-xs">{field}</td>
							<td class="text-muted-foreground py-1.5">{desc}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- GET /player-stats-advanced -->
	<div class="space-y-4 border-t pt-8">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/player-stats-advanced</code>
		</div>
		<p class="text-muted-foreground text-sm">
			Returns advanced per-match player statistics (17 categories) including contested possessions, disposal efficiency, metres gained, and more.
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
			<p class="text-muted-foreground text-sm">
				Same filter parameters as <code class="bg-muted rounded px-1 font-mono text-xs">/player-stats</code>:
				<code class="bg-muted rounded px-1 font-mono text-xs">match_id</code>,
				<code class="bg-muted rounded px-1 font-mono text-xs">player_id</code>,
				<code class="bg-muted rounded px-1 font-mono text-xs">year</code>,
				<code class="bg-muted rounded px-1 font-mono text-xs">round</code>,
				<code class="bg-muted rounded px-1 font-mono text-xs">team_id</code>,
				<code class="bg-muted rounded px-1 font-mono text-xs">sort_by</code>,
				<code class="bg-muted rounded px-1 font-mono text-xs">order</code>,
				<code class="bg-muted rounded px-1 font-mono text-xs">limit</code>,
				<code class="bg-muted rounded px-1 font-mono text-xs">offset</code>.
			</p>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Valid sort_by values</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-xs leading-relaxed">contested_possessions, uncontested_possessions, effective_disposals,
disposal_efficiency_pct, contested_marks, goal_assists, marks_inside_50,
one_percenters, bounces, centre_clearances, stoppage_clearances,
score_involvements, metres_gained, turnovers, intercepts,
tackles_inside_50, time_on_ground_pct</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm"># Highest metres gained in round 10, 2024
GET /player-stats-advanced?year=2024&round=10&sort_by=metres_gained&limit=10</pre>
		</div>
		<TryItPanel
			endpoint="/player-stats-advanced"
			queryParams={[
				{ name: 'year', placeholder: '2024', default: '2024' },
				{ name: 'round', placeholder: '10', default: '10' },
				{ name: 'sort_by', placeholder: 'metres_gained', default: 'metres_gained' },
				{ name: 'order', placeholder: 'desc' },
				{ name: 'match_id', placeholder: '9812' },
				{ name: 'player_id', placeholder: '144' },
				{ name: 'team_id', placeholder: 'sydney' },
				{ name: 'limit', placeholder: '10', default: '10' },
				{ name: 'offset', placeholder: '0' }
			]}
		/>

		<div class="space-y-2 pt-2">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Advanced Stat Fields Reference</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Field</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					{#each advancedFields as [field, desc] (field)}
						<tr class="border-b last:border-0">
							<td class="py-1.5 font-mono text-xs">{field}</td>
							<td class="text-muted-foreground py-1.5">{desc}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- GET /player-team-assignments -->
	<div class="space-y-4 border-t pt-8">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">GET</span>
			<code class="font-mono text-base">/player-team-assignments</code>
		</div>
		<p class="text-muted-foreground text-sm">
			Returns player transfer and movement history. Each row represents a period at a club. An open-ended
			<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">endYear: null</code> means the player is currently at that club.
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr class="border-b"><td class="py-2 font-mono text-xs">player_id</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">All clubs a player has been at</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">team_id</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">All players at a club</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">year</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Assignments active during this year</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">reason</td><td class="py-2 font-mono text-xs">string</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Movement type: <code class="bg-muted rounded px-1 font-mono text-xs">trade</code>, <code class="bg-muted rounded px-1 font-mono text-xs">rookie</code>, <code class="bg-muted rounded px-1 font-mono text-xs">delisted</code>, etc.</td></tr>
					<tr class="border-b"><td class="py-2 font-mono text-xs">limit</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 50, max 200</td></tr>
					<tr><td class="py-2 font-mono text-xs">offset</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Default 0</td></tr>
				</tbody>
			</table>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Examples</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm"># Full club history for a player
GET /player-team-assignments?player_id=144

# All trades into Collingwood
GET /player-team-assignments?team_id=collingwood&reason=trade</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    {
      "id": 301, "playerName": "Chad Warner", "playerId": 144,
      "teamId": "sydney", "teamName": "Sydney Swans",
      "startYear": 2021, "endYear": null, "reason": "rookie"
    }
  ],
  "meta": { "limit": 50, "offset": 0, "count": 1, "total": 1 }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/player-team-assignments"
			queryParams={[
				{ name: 'player_id', placeholder: '144', default: '144' },
				{ name: 'team_id', placeholder: 'collingwood' },
				{ name: 'year', placeholder: '2024' },
				{ name: 'reason', placeholder: 'trade' },
				{ name: 'limit', placeholder: '50' },
				{ name: 'offset', placeholder: '0' }
			]}
		/>
	</div>
</section>
