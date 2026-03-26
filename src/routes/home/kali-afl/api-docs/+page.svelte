<svelte:head>
	<title>API Docs | Kali AFL</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-12 p-6 pb-24">

	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold tracking-tight">AFL Stats API</h1>
		<p class="text-muted-foreground mt-2 text-base leading-relaxed">
			A versioned, key-authenticated REST API for AFL match results, player statistics, team data, leaderboards, and more.
			All responses are JSON.
		</p>
		<p class="text-muted-foreground mt-1 text-sm">
			Current version: <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">v1</code>
		</p>
	</div>

	<!-- Table of Contents -->
	<nav class="border-muted bg-muted/30 rounded-lg border p-6">
		<h2 class="mb-4 text-sm font-semibold uppercase tracking-wide">Table of Contents</h2>
		<div class="grid gap-x-8 gap-y-1 sm:grid-cols-2">
			<div class="space-y-1">
				<p class="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Overview</p>
				<a href="#authentication" class="text-primary block text-sm hover:underline">Authentication</a>
				<a href="#base-url" class="text-primary block text-sm hover:underline">Base URL</a>
				<a href="#response-format" class="text-primary block text-sm hover:underline">Response Format</a>
				<a href="#pagination" class="text-primary block text-sm hover:underline">Pagination</a>
				<a href="#sorting" class="text-primary block text-sm hover:underline">Sorting</a>
				<a href="#errors" class="text-primary block text-sm hover:underline">Errors</a>
			</div>
			<div class="space-y-1">
				<p class="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Endpoints</p>
				<a href="#teams" class="text-primary block text-sm hover:underline">Teams</a>
				<a href="#players" class="text-primary block text-sm hover:underline">Players</a>
				<a href="#matches" class="text-primary block text-sm hover:underline">Matches</a>
				<a href="#player-stats" class="text-primary block text-sm hover:underline">Player Stats</a>
				<a href="#player-stats-advanced" class="text-primary block text-sm hover:underline">Player Stats (Advanced)</a>
				<a href="#player-team-assignments" class="text-primary block text-sm hover:underline">Player Team Assignments</a>
				<a href="#leaderboards" class="text-primary block text-sm hover:underline">Leaderboards</a>
				<a href="#head-to-head" class="text-primary block text-sm hover:underline">Head-to-Head</a>
				<a href="#venues" class="text-primary block text-sm hover:underline">Venues</a>
				<a href="#standings" class="text-primary block text-sm hover:underline">Standings</a>
				<a href="#fixture" class="text-primary block text-sm hover:underline">Fixture (Public)</a>
			</div>
		</div>
	</nav>

	<!-- ────────────────────────────────────────────────────────────────────── -->
	<!-- OVERVIEW SECTIONS                                                     -->
	<!-- ────────────────────────────────────────────────────────────────────── -->

	<!-- Authentication -->
	<section id="authentication" class="scroll-mt-20 space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Authentication</h2>
		<p class="text-muted-foreground text-sm leading-relaxed">
			Every request (except <a href="#fixture" class="text-primary underline underline-offset-4">Fixture</a>) requires an API key passed via the
			<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">Authorization</code> header as a Bearer token.
			Keys are managed on the <a href="/home/kali-afl/api-usage" class="text-primary underline underline-offset-4">API Usage</a> page.
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Header Format</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">Authorization: Bearer YOUR_API_KEY</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">curl https://your-domain.com/api/afl/v1/teams \
  -H "Authorization: Bearer a3f9c2d1e8..."</pre>
		</div>
	</section>

	<!-- Base URL -->
	<section id="base-url" class="scroll-mt-20 space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Base URL</h2>
		<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">https://your-domain.com/api/afl/v1</pre>
		<p class="text-muted-foreground text-sm">
			All endpoint paths below are relative to this base. When running locally, use
			<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">http://localhost:5173</code>.
		</p>
	</section>

	<!-- Response Format -->
	<section id="response-format" class="scroll-mt-20 space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Response Format</h2>
		<p class="text-muted-foreground text-sm leading-relaxed">
			All successful responses wrap data in a consistent envelope. List endpoints include a <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">meta</code> object for pagination. Single-resource endpoints return <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{`{ "data": { ... } }`}</code>.
		</p>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">List Response</p>
				<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [ ... ],
  "meta": {
    "limit":  50,
    "offset": 0,
    "count":  10,
    "total":  142
  }
}`}</pre>
			</div>
			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Single Resource Response</p>
				<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": {
    "id": "sydney-swans",
    "name": "Sydney Swans",
    "shortName": "SYD"
  }
}`}</pre>
			</div>
		</div>
	</section>

	<!-- Pagination -->
	<section id="pagination" class="scroll-mt-20 space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Pagination</h2>
		<p class="text-muted-foreground text-sm leading-relaxed">
			All list endpoints support <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">limit</code> and
			<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">offset</code> query parameters.
		</p>
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b text-left">
					<th class="text-muted-foreground pb-2 font-medium">Parameter</th>
					<th class="text-muted-foreground pb-2 font-medium">Default</th>
					<th class="text-muted-foreground pb-2 font-medium">Range</th>
					<th class="text-muted-foreground pb-2 font-medium">Description</th>
				</tr>
			</thead>
			<tbody>
				<tr class="border-b">
					<td class="py-2 font-mono text-xs">limit</td>
					<td class="py-2">50</td>
					<td class="py-2">1 -- 200</td>
					<td class="text-muted-foreground py-2">Number of records to return</td>
				</tr>
				<tr>
					<td class="py-2 font-mono text-xs">offset</td>
					<td class="py-2">0</td>
					<td class="py-2">0+</td>
					<td class="text-muted-foreground py-2">Number of records to skip</td>
				</tr>
			</tbody>
		</table>
		<p class="text-muted-foreground text-sm">
			To iterate all records, keep fetching pages until
			<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">offset + meta.count &gt;= meta.total</code>.
		</p>
		<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm"># Page 1
