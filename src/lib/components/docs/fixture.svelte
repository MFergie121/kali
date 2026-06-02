<script lang="ts">
	import TryItPanel from '$lib/components/ui/custom/tryItPanel.svelte';
</script>

<section class="space-y-10">
	<h1 class="text-2xl font-bold">Fixture (Public)</h1>

	<div class="space-y-4">
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
curl /api/afl/v1/fixture?year=2026</pre>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "year": 2026,
  "games": [ ... ]  // Squiggle fixture data
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/fixture"
			noAuth
			queryParams={[{ name: 'year', placeholder: '2026', default: '2026' }]}
		/>
	</div>
</section>
