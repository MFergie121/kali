<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<h1>This is Kali</h1>
<p>A hub for all of your deployed applications that you can easily access from a proudly secure dashboard</p>

{#if data.session}
	<p>Signed in as <strong>{data.session.user.name || data.session.user.email}</strong></p>
	<a href="/home">Go to Home</a>
	<Button href="/auth/logout/{data.session.provider}" variant="destructive" size="sm">
		Sign out
	</Button>
{:else}
	<Button href="/auth/login">Login Page</Button>
{/if}