GET /players?limit=50&offset=0

# Page 2
GET /players?limit=50&offset=50

# Page 3
GET /players?limit=50&offset=100</pre>
	</section>

	<!-- Sorting -->
	<section id="sorting" class="scroll-mt-20 space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Sorting</h2>
		<p class="text-muted-foreground text-sm leading-relaxed">
			The <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">player-stats</code> and
			<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">player-stats-advanced</code> endpoints support dynamic sorting via
			<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">sort_by</code> and
			<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">order</code> query parameters.
		</p>
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b text-left">
					<th class="text-muted-foreground pb-2 font-medium">Parameter</th>
					<th class="text-muted-foreground pb-2 font-medium">Type</th>
					<th class="text-muted-foreground pb-2 font-medium">Description</th>
				</tr>
			</thead>
			<tbody>
				<tr class="border-b">
					<td class="py-2 font-mono text-xs">sort_by</td>
					<td class="py-2 font-mono text-xs">string</td>
					<td class="text-muted-foreground py-2">Column to sort by (see valid values per endpoint)</td>
				</tr>
				<tr>
					<td class="py-2 font-mono text-xs">order</td>
					<td class="py-2 font-mono text-xs">string</td>
					<td class="text-muted-foreground py-2"><code class="bg-muted rounded px-1 font-mono text-xs">asc</code> or <code class="bg-muted rounded px-1 font-mono text-xs">desc</code> (default: desc)</td>
				</tr>
			</tbody>
		</table>
		<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm"># Top goal scorers in 2024, round 10
