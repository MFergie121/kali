<script lang="ts">
	import { page } from '$app/state';
	import OAuthButtons from '$lib/components/ui/button/OAuthButtons.svelte';
	import { toast } from 'svelte-sonner';

	const ERROR_MESSAGES: Record<string, string> = {
		invalid_state: 'Your session expired. Please try signing in again.',
		auth_failed: 'Authentication failed. Please try again.'
	};

	$effect(() => {
		const error = page.url.searchParams.get('error');
		if (error) {
			const message = ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.';
			toast.error('Sign in failed', { description: message });
			history.replaceState(null, '', '/auth/login');
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-background">
	<div class="w-full max-w-sm space-y-8 rounded-lg border p-8 shadow-sm">
		<div class="space-y-2 text-center">
			<h1 class="text-2xl font-bold tracking-tight">Sign in to Kali</h1>
			<p class="text-sm text-muted-foreground">Choose a provider to continue</p>
		</div>

		<div class="space-y-3">
			<OAuthButtons />
		</div>

		<p class="text-center text-xs text-muted-foreground">
			By continuing, you agree to our Terms of Service.
		</p>
	</div>
</div>
