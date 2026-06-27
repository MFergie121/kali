<script lang="ts">
	import Mcp from '$lib/components/docs/mcp.svelte';
</script>

<svelte:head>
	<title>Claude / MCP — AFL Stats API | Kali AFL</title>
	<meta name="description" content="Connect Claude to the Kali AFL database with the MCP server. Ask AFL questions in plain English — Claude writes read-only SQL and answers from live data. Install in one command." />
	<meta name="keywords" content="AFL MCP server, Claude AFL, Model Context Protocol AFL, AFL data Claude, claude mcp add" />
	<meta property="og:title" content="Claude / MCP — AFL Stats API | Kali AFL" />
	<meta property="og:description" content="Connect Claude to live AFL data with the Kali MCP server. Ask questions in plain English, no SQL required." />
	<meta property="og:url" content="https://kaliaflstats.com/docs/mcp" />
	<meta property="og:type" content="website" />
	<link rel="canonical" href="https://kaliaflstats.com/docs/mcp" />
</svelte:head>

<Mcp />

<!-- Get started CTA (public docs only) -->
<section class="mt-12 border-t pt-12 text-center">
	<p class="text-muted-foreground mb-4 text-sm">Ready to connect Claude?</p>
	<a href="/auth/login" class="doc-cta-btn">get a free api key →</a>
</section>
