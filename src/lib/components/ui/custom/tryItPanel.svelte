<script lang="ts">
	export type ParamDef = { name: string; placeholder?: string; default?: string };

	let {
		endpoint,
		method = 'GET',
		pathParams = [],
		queryParams = [],
		noAuth = false
	}: {
		endpoint: string;
		method?: string;
		pathParams?: ParamDef[];
		queryParams?: ParamDef[];
		noAuth?: boolean;
	} = $props();

	const BASE = 'https://kaliaflstats.com/api/afl/v1';

	let open = $state(false);
	let copied = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<string | null>(null);
	let status = $state<number | null>(null);

	// Seed each param's input from its declared default (if any). The props are
	// static per usage, and the inputs are user-owned after seeding.
	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, string>>(
		Object.fromEntries([...pathParams, ...queryParams].map((p) => [p.name, p.default ?? '']))
	);

	// Substitute `:name` path segments with their (encoded) values; leave the
	// placeholder token in place when a value hasn't been entered yet.
	const resolvedPath = $derived.by(() => {
		let path = endpoint;
		for (const p of pathParams) {
			const raw = values[p.name]?.trim() ?? '';
			path = path.replaceAll(`:${p.name}`, raw ? encodeURIComponent(raw) : `:${p.name}`);
		}
		return path;
	});

	// Build the query object from non-empty query params only.
	const queryObject = $derived.by(() => {
		const o: Record<string, string> = {};
		for (const p of queryParams) {
			const raw = values[p.name]?.trim() ?? '';
			if (raw) o[p.name] = raw;
		}
		return o;
	});

	const queryString = $derived.by(() => {
		const s = new URLSearchParams(queryObject).toString();
		return s ? `?${s}` : '';
	});

	const fullUrl = $derived(`${BASE}${resolvedPath}${queryString}`);

	const curl = $derived.by(() => {
		const url = queryString ? `"${fullUrl}"` : fullUrl;
		const auth = noAuth ? '' : ` \\\n  -H "Authorization: Bearer YOUR_API_KEY"`;
		return `curl ${url}${auth}`;
	});

	async function copyCurl() {
		try {
			await navigator.clipboard.writeText(curl);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			/* clipboard unavailable — ignore */
		}
	}

	async function send() {
		loading = true;
		error = null;
		result = null;
		status = null;
		try {
			const res = await fetch('/api/afl/demo', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ path: resolvedPath, params: queryObject })
			});
			status = res.status;
			const text = await res.text();
			try {
				result = JSON.stringify(JSON.parse(text), null, 2);
			} catch {
				result = text;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Request failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="border-border bg-muted/30 mt-4 rounded-lg border">
	<button
		type="button"
		class="text-primary flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<span>Try it {open ? '↓' : '→'}</span>
		{#if noAuth}
			<span
				class="bg-accent text-muted-foreground rounded-full px-2 py-0.5 text-xs font-semibold"
				>no auth required</span
			>
		{/if}
	</button>

	{#if open}
		<div class="border-border space-y-4 border-t p-4">
			<!-- Path parameters -->
			{#if pathParams.length}
				<div class="space-y-2">
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
						Path Parameters
					</p>
					<div class="grid gap-2 sm:grid-cols-2">
						{#each pathParams as p (p.name)}
							<label class="block space-y-1 text-sm">
								<span class="text-foreground font-mono text-xs">:{p.name}</span>
								<input
									class="border-border bg-background text-foreground focus:ring-ring w-full rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
									placeholder={p.placeholder ?? ''}
									bind:value={values[p.name]}
								/>
							</label>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Query parameters -->
			{#if queryParams.length}
				<div class="space-y-2">
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
						Query Parameters
					</p>
					<div class="grid gap-2 sm:grid-cols-2">
						{#each queryParams as p (p.name)}
							<label class="block space-y-1 text-sm">
								<span class="text-foreground font-mono text-xs">{p.name}</span>
								<input
									class="border-border bg-background text-foreground focus:ring-ring w-full rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
									placeholder={p.placeholder ?? ''}
									bind:value={values[p.name]}
								/>
							</label>
						{/each}
					</div>
				</div>
			{/if}

			<!-- curl preview -->
			<div class="space-y-1">
				<div class="flex items-center justify-between">
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">cURL</p>
					<button
						type="button"
						class="text-primary text-xs font-medium hover:underline"
						onclick={copyCurl}
					>
						{copied ? 'Copied ✓' : 'Copy'}
					</button>
				</div>
				<pre
					class="bg-background border-border text-foreground overflow-x-auto rounded-md border p-3 font-mono text-xs">{curl}</pre>
			</div>

			<!-- Send -->
			<button
				type="button"
				class="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
				disabled={loading}
				onclick={send}
			>
				{loading ? 'Sending…' : `Send ${method}`}
			</button>

			<!-- Response -->
			{#if error}
				<p class="text-destructive text-sm">{error}</p>
			{/if}
			{#if result !== null}
				<div class="space-y-1">
					<div class="flex items-center gap-2">
						<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
							Response
						</p>
						{#if status !== null}
							<span
								class="rounded-full px-2 py-0.5 text-xs font-semibold {status >= 200 &&
								status < 300
									? 'bg-accent text-foreground'
									: 'bg-destructive/15 text-destructive'}">{status}</span
							>
						{/if}
					</div>
					<pre
						class="bg-background border-border text-foreground max-h-96 overflow-auto rounded-md border p-3 font-mono text-xs">{result}</pre>
				</div>
			{/if}
		</div>
	{/if}
</div>
