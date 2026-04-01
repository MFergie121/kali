<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const totalKeys  = $derived(data.keys.length);
	const activeKeys = $derived(data.keys.filter((k) => !k.revoked).length);
	const revokedKeys = $derived(data.keys.filter((k) => k.revoked).length);

	function formatDateShort(iso: string | null | undefined) {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('en-AU', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	}

	function usagePct(usage: number, limit: number | null): number {
		if (!limit) return 0;
		return Math.min(100, Math.round((usage / limit) * 100));
	}
</script>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">admin</h1>
		<span class="page-sub">api key management</span>
	</div>

	<!-- Search -->
	<div class="card">
		<p class="card-label">search</p>
		<form method="GET" class="search-row">
			<input
				name="q"
				type="text"
				value={data.search}
				placeholder="Filter by email or name…"
				class="search-input"
			/>
			<button type="submit" class="btn-primary">Search</button>
			{#if data.search}
				<a href="/home/kali-afl/admin/api-keys" class="btn-cancel">Clear</a>
			{/if}
		</form>
	</div>

	<!-- Stats -->
	<div class="card">
		<p class="card-label">overview</p>
		<div class="stats-row">
			<div class="stat-item">
				<span class="stat-value">{totalKeys}</span>
				<span class="stat-label">total keys</span>
			</div>
			<div class="stat-divider"></div>
			<div class="stat-item">
				<span class="stat-value stat-active">{activeKeys}</span>
				<span class="stat-label">active</span>
			</div>
			<div class="stat-divider"></div>
			<div class="stat-item">
				<span class="stat-value stat-revoked">{revokedKeys}</span>
				<span class="stat-label">revoked</span>
			</div>
		</div>
	</div>

	<!-- Action feedback -->
	{#if form && 'error' in form && form.error}
		<div class="banner banner-err">{form.error}</div>
	{/if}

	<!-- Keys table -->
	<div class="card">
		<p class="card-label">
			api keys{data.search ? ` — "${data.search}"` : ''}
		</p>

		{#if data.keys.length === 0}
			<p class="empty">No keys found{data.search ? ' for that search.' : '.'}</p>
		{:else}
			<div class="table-wrap">
				<table class="keys-table">
					<thead>
						<tr>
							<th>User</th>
							<th>Key name</th>
							<th>Today / Limit</th>
							<th>Created</th>
							<th>Last used</th>
							<th>Status</th>
							<th>Set limit</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each data.keys as key (key.id)}
							{@const pct = usagePct(key.usage, key.limit)}
							{@const critical = pct >= 90}
							<tr class:row-revoked={key.revoked}>
								<td class="td-user">
									<span class="user-name">{key.userName}</span>
									<span class="user-email">{key.userEmail}</span>
								</td>
								<td class="td-mono">{key.name}</td>
								<td class="td-usage">
									<span class="td-mono">
										{key.usage.toLocaleString()} / {key.limit === null ? '∞' : key.limit.toLocaleString()}
									</span>
									{#if key.limit !== null}
										<div class="usage-bar-track">
											<div
												class="usage-bar-fill"
												class:usage-bar-critical={critical}
												style="width: {pct}%"
											></div>
										</div>
									{/if}
									<div class="td-lifetime">{key.totalUsage.toLocaleString()} lifetime</div>
								</td>
								<td class="td-date">{formatDateShort(key.createdAt)}</td>
								<td class="td-date">{formatDateShort(key.lastUsedAt)}</td>
								<td>
									{#if key.revoked}
										<span class="badge badge-revoked">
											<span class="badge-dot"></span>Revoked
										</span>
									{:else}
										<span class="badge badge-active">
											<span class="badge-dot"></span>Active
										</span>
									{/if}
								</td>
								<td>
									<form method="POST" action="?/setLimit" use:enhance class="limit-form">
										<input type="hidden" name="keyId" value={key.id} />
										<input
											name="limit"
											type="number"
											min="0"
											value={key.limit ?? ''}
											placeholder="∞"
											class="limit-input"
										/>
										<button type="submit" class="btn-small">Save</button>
									</form>
								</td>
								<td class="td-action">
									{#if !key.revoked}
										<form method="POST" action="?/revoke" use:enhance>
											<input type="hidden" name="id" value={key.id} />
											<button
												type="submit"
												class="btn-revoke"
												onclick={(e) => { if (!confirm(`Revoke key "${key.name}" for ${key.userEmail}?`)) e.preventDefault(); }}
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
		{/if}
	</div>
</div>

<style>
	.page {
		max-width: 72rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.page-header {
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--foreground);
		letter-spacing: -0.02em;
	}

	.page-sub {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		letter-spacing: 0.03em;
	}

	.card {
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		background-color: var(--card);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.card-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}

	/* Search */
	.search-row {
		display: flex;
		gap: 0.625rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.search-input {
		flex: 1;
		min-width: 16rem;
		font-family: inherit;
		font-size: 0.875rem;
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background-color: var(--background);
		color: var(--foreground);
	}

	.search-input::placeholder { color: var(--muted-foreground); }
	.search-input:focus { outline: 2px solid var(--ring); outline-offset: 2px; }

	/* Stats */
	.stats-row {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.stat-value {
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--foreground);
		letter-spacing: -0.03em;
	}

	.stat-active  { color: var(--primary); }
	.stat-revoked { color: var(--destructive); }

	.stat-label {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-divider {
		width: 1px;
		height: 2rem;
		background-color: var(--border);
	}

	/* Banners */
	.banner {
		font-size: 0.8125rem;
		padding: 0.625rem 0.875rem;
		border-radius: 0.375rem;
	}

	.banner-err {
		background-color: color-mix(in oklch, var(--destructive), transparent 88%);
		color: var(--destructive);
		border: 1px solid color-mix(in oklch, var(--destructive), transparent 70%);
	}

	/* Table */
	.table-wrap {
		overflow-x: auto;
		border-radius: 0.375rem;
		border: 1px solid var(--border);
	}

	.keys-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.keys-table thead tr {
		background-color: var(--muted);
		border-bottom: 1px solid var(--border);
	}

	.keys-table th {
		padding: 0.5rem 0.75rem;
		text-align: left;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--muted-foreground);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}

	.keys-table tbody tr {
		background-color: var(--card);
		border-bottom: 1px solid var(--border);
		transition: background-color 0.1s ease;
	}

	.keys-table tbody tr:last-child { border-bottom: none; }
	.keys-table tbody tr:hover { background-color: color-mix(in oklch, var(--muted), transparent 50%); }

	.keys-table td {
		padding: 0.625rem 0.75rem;
		vertical-align: middle;
	}

	.row-revoked { opacity: 0.55; }

	/* Cell types */
	.td-user {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 10rem;
	}

	.user-name {
		font-weight: 500;
		color: var(--foreground);
	}

	.user-email {
		font-family: monospace;
		font-size: 0.6875rem;
		color: var(--muted-foreground);
	}

	.td-mono {
		font-family: monospace;
		color: var(--foreground);
	}

	.td-usage {
		min-width: 7rem;
	}

	.td-date {
		color: var(--muted-foreground);
		white-space: nowrap;
	}

	.td-action { text-align: right; }

	/* Usage bar */
	.usage-bar-track {
		margin-top: 0.25rem;
		height: 0.1875rem;
		width: 4rem;
		border-radius: 9999px;
		background-color: var(--muted);
		overflow: hidden;
	}

	.usage-bar-fill {
		height: 100%;
		border-radius: 9999px;
		background-color: var(--primary);
		transition: width 0.3s ease;
	}

	.usage-bar-critical { background-color: var(--destructive); }

	.td-lifetime {
		margin-top: 0.2rem;
		font-size: 0.6875rem;
		font-family: monospace;
		color: var(--muted-foreground);
		opacity: 0.6;
	}

	/* Badges */
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		border-radius: 9999px;
		padding: 0.15rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.badge-dot {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.badge-active {
		background-color: color-mix(in oklch, var(--primary), transparent 88%);
		color: var(--primary);
	}

	.badge-active .badge-dot { background-color: var(--primary); }

	.badge-revoked {
		background-color: color-mix(in oklch, var(--destructive), transparent 88%);
		color: var(--destructive);
	}

	.badge-revoked .badge-dot { background-color: var(--destructive); }

	/* Limit form */
	.limit-form {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.limit-input {
		width: 5rem;
		font-family: monospace;
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 0.3rem;
		background-color: var(--background);
		color: var(--foreground);
	}

	.limit-input::placeholder { color: var(--muted-foreground); }
	.limit-input:focus { outline: 2px solid var(--ring); outline-offset: 1px; }

	/* Buttons */
	.btn-primary {
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		padding: 0.4rem 1.25rem;
		border-radius: 0.375rem;
		border: none;
		background-color: var(--primary);
		color: var(--primary-foreground);
		cursor: pointer;
		transition: opacity 0.12s ease;
		white-space: nowrap;
	}

	.btn-primary:hover { opacity: 0.88; }

	.btn-cancel {
		font-family: inherit;
		font-size: 0.875rem;
		padding: 0.4rem 1rem;
		border-radius: 0.375rem;
		border: 1px solid var(--border);
		background: none;
		color: var(--muted-foreground);
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: color 0.12s ease;
		white-space: nowrap;
	}

	.btn-cancel:hover { color: var(--foreground); }

	.btn-small {
		font-family: inherit;
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.25rem 0.5rem;
		border-radius: 0.3rem;
		border: 1px solid var(--border);
		background-color: var(--background);
		color: var(--foreground);
		cursor: pointer;
		transition: background-color 0.1s ease;
		white-space: nowrap;
	}

	.btn-small:hover { background-color: var(--muted); }

	.btn-revoke {
		font-family: inherit;
		font-size: 0.6875rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.3rem;
		border: none;
		background: none;
		color: var(--destructive);
		cursor: pointer;
		transition: background-color 0.1s ease;
	}

	.btn-revoke:hover {
		background-color: color-mix(in oklch, var(--destructive), transparent 88%);
	}

	/* Empty state */
	.empty {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}
</style>
