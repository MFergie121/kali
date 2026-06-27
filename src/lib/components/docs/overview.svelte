<!-- Shared docs overview body. Rendered by both /docs (public) and
     /home/kali-afl/api-docs (in-app). No <svelte:head> or sign-in CTA — those
     are owned by the surrounding page. -->
<div class="space-y-12">
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

	<!-- New: MCP / Claude callout -->
	<div class="border-primary/30 bg-primary/5 rounded-lg border p-4">
		<p class="text-sm leading-relaxed">
			<span class="text-foreground font-semibold">New — use this data with Claude.</span>
			<span class="text-muted-foreground">
				Connect Claude to the database with our MCP server and ask AFL questions in plain
				English — no SQL or code required.
			</span>
			<a href="/docs/mcp" class="text-primary underline underline-offset-4">See the Claude / MCP guide →</a>
		</p>
	</div>

	<!-- Authentication -->
	<section id="authentication" class="scroll-mt-20 space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Authentication</h2>
		<p class="text-muted-foreground text-sm leading-relaxed">
			Every request (except <a href="/docs/fixture" class="text-primary underline underline-offset-4">Fixture</a>) requires an API key passed via the
			<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">Authorization</code> header as a Bearer token.
			Keys are managed on the <a href="/home/kali-afl/api-usage" class="text-primary underline underline-offset-4">API Usage</a> page after signing in.
			<a href="/auth/login" class="text-primary underline underline-offset-4">Get a free API key →</a>
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Header Format</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">Authorization: Bearer YOUR_API_KEY</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Example</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">curl https://kaliaflstats.com/api/afl/v1/teams \
  -H "Authorization: Bearer a3f9c2d1e8..."</pre>
		</div>
	</section>

	<!-- Base URL -->
	<section id="base-url" class="scroll-mt-20 space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Base URL</h2>
		<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">https://kaliaflstats.com/api/afl/v1</pre>
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
    "id": "sydney",
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

	<!-- Quick Reference -->
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
						['GET', '/tips', 'Win-probability tips by round'],
						['GET', '/fixture', 'Season schedule (Public — no auth)'],
						['GET', '/predictions', 'Win-probability predictions (filterable, versioned)'],
						['GET', '/predictions/:id', 'Get a single prediction'],
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
