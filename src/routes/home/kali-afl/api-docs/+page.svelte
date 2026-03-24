<svelte:head>
	<title>API Docs | Kali AFL Scraper</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-12 p-6 pb-16">

	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold tracking-tight">AFL Stats API</h1>
		<p class="text-muted-foreground mt-2 text-base">
			A versioned, key-authenticated REST API for AFL match and player statistics. All responses are JSON.
		</p>
	</div>

	<!-- Authentication -->
	<section class="space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Authentication</h2>
		<p class="text-muted-foreground text-sm leading-relaxed">
			Every request requires an API key passed in the <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">Authorization</code> header.
			Keys are managed by an admin — visit the
			<a href="/home/kali-afl/api-keys" class="text-primary underline underline-offset-4">API Keys</a>
			page to generate one.
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Header</p>
			<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">Authorization: Bearer YOUR_API_KEY</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
			<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">curl https://your-domain.com/api/afl/v1/teams \
  -H "Authorization: Bearer a3f9c2d1..."</pre>
		</div>
	</section>

	<!-- Base URL -->
	<section class="space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Base URL</h2>
		<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">https://your-domain.com/api/afl/v1</pre>
		<p class="text-muted-foreground text-sm">
			All endpoints below are relative to this base URL. When running locally, replace with <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">http://localhost:5173</code>.
		</p>
	</section>

	<!-- Response Format -->
	<section class="space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Response Format</h2>
		<p class="text-muted-foreground text-sm leading-relaxed">
			All successful responses wrap data in a consistent envelope with a <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">meta</code> object for pagination.
		</p>
		<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">{`{
  "data": [ ... ],
  "meta": {
    "limit":  50,   // rows requested
    "offset": 0,    // rows skipped
    "count":  10,   // rows returned in this response
    "total":  142   // total matching records
  }
}`}</pre>
	</section>

	<!-- Pagination -->
	<section class="space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Pagination</h2>
		<p class="text-muted-foreground text-sm leading-relaxed">
			All list endpoints support <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">limit</code> and <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">offset</code> query parameters.
		</p>
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b text-left">
					<th class="text-muted-foreground pb-2 font-medium">Parameter</th>
					<th class="text-muted-foreground pb-2 font-medium">Default</th>
					<th class="text-muted-foreground pb-2 font-medium">Max</th>
					<th class="text-muted-foreground pb-2 font-medium">Description</th>
				</tr>
			</thead>
			<tbody>
				<tr class="border-b">
					<td class="py-2 font-mono text-xs">limit</td>
					<td class="py-2">50</td>
					<td class="py-2">200</td>
					<td class="text-muted-foreground py-2">Number of records to return</td>
				</tr>
				<tr>
					<td class="py-2 font-mono text-xs">offset</td>
					<td class="py-2">0</td>
					<td class="py-2">—</td>
					<td class="text-muted-foreground py-2">Number of records to skip</td>
				</tr>
			</tbody>
		</table>
		<p class="text-muted-foreground text-sm leading-relaxed">
			To iterate all records: fetch pages until <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">meta.count &lt; meta.limit</code>, or compare <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">offset + meta.count</code> against <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">meta.total</code>.
		</p>
		<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto"># Page 1
GET /api/afl/v1/players?limit=50&offset=0

# Page 2
GET /api/afl/v1/players?limit=50&offset=50</pre>
	</section>

	<!-- Errors -->
	<section class="space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Errors</h2>
		<p class="text-muted-foreground text-sm">Error responses always include an <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">error</code> string.</p>
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b text-left">
					<th class="text-muted-foreground pb-2 font-medium">Status</th>
					<th class="text-muted-foreground pb-2 font-medium">Body</th>
					<th class="text-muted-foreground pb-2 font-medium">Meaning</th>
				</tr>
			</thead>
			<tbody>
				<tr class="border-b">
					<td class="py-2 font-mono text-xs">400</td>
					<td class="py-2 font-mono text-xs">{`{"error":"Bad request: ..."}`}</td>
					<td class="text-muted-foreground py-2">Invalid or malformed query parameter</td>
				</tr>
				<tr class="border-b">
					<td class="py-2 font-mono text-xs">401</td>
					<td class="py-2 font-mono text-xs">{`{"error":"Unauthorized"}`}</td>
					<td class="text-muted-foreground py-2">Missing, invalid, or revoked API key</td>
				</tr>
				<tr>
					<td class="py-2 font-mono text-xs">429</td>
					<td class="py-2 font-mono text-xs">{`{"error":"Rate limit exceeded"}`}</td>
					<td class="text-muted-foreground py-2">Your account's request limit has been reached</td>
				</tr>
			</tbody>
		</table>
	</section>

	<!-- ── Endpoints ── -->
	<div class="space-y-12 border-t pt-8">
		<h2 class="text-xl font-semibold">Endpoints</h2>

		<!-- Teams -->
		<section class="space-y-4">
			<div class="flex items-center gap-3">
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
				<code class="font-mono text-base">/api/afl/v1/teams</code>
			</div>
			<p class="text-muted-foreground text-sm">Returns all 18 AFL teams.</p>

			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b text-left">
							<th class="text-muted-foreground pb-2 font-medium">Name</th>
							<th class="text-muted-foreground pb-2 font-medium">Type</th>
							<th class="text-muted-foreground pb-2 font-medium">Required</th>
							<th class="text-muted-foreground pb-2 font-medium">Description</th>
						</tr>
					</thead>
					<tbody>
						<tr class="border-b">
							<td class="py-2 font-mono text-xs">limit</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Default 50, max 200</td>
						</tr>
						<tr>
							<td class="py-2 font-mono text-xs">offset</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Default 0</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Request</p>
				<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">curl https://your-domain.com/api/afl/v1/teams \
  -H "Authorization: Bearer YOUR_API_KEY"</pre>
			</div>

			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
				<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">{`{
  "data": [
    { "id": "adelaide-crows",  "name": "Adelaide Crows",  "shortName": "ADL" },
    { "id": "brisbane-lions",  "name": "Brisbane Lions",  "shortName": "BRL" },
    { "id": "carlton",         "name": "Carlton",         "shortName": "CAR" }
    // ... 15 more teams
  ],
  "meta": { "limit": 50, "offset": 0, "count": 18, "total": 18 }
}`}</pre>
			</div>
		</section>

		<!-- Matches -->
		<section class="space-y-4 border-t pt-8">
			<div class="flex items-center gap-3">
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
				<code class="font-mono text-base">/api/afl/v1/matches</code>
			</div>
			<p class="text-muted-foreground text-sm">
				Returns matches with scores, teams, venue, and crowd. Filter by season year and/or round.
				Results are ordered newest first (year desc, round desc).
			</p>

			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b text-left">
							<th class="text-muted-foreground pb-2 font-medium">Name</th>
							<th class="text-muted-foreground pb-2 font-medium">Type</th>
							<th class="text-muted-foreground pb-2 font-medium">Required</th>
							<th class="text-muted-foreground pb-2 font-medium">Description</th>
						</tr>
					</thead>
					<tbody>
						<tr class="border-b">
							<td class="py-2 font-mono text-xs">year</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Filter by season year, e.g. <code class="bg-muted rounded px-1 font-mono text-xs">2024</code></td>
						</tr>
						<tr class="border-b">
							<td class="py-2 font-mono text-xs">round</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Filter by round number (0 = finals)</td>
						</tr>
						<tr class="border-b">
							<td class="py-2 font-mono text-xs">limit</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Default 50, max 200</td>
						</tr>
						<tr>
							<td class="py-2 font-mono text-xs">offset</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Default 0</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Request</p>
				<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">curl "https://your-domain.com/api/afl/v1/matches?year=2024&round=5" \
  -H "Authorization: Bearer YOUR_API_KEY"</pre>
			</div>

			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
				<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">{`{
  "data": [
    {
      "id":            9812,
      "round":         5,
      "year":          2024,
      "homeTeam":      "Sydney Swans",
      "homeShortName": "SYD",
      "awayTeam":      "Greater Western Sydney",
      "awayShortName": "GWS",
      "homeScore":     104,
      "awayScore":     87,
      "venue":         "SCG",
      "date":          "2024-04-20T13:45:00",
      "crowd":         38214,
      "sourcedAt":     "2024-04-21T00:12:44.231Z"
    }
    // ...
  ],
  "meta": { "limit": 50, "offset": 0, "count": 9, "total": 9 }
}`}</pre>
			</div>
		</section>

		<!-- Players -->
		<section class="space-y-4 border-t pt-8">
			<div class="flex items-center gap-3">
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
				<code class="font-mono text-base">/api/afl/v1/players</code>
			</div>
			<p class="text-muted-foreground text-sm">
				Returns players. Optionally filter by team using the team's URL slug ID (e.g. <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">sydney-swans</code>).
				Results are ordered alphabetically by player name.
			</p>

			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b text-left">
							<th class="text-muted-foreground pb-2 font-medium">Name</th>
							<th class="text-muted-foreground pb-2 font-medium">Type</th>
							<th class="text-muted-foreground pb-2 font-medium">Required</th>
							<th class="text-muted-foreground pb-2 font-medium">Description</th>
						</tr>
					</thead>
					<tbody>
						<tr class="border-b">
							<td class="py-2 font-mono text-xs">team_id</td>
							<td class="py-2 font-mono text-xs">string</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Team slug from <code class="bg-muted rounded px-1 font-mono text-xs">GET /teams</code>, e.g. <code class="bg-muted rounded px-1 font-mono text-xs">collingwood</code></td>
						</tr>
						<tr class="border-b">
							<td class="py-2 font-mono text-xs">limit</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Default 50, max 200</td>
						</tr>
						<tr>
							<td class="py-2 font-mono text-xs">offset</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Default 0</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Request</p>
				<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">curl "https://your-domain.com/api/afl/v1/players?team_id=sydney-swans" \
  -H "Authorization: Bearer YOUR_API_KEY"</pre>
			</div>

			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
				<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">{`{
  "data": [
    { "id": 142, "name": "Errol Gulden",  "teamId": "sydney-swans" },
    { "id": 143, "name": "Isaac Heeney",  "teamId": "sydney-swans" },
    { "id": 144, "name": "Chad Warner",   "teamId": "sydney-swans" }
    // ...
  ],
  "meta": { "limit": 50, "offset": 0, "count": 32, "total": 32 }
}`}</pre>
			</div>
		</section>

		<!-- Player Stats -->
		<section class="space-y-4 border-t pt-8">
			<div class="flex items-center gap-3">
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
				<code class="font-mono text-base">/api/afl/v1/player-stats</code>
			</div>
			<p class="text-muted-foreground text-sm">
				Returns per-match player statistics. At least one filter is recommended — unfiltered results can be very large.
				Results are ordered by disposals descending.
			</p>
			<p class="text-muted-foreground text-sm">
				Each row represents one player's performance in one match and includes 17 statistical categories.
			</p>

			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b text-left">
							<th class="text-muted-foreground pb-2 font-medium">Name</th>
							<th class="text-muted-foreground pb-2 font-medium">Type</th>
							<th class="text-muted-foreground pb-2 font-medium">Required</th>
							<th class="text-muted-foreground pb-2 font-medium">Description</th>
						</tr>
					</thead>
					<tbody>
						<tr class="border-b">
							<td class="py-2 font-mono text-xs">match_id</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Filter by match ID (from <code class="bg-muted rounded px-1 font-mono text-xs">GET /matches</code>)</td>
						</tr>
						<tr class="border-b">
							<td class="py-2 font-mono text-xs">player_id</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Filter by player ID (from <code class="bg-muted rounded px-1 font-mono text-xs">GET /players</code>) — returns all games for that player</td>
						</tr>
						<tr class="border-b">
							<td class="py-2 font-mono text-xs">year</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Filter by season year. Combine with <code class="bg-muted rounded px-1 font-mono text-xs">round</code> to get one round's stats</td>
						</tr>
						<tr class="border-b">
							<td class="py-2 font-mono text-xs">round</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Filter by round number</td>
						</tr>
						<tr class="border-b">
							<td class="py-2 font-mono text-xs">limit</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Default 50, max 200</td>
						</tr>
						<tr>
							<td class="py-2 font-mono text-xs">offset</td>
							<td class="py-2 font-mono text-xs">integer</td>
							<td class="py-2">No</td>
							<td class="text-muted-foreground py-2">Default 0</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="space-y-3">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Common Patterns</p>
				<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto"># All stats for a single match
GET /api/afl/v1/player-stats?match_id=9812

# Season history for one player
GET /api/afl/v1/player-stats?player_id=142&year=2024

# All stats for an entire round
GET /api/afl/v1/player-stats?year=2024&round=5&limit=200</pre>
			</div>

			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Request</p>
				<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">curl "https://your-domain.com/api/afl/v1/player-stats?match_id=9812&limit=3" \
  -H "Authorization: Bearer YOUR_API_KEY"</pre>
			</div>

			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
				<pre class="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">{`{
  "data": [
    {
      "matchId":       9812,
      "playerName":    "Chad Warner",
      "teamId":        "sydney-swans",
      "kicks":         18,
      "handballs":     14,
      "disposals":     32,
      "marks":         6,
      "goals":         1,
      "behinds":       0,
      "tackles":       5,
      "hitouts":       0,
      "goalAssists":   2,
      "inside50s":     7,
      "clearances":    8,
      "clangers":      3,
      "rebound50s":    1,
      "freesFor":      2,
      "freesAgainst":  1,
      "aflFantasyPts": 118,
      "supercoachPts": 124
    }
    // ...
  ],
  "meta": { "limit": 3, "offset": 0, "count": 3, "total": 44 }
}`}</pre>
			</div>

			<div class="space-y-2">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Stat Fields Reference</p>
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b text-left">
							<th class="text-muted-foreground pb-2 font-medium">Field</th>
							<th class="text-muted-foreground pb-2 font-medium">Description</th>
						</tr>
					</thead>
					<tbody>
						{#each [
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
							['supercoachPts', 'SuperCoach points'],
						] as [field, desc]}
							<tr class="border-b last:border-0">
								<td class="py-1.5 font-mono text-xs">{field}</td>
								<td class="text-muted-foreground py-1.5">{desc}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	</div>

</div>
