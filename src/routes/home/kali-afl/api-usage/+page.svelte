<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function formatDateShort(iso: string | null | undefined) {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('en-AU', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function usagePct(usage: number, limit: number | null): number {
		if (!limit) return 0;
		return Math.min(100, Math.round((usage / limit) * 100));
	}

	function isCritical(pct: number): boolean {
		return pct >= 90;
	}
</script>

<div class="mx-auto max-w-3xl space-y-6 p-6">

	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold">API Usage</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Your API keys and usage.
		</p>
	</div>

	<!-- Success banner -->
	{#if form && 'createdToken' in form && form.createdToken}
		<div class="rounded-lg border border-border bg-muted p-4">
			<p class="text-sm font-medium text-foreground">
				Key "<strong>{form.createdName}</strong>" created — copy it now, it won't be shown again.
			</p>
			<code class="mt-2 block break-all rounded-md bg-background px-3 py-2 font-mono text-sm text-foreground">
				{form.createdToken}
			</code>
		</div>
	{/if}

	<!-- Error banner -->
	{#if form && 'error' in form && form.error}
		<div class="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
			<p class="text-sm text-destructive">{form.error}</p>
		</div>
	{/if}

	<!-- User info -->
	<div class="flex items-center gap-4 rounded-lg border border-border px-5 py-4">
		<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
			{data.user.name?.[0]?.toUpperCase() ?? '?'}
		</div>
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-medium text-foreground">{data.user.name}</p>
			<p class="truncate font-mono text-xs text-muted-foreground">{data.user.email}</p>
		</div>
		<div class="shrink-0 text-right">
			<p class="text-xs text-muted-foreground">last active</p>
			<p class="text-xs font-medium text-foreground">{formatDateShort(data.user.lastActiveAt)}</p>
		</div>
	</div>

	<!-- Keys table -->
	<div class="space-y-4">
		<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">API Keys</p>

		{#if data.keys.length > 0}
			<div class="overflow-hidden rounded-md border border-border">
				<table class="w-full text-xs">
					<thead>
						<tr class="border-b border-border bg-muted">
							<th class="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
							<th class="px-3 py-2 text-left font-medium text-muted-foreground">Today / Total</th>
							<th class="px-3 py-2 text-left font-medium text-muted-foreground">Limit</th>
							<th class="px-3 py-2 text-left font-medium text-muted-foreground">Last used</th>
							<th class="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
							<th class="px-3 py-2"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each data.keys as key (key.id)}
							{@const pct = usagePct(key.usage, key.limit)}
							{@const critical = isCritical(pct)}
							<tr class="bg-card">
								<td class="px-3 py-2 font-mono text-foreground">{key.name}</td>
								<td class="px-3 py-2 text-muted-foreground">
									<div>
										<span class="font-mono">{key.usage.toLocaleString()}</span>
										<span class="text-muted-foreground/60 text-xs"> today</span>
										{#if key.limit !== null}
											<div class="mt-1 h-1 w-16 overflow-hidden rounded-full bg-muted">
												<div
													class="h-full rounded-full {critical ? 'bg-destructive' : 'bg-primary'}"
													style="width: {pct}%"
												></div>
											</div>
										{/if}
										<div class="mt-1 font-mono text-xs text-muted-foreground/60">
											{key.totalUsage.toLocaleString()} total
										</div>
									</div>
								</td>
								<td class="px-3 py-2 font-mono text-muted-foreground">
									{key.limit === null ? '∞' : key.limit.toLocaleString()}
								</td>
								<td class="px-3 py-2 text-muted-foreground">{formatDateShort(key.lastUsedAt)}</td>
								<td class="px-3 py-2">
									{#if key.revoked}
										<span class="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
											<span class="h-1.5 w-1.5 rounded-full bg-destructive"></span>
											Revoked
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
											<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
											Active
										</span>
									{/if}
								</td>
								<td class="px-3 py-2 text-right">
									{#if !key.revoked}
										<form method="POST" action="?/revokeKey" use:enhance>
											<input type="hidden" name="id" value={key.id} />
											<button
												type="submit"
												class="rounded px-2 py-0.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
												onclick={(e) => { if (!confirm('Revoke this key?')) e.preventDefault(); }}
											>
												Revoke
											</button>
										</form>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-xs text-muted-foreground">No keys yet.</p>
		{/if}

		<!-- New key form -->
		<form
			method="POST"
			action="?/createKey"
			use:enhance
			class="flex items-end gap-3 border-t border-border pt-4"
		>
			<div class="flex-1">
				<label class="mb-1.5 block text-xs font-medium text-foreground" for="keyname">
					New key name
				</label>
				<input
					id="keyname"
					name="name"
					type="text"
					placeholder="e.g. My App"
					required
					class="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				/>
			</div>
			<button
				type="submit"
				class="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
			>
				Generate key
			</button>
		</form>
	</div>
</div>
