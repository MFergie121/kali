<script lang="ts">
	import { enhance } from '$app/forms';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let expandedUsers = new SvelteSet<number>();

	function toggleUser(id: number) {
		if (expandedUsers.has(id)) {
			expandedUsers.delete(id);
		} else {
			expandedUsers.add(id);
		}
	}

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
			Monitor usage and manage keys for each authenticated user.
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

	<!-- Empty state -->
	{#if data.users.length === 0}
		<div class="rounded-lg border border-dashed p-8 text-center">
			<p class="text-sm text-muted-foreground">
				No users yet. Users are created automatically when someone logs in via OAuth.
			</p>
		</div>

	{:else}
		<div class="space-y-2">
			{#each data.users as user (user.id)}
				{@const userKeys = data.keysByUser[user.id] ?? []}
				{@const isExpanded = expandedUsers.has(user.id)}
				{@const activeKeys = userKeys.filter(k => !k.revoked).length}

				<div class="overflow-hidden rounded-lg border border-border">

					<!-- User row -->
					<button
						type="button"
						class="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50"
						onclick={() => toggleUser(user.id)}
					>
						<!-- Avatar -->
						<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
							{user.name?.[0]?.toUpperCase() ?? '?'}
						</div>

						<!-- Identity -->
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between gap-4">
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-foreground">{user.name}</p>
									<p class="truncate font-mono text-xs text-muted-foreground">{user.email}</p>
								</div>
								<div class="flex shrink-0 items-center gap-4 text-right">
									<div class="hidden sm:block">
										<p class="text-xs text-muted-foreground">last active</p>
										<p class="text-xs font-medium text-foreground">{formatDateShort(user.lastActiveAt)}</p>
									</div>
									<div>
										<p class="text-xs text-muted-foreground">keys</p>
										<p class="text-xs font-medium text-foreground">{activeKeys} active</p>
									</div>
									<svg
										class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
										fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
									</svg>
								</div>
							</div>
						</div>
					</button>

					<!-- Expanded panel -->
					{#if isExpanded}
						<div class="space-y-5 border-t border-border bg-muted/30 px-5 py-5">

							<!-- Keys table -->
							{#if userKeys.length > 0}
								<div>
									<p class="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">API Keys</p>
									<div class="overflow-hidden rounded-md border border-border">
										<table class="w-full text-xs">
											<thead>
												<tr class="border-b border-border bg-muted">
													<th class="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
													<th class="px-3 py-2 text-left font-medium text-muted-foreground">Usage</th>
													<th class="px-3 py-2 text-left font-medium text-muted-foreground">Limit</th>
													<th class="px-3 py-2 text-left font-medium text-muted-foreground">Last used</th>
													<th class="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
													<th class="px-3 py-2"></th>
												</tr>
											</thead>
											<tbody class="divide-y divide-border">
												{#each userKeys as key (key.id)}
													{@const pct = usagePct(key.usage, key.limit)}
													{@const critical = isCritical(pct)}
													<tr class="bg-card">
														<td class="px-3 py-2 font-mono text-foreground">{key.name}</td>
														<td class="px-3 py-2 text-muted-foreground">
															<div>
																<span class="font-mono">{key.usage.toLocaleString()}</span>
																{#if key.limit !== null}
																	<div class="mt-1 h-1 w-16 overflow-hidden rounded-full bg-muted">
																		<div
																			class="h-full rounded-full {critical ? 'bg-destructive' : 'bg-primary'}"
																			style="width: {pct}%"
																		></div>
																	</div>
																{/if}
															</div>
														</td>
														<td class="px-3 py-2">
															<form method="POST" action="?/setLimit" use:enhance class="flex items-center gap-1.5">
																<input type="hidden" name="keyId" value={key.id} />
																<input
																	name="limit"
																	type="number"
																	min="0"
																	value={key.limit ?? ''}
																	placeholder="∞"
																	class="w-20 rounded border border-input bg-background px-2 py-0.5 font-mono text-xs text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
																/>
																<button
																	type="submit"
																	class="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground transition-colors hover:bg-muted"
																>
																	Set
																</button>
															</form>
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
								<input type="hidden" name="userId" value={user.id} />
								<div class="flex-1">
									<label class="mb-1.5 block text-xs font-medium text-foreground" for="keyname-{user.id}">
										New key name
									</label>
									<input
										id="keyname-{user.id}"
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
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
