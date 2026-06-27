<!-- Shared MCP docs body. Rendered by /docs/mcp (public) and reusable in-app.
     No <svelte:head> or sign-in CTA — those are owned by the surrounding page. -->
<div class="space-y-12">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Claude / MCP</h1>
		<p class="text-muted-foreground mt-2 text-base leading-relaxed">
			Connect Claude directly to the AFL database with the Kali MCP server. Ask football
			questions in plain English — Claude writes the SQL, runs it read-only, and answers
			from the results. No queries to write yourself.
		</p>
	</div>

	<!-- What it does -->
	<section class="scroll-mt-20 space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">What it does</h2>
		<p class="text-muted-foreground text-sm leading-relaxed">
			Once connected, just ask. For example:
		</p>
		<ul class="text-muted-foreground ml-5 list-disc space-y-1 text-sm">
			<li>"Which team had the highest average crowd in 2024?"</li>
			<li>"Show me the top 10 goal-kickers across the last three rounds."</li>
			<li>"Compare Geelong's home vs away win rate since 2016."</li>
		</ul>
		<p class="text-muted-foreground text-sm leading-relaxed">
			It's read-only (Claude can only <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">SELECT</code>),
			uses the same API key and daily quota as the REST API, and can only see AFL data —
			never user accounts or keys.
		</p>
	</section>

	<!-- Setup -->
	<section class="scroll-mt-20 space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Setup</h2>

		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">1. Get an API key</p>
			<p class="text-muted-foreground text-sm leading-relaxed">
				Create one on the <a href="/home/kali-afl/api-usage" class="text-primary underline underline-offset-4">API Usage</a>
				page after signing in. It's shown once — copy it straight away.
				<a href="/auth/login" class="text-primary underline underline-offset-4">Get a free API key →</a>
			</p>
		</div>

		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">2. Add the server (Claude Code)</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">claude mcp add --transport http kali-afl \
  https://kaliaflstats.com/mcp \
  --header "Authorization: Bearer YOUR_API_KEY"</pre>
		</div>

		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">3. Verify</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">claude mcp list</pre>
			<p class="text-muted-foreground text-sm">
				You should see <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">kali-afl</code> connected.
				Then just ask Claude an AFL question.
			</p>
		</div>
	</section>

	<!-- Claude Desktop -->
	<section class="scroll-mt-20 space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Using Claude Desktop?</h2>
		<p class="text-muted-foreground text-sm leading-relaxed">
			Add the same server to <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">claude_desktop_config.json</code>
			and restart the app:
		</p>
		<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "mcpServers": {
    "kali-afl": {
      "type": "http",
      "url": "https://kaliaflstats.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}`}</pre>
	</section>

	<!-- Limits -->
	<section class="scroll-mt-20 space-y-4 border-t pt-8">
		<h2 class="text-xl font-semibold">Good to know</h2>
		<ul class="text-muted-foreground ml-5 list-disc space-y-1 text-sm leading-relaxed">
			<li><span class="text-foreground font-medium">Read-only.</span> Claude can never change or delete data.</li>
			<li><span class="text-foreground font-medium">Quota.</span> Each query counts against your daily limit; it resets at midnight UTC. Browsing the schema is free.</li>
			<li><span class="text-foreground font-medium">Row cap.</span> A single query returns up to 1,000 rows — ask Claude to aggregate for larger sets.</li>
		</ul>
	</section>
</div>
