<script lang="ts">
	import TryItPanel from '$lib/components/ui/custom/tryItPanel.svelte';
</script>

<section class="space-y-10">
	<h1 class="text-2xl font-bold">Standings</h1>

	<div class="space-y-4">
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
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Response</p>
			<pre class="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">{`{
  "data": [
    {
      "teamId": "sydney", "teamName": "Sydney Swans", "teamShortName": "SYD",
      "played": 24, "wins": 17, "losses": 6, "draws": 1,
      "pointsFor": 2156, "pointsAgainst": 1742,
      "percentage": 123.77, "premiershipsPoints": 70
    }
  ],
  "meta": { "year": 2024, "count": 18 }
}`}</pre>
		</div>
		<TryItPanel
			endpoint="/standings"
			queryParams={[{ name: 'year', placeholder: '2024', default: '2024' }]}
		/>
	</div>
</section>
