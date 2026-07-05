<script lang="ts">
	let {
		result,
		small = false,
	}: {
		result: 'W' | 'L' | 'D';
		small?: boolean;
	} = $props();
</script>

<span
	class="result-chip"
	class:result-w={result === 'W'}
	class:result-l={result === 'L'}
	class:result-d={result === 'D'}
	class:result-sm={small}
>{result}</span>

<style>
	.result-chip { font-size: 0.6875rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 0.25rem; }
	.result-w { background-color: color-mix(in oklch, var(--success), transparent 82%); color: var(--success); }
	.result-l { background-color: color-mix(in oklch, var(--destructive), transparent 82%); color: var(--destructive); }
	.result-d { background-color: var(--secondary); color: var(--muted-foreground); }
	.result-sm { font-size: 0.625rem; }
</style>