GET /player-stats?year=2024&round=10&sort_by=goals&order=desc</pre>
	</section>

	<!-- Errors -->
	<section id="errors" class="scroll-mt-20 space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Errors</h2>
		<p class="text-muted-foreground text-sm">
			Error responses always include an <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">error</code> string.
		</p>
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
				<tr class="border-b">
					<td class="py-2 font-mono text-xs">404</td>
					<td class="py-2 font-mono text-xs">{`{"error":"... not found"}`}</td>
					<td class="text-muted-foreground py-2">Resource with the given ID does not exist</td>
				</tr>
				<tr>
					<td class="py-2 font-mono text-xs">429</td>
					<td class="py-2 font-mono text-xs">{`{"error":"Rate limit exceeded"}`}</td>
					<td class="text-muted-foreground py-2">Your key's request limit has been reached</td>
				</tr>
			</tbody>
		</table>
	</section>

	<!-- ────────────────────────────────────────────────────────────────────── -->
	<!-- ENDPOINT SECTIONS                                                     -->
	<!-- ────────────────────────────────────────────────────────────────────── -->

	<div class="space-y-16 border-t pt-8">
		<h2 class="text-2xl font-bold">Endpoints</h2>

		<!-- ── TEAMS ─────────────────────────────────────────────────────── -->
		<section id="teams" class="scroll-mt-20 space-y-10">
			<h3 class="text-lg font-semibold">Teams</h3>

			<!-- GET /teams -->
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
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
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
					<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">curl /api/afl/v1/teams -H "Authorization: Bearer YOUR_KEY"</pre>
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
			</div>

			<!-- GET /teams/:id -->
			<div class="space-y-4 border-t pt-8">
				<div class="flex items-center gap-3">
					<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
					<code class="font-mono text-base">/teams/:id</code>
				</div>
				<p class="text-muted-foreground text-sm">Returns a single team by its slug ID.</p>
				<div class="space-y-1">
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Path Parameters</p>
					<table class="w-full text-sm">
						<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
						<tbody>
							<tr><td class="py-2 font-mono text-xs">id</td><td class="py-2 font-mono text-xs">string</td><td class="text-muted-foreground py-2">Team slug, e.g. <code class="bg-muted rounded px-1 font-mono text-xs">sydney-swans</code></td></tr>
						</tbody>
					</table>
				</div>
				<div class="space-y-1">
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
					<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">curl /api/afl/v1/teams/sydney-swans -H "Authorization: Bearer YOUR_KEY"</pre>
				</div>
				<div class="space-y-1">
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
					<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": { "id": "sydney-swans", "name": "Sydney Swans", "shortName": "SYD" }
}`}</pre>
				</div>
			</div>

			<!-- GET /teams/:id/stats -->
			<div class="space-y-4 border-t pt-8">
				<div class="flex items-center gap-3">
					<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
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
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
					<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">curl "/api/afl/v1/teams/sydney-swans/stats?year=2024" \
  -H "Authorization: Bearer YOUR_KEY"</pre>
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
			</div>
		</section>

		<!-- ── PLAYERS ───────────────────────────────────────────────────── -->
		<section id="players" class="scroll-mt-20 space-y-10 border-t pt-12">
			<h3 class="text-lg font-semibold">Players</h3>

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
    { "id": 144, "name": "Chad Warner", "currentTeamId": "sydney-swans", "onlineId": "12345" }
  ],
  "meta": { "limit": 50, "offset": 0, "count": 1, "total": 1 }
}`}</pre>
				</div>
			</div>

			<!-- GET /players/:id -->
			<div class="space-y-4 border-t pt-8">
				<div class="flex items-center gap-3">
					<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
					<code class="font-mono text-base">/players/:id</code>
				</div>
				<p class="text-muted-foreground text-sm">Returns a single player by numeric ID.</p>
				<div class="space-y-1">
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
					<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">curl /api/afl/v1/players/144 -H "Authorization: Bearer YOUR_KEY"</pre>
				</div>
				<div class="space-y-1">
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
					<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": { "id": 144, "name": "Chad Warner", "currentTeamId": "sydney-swans", "onlineId": "12345" }
}`}</pre>
				</div>
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
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
					<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">curl /api/afl/v1/players/144/career -H "Authorization: Bearer YOUR_KEY"</pre>
				</div>
				<div class="space-y-1">
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
					<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": {
    "playerId": 144,
    "playerName": "Chad Warner",
    "currentTeamId": "sydney-swans",
    "gamesPlayed": 85,
    "totals": {
      "kicks": 1020, "handballs": 780, "disposals": 1800,
      "marks": 340, "goals": 62, "behinds": 28,
      "tackles": 310, "hitouts": 0, ...
    },
    "averages": {
      "kicks": 12.0, "handballs": 9.18, "disposals": 21.18,
      "marks": 4.0, "goals": 0.73, "behinds": 0.33,
      "tackles": 3.65, "hitouts": 0, ...
    }
  }
}`}</pre>
				</div>
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
				<div class="space-y-1">
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
					<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">curl "/api/afl/v1/players/144/season?year=2024" -H "Authorization: Bearer YOUR_KEY"</pre>
				</div>
				<p class="text-muted-foreground text-sm">Response shape is identical to <code class="bg-muted rounded px-1 font-mono text-xs">/players/:id/career</code> but scoped to the given year.</p>
			</div>
		</section>

		<!-- ── MATCHES ───────────────────────────────────────────────────── -->
		<section id="matches" class="scroll-mt-20 space-y-10 border-t pt-12">
			<h3 class="text-lg font-semibold">Matches</h3>

			<!-- GET /matches -->
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
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
GET /matches?team_id=sydney-swans&year=2024

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
			</div>

			<!-- GET /matches/:id -->
			<div class="space-y-4 border-t pt-8">
				<div class="flex items-center gap-3">
					<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
					<code class="font-mono text-base">/matches/:id</code>
				</div>
				<p class="text-muted-foreground text-sm">Returns a single match by numeric ID.</p>
				<div class="space-y-1">
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
					<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">curl /api/afl/v1/matches/9812 -H "Authorization: Bearer YOUR_KEY"</pre>
				</div>
				<p class="text-muted-foreground text-sm">Response shape is the same as a single item from <code class="bg-muted rounded px-1 font-mono text-xs">GET /matches</code>, wrapped in <code class="bg-muted rounded px-1 font-mono text-xs">{`{ "data": { ... } }`}</code>.</p>
			</div>
		</section>

		<!-- ── PLAYER STATS ──────────────────────────────────────────────── -->
		<section id="player-stats" class="scroll-mt-20 space-y-4 border-t pt-12">
			<h3 class="text-lg font-semibold">Player Stats</h3>

			<div class="flex items-center gap-3">
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
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
      "matchId": 9812, "playerName": "Chad Warner", "teamId": "sydney-swans",
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

			<!-- Stat fields reference -->
			<div class="space-y-2">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Stat Fields Reference</p>
				<table class="w-full text-sm">
					<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Field</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
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

		<!-- ── PLAYER STATS ADVANCED ─────────────────────────────────────── -->
		<section id="player-stats-advanced" class="scroll-mt-20 space-y-4 border-t pt-12">
			<h3 class="text-lg font-semibold">Player Stats (Advanced)</h3>

			<div class="flex items-center gap-3">
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
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

			<!-- Advanced stat fields reference -->
			<div class="space-y-2">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Advanced Stat Fields Reference</p>
				<table class="w-full text-sm">
					<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Field</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
					<tbody>
						{#each [
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
							['timeOnGroundPct', 'Time on ground (percentage)'],
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

		<!-- ── PLAYER TEAM ASSIGNMENTS ────────────────────────────────────── -->
		<section id="player-team-assignments" class="scroll-mt-20 space-y-4 border-t pt-12">
			<h3 class="text-lg font-semibold">Player Team Assignments</h3>

			<div class="flex items-center gap-3">
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
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
      "teamId": "sydney-swans", "teamName": "Sydney Swans",
      "startYear": 2021, "endYear": null, "reason": "rookie"
    }
  ],
  "meta": { "limit": 50, "offset": 0, "count": 1, "total": 1 }
}`}</pre>
			</div>
		</section>

		<!-- ── LEADERBOARDS ──────────────────────────────────────────────── -->
		<section id="leaderboards" class="scroll-mt-20 space-y-4 border-t pt-12">
			<h3 class="text-lg font-semibold">Leaderboards</h3>

			<div class="flex items-center gap-3">
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
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
GET /leaderboards?stat=goals&year=2024&round=5&team_id=sydney-swans</pre>
			</div>
			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
				<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    { "playerId": 144, "playerName": "Chad Warner", "teamId": "sydney-swans", "value": 32 },
    { "playerId": 201, "playerName": "Marcus Bontempelli", "teamId": "western-bulldogs", "value": 31 }
  ],
  "meta": { "limit": 10, "offset": 0, "count": 10, "total": 4820 }
}`}</pre>
			</div>
		</section>

		<!-- ── HEAD-TO-HEAD ──────────────────────────────────────────────── -->
		<section id="head-to-head" class="scroll-mt-20 space-y-4 border-t pt-12">
			<h3 class="text-lg font-semibold">Head-to-Head</h3>

			<div class="flex items-center gap-3">
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
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
GET /head-to-head?team_a=sydney-swans&team_b=collingwood&venue=SCG</pre>
			</div>
			<p class="text-muted-foreground text-sm">Response is a standard paginated list of match objects (same shape as <code class="bg-muted rounded px-1 font-mono text-xs">GET /matches</code>).</p>
		</section>

		<!-- ── VENUES ────────────────────────────────────────────────────── -->
		<section id="venues" class="scroll-mt-20 space-y-4 border-t pt-12">
			<h3 class="text-lg font-semibold">Venues</h3>

			<div class="flex items-center gap-3">
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
				<code class="font-mono text-base">/venues</code>
			</div>
			<p class="text-muted-foreground text-sm">
				Returns all venues in the database with match counts, ordered by most matches. Useful for getting valid venue values for the
				<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">venue</code> filter on other endpoints.
			</p>
			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
				<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">curl /api/afl/v1/venues -H "Authorization: Bearer YOUR_KEY"</pre>
			</div>
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
		</section>

		<!-- ── STANDINGS ─────────────────────────────────────────────────── -->
		<section id="standings" class="scroll-mt-20 space-y-4 border-t pt-12">
			<h3 class="text-lg font-semibold">Standings</h3>

			<div class="flex items-center gap-3">
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
				<code class="font-mono text-base">/standings</code>
			</div>
			<p class="text-muted-foreground text-sm">
				Returns the season ladder for a given year: wins, losses, draws, points for/against, percentage, and premiership points.
				Ordered by premiership points then percentage.
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
			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
				<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">curl "/api/afl/v1/standings?year=2024" -H "Authorization: Bearer YOUR_KEY"</pre>
			</div>
			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
				<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    {
      "teamId": "sydney-swans", "teamName": "Sydney Swans", "teamShortName": "SYD",
      "played": 24, "wins": 17, "losses": 6, "draws": 1,
      "pointsFor": 2156, "pointsAgainst": 1742,
      "percentage": 123.77, "premiershipsPoints": 70
    },
    {
      "teamId": "carlton", "teamName": "Carlton", "teamShortName": "CAR",
      "played": 24, "wins": 16, "losses": 7, "draws": 1,
      "pointsFor": 2044, "pointsAgainst": 1698,
      "percentage": 120.38, "premiershipsPoints": 66
    }
  ],
  "meta": { "year": 2024, "count": 18 }
}`}</pre>
			</div>
			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Scoring</p>
				<table class="w-full text-sm">
					<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Result</th><th class="text-muted-foreground pb-2 font-medium">Points</th></tr></thead>
					<tbody>
						<tr class="border-b"><td class="py-2">Win</td><td class="py-2">4</td></tr>
						<tr class="border-b"><td class="py-2">Draw</td><td class="py-2">2</td></tr>
						<tr><td class="py-2">Loss</td><td class="py-2">0</td></tr>
					</tbody>
				</table>
				<p class="text-muted-foreground mt-2 text-sm">
					Percentage is calculated as
					<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">(pointsFor / pointsAgainst) * 100</code>.
				</p>
			</div>
		</section>

		<!-- ── FIXTURE ────────────────────────────────────────────────────── -->
		<section id="fixture" class="scroll-mt-20 space-y-4 border-t pt-12">
			<h3 class="text-lg font-semibold">Fixture (Public)</h3>

			<div class="flex items-center gap-3">
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
				<code class="font-mono text-base">/fixture</code>
				<span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">Public</span>
			</div>
			<p class="text-muted-foreground text-sm">
				Returns the season fixture (schedule) sourced from the Squiggle API. This is the only endpoint that does
				<strong>not</strong> require authentication.
			</p>
			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
				<table class="w-full text-sm">
					<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
					<tbody>
						<tr><td class="py-2 font-mono text-xs">year</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2">No</td><td class="text-muted-foreground py-2">Season year (default: current year). Range: 2000 to next year.</td></tr>
					</tbody>
				</table>
			</div>
			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
				<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm"># No auth required
curl /api/afl/v1/fixture?year=2024</pre>
			</div>
			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
				<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "year": 2024,
  "games": [ ... ]  // Squiggle fixture data
}`}</pre>
			</div>
		</section>
	</div>

	<!-- ────────────────────────────────────────────────────────────────────── -->
	<!-- QUICK REFERENCE                                                       -->
	<!-- ────────────────────────────────────────────────────────────────────── -->

	<section class="scroll-mt-20 space-y-4 border-t pt-12">
		<h2 class="text-xl font-semibold">Quick Reference</h2>
		<p class="text-muted-foreground text-sm">All endpoints at a glance. All require auth unless noted.</p>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b text-left">
						<th class="text-muted-foreground pb-2 pr-4 font-medium">Method</th>
						<th class="text-muted-foreground pb-2 pr-4 font-medium">Path</th>
						<th class="text-muted-foreground pb-2 font-medium">Description</th>
					</tr>
				</thead>
				<tbody>
					{#each [
						['GET', '/teams', 'List all teams'],
						['GET', '/teams/:id', 'Get single team'],
						['GET', '/teams/:id/stats', 'Aggregated team stats per match'],
						['GET', '/players', 'List players (search, filter)'],
						['GET', '/players/:id', 'Get single player'],
						['GET', '/players/:id/career', 'Career totals + averages'],
						['GET', '/players/:id/season', 'Season totals + averages'],
						['GET', '/matches', 'List matches (filter by team, venue, dates)'],
						['GET', '/matches/:id', 'Get single match'],
						['GET', '/player-stats', 'Per-match player stats (sortable)'],
						['GET', '/player-stats-advanced', 'Per-match advanced stats (sortable)'],
						['GET', '/player-team-assignments', 'Transfer / movement history'],
						['GET', '/leaderboards', 'Top players by any stat'],
						['GET', '/head-to-head', 'Match history between two teams'],
						['GET', '/venues', 'All venues with match counts'],
						['GET', '/standings', 'Season ladder'],
						['GET', '/fixture', 'Season schedule (Public -- no auth)'],
					] as [method, path, desc]}
						<tr class="border-b last:border-0">
							<td class="py-2 pr-4"><span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">{method}</span></td>
							<td class="py-2 pr-4 font-mono text-xs">{path}</td>
							<td class="text-muted-foreground py-2">{desc}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

</div>
