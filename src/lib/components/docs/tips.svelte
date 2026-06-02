<script lang="ts">
	import TryItPanel from '$lib/components/ui/custom/tryItPanel.svelte';
</script>

<section class="space-y-10">
	<h1 class="text-2xl font-bold">Tips</h1>

	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">GET</span>
			<code class="font-mono text-base">/tips</code>
		</div>
		<p class="text-muted-foreground text-sm">
			Returns tipster win-probability predictions for each game in a given round, sourced from Squiggle. Each row is one tipster's prediction for one match.
		</p>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Query Parameters</p>
			<table class="w-full text-sm">
				<thead><tr class="border-b text-left"><th class="text-muted-foreground pb-2 font-medium">Name</th><th class="text-muted-foreground pb-2 font-medium">Type</th><th class="text-muted-foreground pb-2 font-medium">Required</th><th class="text-muted-foreground pb-2 font-medium">Description</th></tr></thead>
				<tbody>
					<tr class="border-b"><td class="py-2 font-mono text-xs">year</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2 font-semibold">Yes</td><td class="text-muted-foreground py-2">Season year</td></tr>
					<tr><td class="py-2 font-mono text-xs">round</td><td class="py-2 font-mono text-xs">integer</td><td class="py-2 font-semibold">Yes</td><td class="text-muted-foreground py-2">Round number</td></tr>
				</tbody>
			</table>
		</div>
		<div class="space-y-1">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    {
      "id": 1, "gameId": 38201, "year": 2026, "round": 4,
      "hteam": "Sydney Swans", "ateam": "Collingwood",
      "hconfidence": 62, "source": "Squiggle",
      "syncedAt": "2026-04-06T12:00:00.000Z"
    }
  ],
  "meta": { "year": 2026, "round": 4, "count": 9 }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/tips"
			queryParams={[
				{ name: 'year', placeholder: '2026', default: '2026' },
				{ name: 'round', placeholder: '4', default: '4' }
			]}
		/>
	</div>
</section>
