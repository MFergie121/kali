<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let expandedUsers = $state<Set<number>>(new Set());

	function toggleUser(id: number) {
		if (expandedUsers.has(id)) {
			expandedUsers.delete(id);
		} else {
			expandedUsers.add(id);
		}
		expandedUsers = new Set(expandedUsers);
	}

	function formatDate(iso: string | null | undefined) {
		if (!iso) return '—';
		return new Date(iso).toLocaleString();
	}
</script>

<div class="mx-auto max-w-4xl space-y-6 p-6">
	<div>
		<h1 class="text-2xl font-bold">API Key Management</h1>
		<p class="text-muted-foreground mt-1 text-sm">
			Manage API users and their keys. Keys are linked to OAuth accounts.
		</p>
	</div>

	{#if form && 'createdToken' in form && form.createdToken}
		<div class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
			<p class="text-sm font-medium text-green-800 dark:text-green-200">
				Key "<strong>{form.createdName}</strong>" created. Copy it now — it won't be shown again.
			</p>
			<code class="mt-2 block break-all rounded bg-green-100 px-3 py-2 font-mono text-sm text-green-900 dark:bg-green-900 dark:text-green-100">
				{form.createdToken}
			</code>
		</div>
	{/if}

	{#if form && 'error' in form && form.error}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
			<p class="text-sm text-red-700 dark:text-red-300">{form.error}</p>
		</div>
	{/if}

	{#if data.users.length === 0}
		<div class="rounded-lg border border-dashed p-8 text-center">
			<p class="text-muted-foreground text-sm">
				No users yet. Users are created automatically when someone logs in via OAuth.
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.users as user (user.id)}
				{@const userKeys = data.keysByUser[user.id] ?? []}
				{@const isExpanded = expandedUsers.has(user.id)}

				<div class="rounded-lg border">
					<!-- User row -->
					<button
						type="button"
						class="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
						onclick={() => toggleUser(user.id)}
					>
						<div class="flex items-center gap-3">
							<div>
								<p class="font-medium">{user.name}</p>
								<p class="text-muted-foreground text-sm">{user.email} · {user.provider}</p>
							</div>
						</div>
						<div class="flex items-center gap-6 text-sm">
							<div class="text-right">
								<p class="font-mono">{user.apiUsage.toLocaleString()}{user.apiLimit !== null ? ` / ${user.apiLimit.toLocaleString()}` : ''}</p>
								<p class="text-muted-foreground">calls{user.apiLimit !== null ? ' (limited)' : ' (unlimited)'}</p>
							</div>
							<div class="text-right">
								<p>{formatDate(user.lastActiveAt)}</p>
								<p class="text-muted-foreground">last active</p>
							</div>
							<div class="text-right">
								<p>{userKeys.length} key{userKeys.length !== 1 ? 's' : ''}</p>
								<p class="text-muted-foreground">since {formatDate(user.createdAt).split(',')[0]}</p>
							</div>
							<span class="text-muted-foreground">{isExpanded ? '▲' : '▼'}</span>
						</div>
					</button>

					{#if isExpanded}
						<div class="border-t p-4 space-y-4">

							<!-- Set limit form -->
							<form
								method="POST"
								action="?/setLimit"
								use:enhance
								class="flex items-end gap-3"
							>
								<input type="hidden" name="userId" value={user.id} />
								<div class="flex-1">
									<label class="text-sm font-medium" for="limit-{user.id}">
										API call limit (blank = unlimited)
									</label>
									<input
										id="limit-{user.id}"
										name="limit"
										type="number"
										min="0"
										value={user.apiLimit ?? ''}
										placeholder="Unlimited"
										class="mt-1 block w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
									/>
								</div>
								<button
									type="submit"
									class="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
								>
									Save limit
								</button>
							</form>

							<!-- Existing keys -->
							{#if userKeys.length > 0}
								<table class="w-full text-sm">
									<thead>
										<tr class="border-b text-left text-muted-foreground">
											<th class="pb-2 font-medium">Name</th>
											<th class="pb-2 font-medium">Created</th>
											<th class="pb-2 font-medium">Last used</th>
											<th class="pb-2 font-medium">Status</th>
											<th class="pb-2"></th>
										</tr>
									</thead>
									<tbody>
										{#each userKeys as key (key.id)}
											<tr class="border-b last:border-0">
												<td class="py-2 font-mono text-xs">{key.name}</td>
												<td class="py-2 text-muted-foreground">{formatDate(key.createdAt)}</td>
												<td class="py-2 text-muted-foreground">{formatDate(key.lastUsedAt)}</td>
												<td class="py-2">
													{#if key.revoked}
														<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">Revoked</span>
													{:else}
														<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">Active</span>
													{/if}
												</td>
												<td class="py-2 text-right">
													{#if !key.revoked}
														<form method="POST" action="?/revokeKey" use:enhance>
															<input type="hidden" name="id" value={key.id} />
															<button
																type="submit"
																class="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
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
							{:else}
								<p class="text-muted-foreground text-sm">No keys yet.</p>
							{/if}

							<!-- Generate new key form -->
							<form
								method="POST"
								action="?/createKey"
								use:enhance
								class="flex items-end gap-3 border-t pt-4"
							>
								<input type="hidden" name="userId" value={user.id} />
								<div class="flex-1">
									<label class="text-sm font-medium" for="keyname-{user.id}">New key name</label>
									<input
										id="keyname-{user.id}"
										name="name"
										type="text"
										placeholder="e.g. My App"
										required
										class="mt-1 block w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
									/>
								</div>
								<button
									type="submit"
									class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
