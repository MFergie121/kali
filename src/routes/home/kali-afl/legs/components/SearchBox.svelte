<script lang="ts">
	type IndexPlayer = { id: number; name: string; teamId: string };
	type IndexTeam = { id: string; name: string; shortName: string };

	type Match =
		| { kind: 'player'; id: number; label: string; sub: string }
		| { kind: 'team'; slug: string; label: string; sub: string };

	let {
		players,
		teams,
		onSelect,
		disabled = false
	}: {
		players: IndexPlayer[];
		teams: IndexTeam[];
		onSelect: (m: { kind: 'player'; id: number } | { kind: 'team'; slug: string }) => void;
		disabled?: boolean;
	} = $props();

	let query = $state('');
	let open = $state(false);

	const teamName = $derived(new Map(teams.map((t) => [t.id, t.shortName])));

	const matches = $derived.by<Match[]>(() => {
		const q = query.trim().toLowerCase();
		if (q.length < 1) return [];
		const teamHits: Match[] = teams
			.filter((t) => t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q))
			.slice(0, 4)
			.map((t) => ({ kind: 'team', slug: t.id, label: t.name, sub: 'Team' }));
		const playerHits: Match[] = players
			.filter((p) => p.name.toLowerCase().includes(q))
			.slice(0, 8)
			.map((p) => ({
				kind: 'player',
				id: p.id,
				label: p.name,
				sub: teamName.get(p.teamId) ?? 'Player'
			}));
		return [...teamHits, ...playerHits].slice(0, 10);
	});

	function choose(m: Match) {
		query = m.label;
		open = false;
		if (m.kind === 'player') onSelect({ kind: 'player', id: m.id });
		else onSelect({ kind: 'team', slug: m.slug });
	}
</script>

<div class="search">
	<div class="search-field">
		<svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
			<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
			<line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" />
		</svg>
		<input
			class="search-input"
			type="text"
			placeholder="Search a player or team…"
			bind:value={query}
			{disabled}
			onfocus={() => (open = true)}
			oninput={() => (open = true)}
			autocomplete="off"
		/>
		{#if query.length > 0}
			<button class="search-clear" onclick={() => ((query = ''), (open = false))} aria-label="Clear"
				>×</button
			>
		{/if}
	</div>

	{#if open && matches.length > 0}
		<ul class="search-menu">
			{#each matches as m (m.kind + (m.kind === 'player' ? m.id : m.slug))}
				<li>
					<button class="search-option" onclick={() => choose(m)}>
						<span class="search-option-label">{m.label}</span>
						<span class="search-option-sub" class:is-team={m.kind === 'team'}>{m.sub}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.search {
		position: relative;
	}
	.search-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--card);
		padding: 0 0.75rem;
	}
	.search-field:focus-within {
		border-color: var(--primary);
	}
	.search-icon {
		color: var(--muted-foreground);
		flex-shrink: 0;
	}
	.search-input {
		flex: 1;
		border: none;
		background: transparent;
		color: var(--foreground);
		font-family: inherit;
		font-size: 0.9375rem;
		padding: 0.625rem 0;
		outline: none;
	}
	.search-input::placeholder {
		color: var(--muted-foreground);
	}
	.search-clear {
		border: none;
		background: none;
		color: var(--muted-foreground);
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		padding: 0 0.25rem;
	}
	.search-clear:hover {
		color: var(--foreground);
	}
	.search-menu {
		position: absolute;
		z-index: 20;
		top: calc(100% + 0.25rem);
		left: 0;
		right: 0;
		margin: 0;
		padding: 0.25rem;
		list-style: none;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--card);
		box-shadow: 0 8px 24px -8px color-mix(in oklch, var(--foreground), transparent 85%);
		max-height: 20rem;
		overflow-y: auto;
	}
	.search-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
		border: none;
		background: none;
		font-family: inherit;
		text-align: left;
		padding: 0.5rem 0.625rem;
		border-radius: 0.375rem;
		cursor: pointer;
		color: var(--foreground);
	}
	.search-option:hover {
		background: var(--accent);
	}
	.search-option-label {
		font-size: 0.875rem;
	}
	.search-option-sub {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.search-option-sub.is-team {
		color: var(--primary);
	}
</style>
