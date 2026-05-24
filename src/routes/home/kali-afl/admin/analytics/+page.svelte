<script lang="ts">
	import type { PageData } from './$types';
	import { RANGE_OPTIONS } from './analytics-utils';

	let { data }: { data: PageData } = $props();

	function formatDateTime(iso: string | null | undefined) {
		if (!iso) return '—';
		return new Date(iso).toLocaleString('en-AU', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function errorClass(pct: number) {
		return pct >= 5 ? 'val-error' : '';
	}
</script>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">admin</h1>
		<span class="page-sub">api analytics — /api/afl/v1/*</span>
	</div>

	<!-- Time-range selector (re-scopes every widget; persisted in the URL) -->
	<div class="card range-card">
		<p class="card-label">window</p>
		<div class="range-group" role="group" aria-label="Time range">
			{#each RANGE_OPTIONS as opt (opt.value)}
				<a
					href="?range={opt.value}"
					class="range-btn"
					class:range-btn-active={data.range === opt.value}
					aria-current={data.range === opt.value ? 'true' : undefined}
				>
					{opt.label}
				</a>
			{/each}
		</div>
	</div>

	<!-- Top endpoints -->
	<div class="card">
		<p class="card-label">top endpoints</p>
		{#if data.topEndpoints.length === 0}
			<p class="empty">No requests in this window.</p>
		{:else}
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Route</th>
							<th class="num">Requests</th>
							<th class="num">Error %</th>
							<th class="num">p50 latency</th>
						</tr>
					</thead>
					<tbody>
						{#each data.topEndpoints as ep (ep.routeId)}
							<tr>
								<td class="td-mono">{ep.routeId}</td>
								<td class="num">{ep.count.toLocaleString()}</td>
								<td class="num {errorClass(ep.errorPct)}">{ep.errorPct}%</td>
								<td class="num">{ep.p50LatencyMs} ms</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Zero-traffic endpoints -->
	<div class="card">
		<p class="card-label">zero-traffic endpoints</p>
		{#if data.zeroTrafficRoutes.length === 0}
			<p class="empty">Every known v1 route saw traffic in this window.</p>
		{:else}
			<div class="route-list">
				{#each data.zeroTrafficRoutes as route (route)}
					<span class="route-chip">{route}</span>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Per-user totals -->
	<div class="card">
		<p class="card-label">per-user totals</p>
		{#if data.perUserTotals.length === 0}
			<p class="empty">No authenticated requests in this window.</p>
		{:else}
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>User</th>
							<th class="num">Requests</th>
							<th class="num">Error %</th>
						</tr>
					</thead>
					<tbody>
						{#each data.perUserTotals as u (u.userId)}
							<tr>
								<td class="td-user">
									<span class="user-name">{u.userName ?? `user #${u.userId}`}</span>
									<span class="user-email">{u.userEmail ?? ''}</span>
								</td>
								<td class="num">{u.count.toLocaleString()}</td>
								<td class="num {errorClass(u.errorPct)}">{u.errorPct}%</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Recent errors -->
	<div class="card">
		<p class="card-label">recent errors (5xx)</p>
		{#if data.recentErrors.length === 0}
			<p class="empty">No server errors logged.</p>
		{:else}
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>When</th>
							<th class="num">Status</th>
							<th>Route</th>
							<th>User</th>
							<th>Query</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentErrors as err (err.id)}
							<tr>
								<td class="td-date">{formatDateTime(err.timestamp)}</td>
								<td class="num"><span class="status-badge">{err.status}</span></td>
								<td class="td-mono">{err.routeId}</td>
								<td class="td-date">{err.userEmail ?? '—'}</td>
								<td class="td-mono td-query">{err.queryString ?? '—'}</td>
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
		font-family: monospace;
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

	.empty {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	/* Range selector */
	.range-card {
		flex-direction: row;
		align-items: center;
		gap: 1rem;
	}

	.range-group {
		display: inline-flex;
		gap: 0.25rem;
		padding: 0.25rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background-color: var(--background);
	}

	.range-btn {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.3rem 0.75rem;
		border-radius: 0.375rem;
		color: var(--muted-foreground);
		text-decoration: none;
		transition: background-color 0.1s ease, color 0.1s ease;
	}

	.range-btn:hover {
		background-color: var(--accent);
		color: var(--foreground);
	}

	.range-btn-active {
		background-color: var(--primary);
		color: var(--primary-foreground);
	}

	.range-btn-active:hover {
		background-color: var(--primary);
		color: var(--primary-foreground);
	}

	/* Tables */
	.table-wrap {
		overflow-x: auto;
		border-radius: 0.375rem;
		border: 1px solid var(--border);
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.data-table thead tr {
		background-color: var(--muted);
		border-bottom: 1px solid var(--border);
	}

	.data-table th {
		padding: 0.5rem 0.75rem;
		text-align: left;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--muted-foreground);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}

	.data-table th.num,
	.data-table td.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.data-table tbody tr {
		background-color: var(--card);
		border-bottom: 1px solid var(--border);
		transition: background-color 0.1s ease;
	}

	.data-table tbody tr:last-child {
		border-bottom: none;
	}

	.data-table tbody tr:hover {
		background-color: color-mix(in oklch, var(--muted), transparent 50%);
	}

	.data-table td {
		padding: 0.625rem 0.75rem;
		vertical-align: middle;
	}

	.td-mono {
		font-family: monospace;
		color: var(--foreground);
	}

	.td-query {
		max-width: 18rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--muted-foreground);
	}

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

	.td-date {
		color: var(--muted-foreground);
		white-space: nowrap;
	}

	.val-error {
		color: var(--destructive);
		font-weight: 600;
	}

	.status-badge {
		display: inline-block;
		font-family: monospace;
		font-weight: 600;
		padding: 0.1rem 0.4rem;
		border-radius: 0.3rem;
		background-color: color-mix(in oklch, var(--destructive), transparent 88%);
		color: var(--destructive);
	}

	/* Zero-traffic chips */
	.route-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.route-chip {
		font-family: monospace;
		font-size: 0.75rem;
		padding: 0.25rem 0.625rem;
		border-radius: 0.375rem;
		border: 1px solid var(--border);
		background-color: var(--muted);
		color: var(--muted-foreground);
	}
</style>
