<script lang="ts">
	import type { UserSession } from '../../../../auth';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { setMode, resetMode, userPrefersMode } from 'mode-watcher';
	import { themeStore, themes, type Theme } from '$lib/theme.svelte';
	import { fontStore, fonts, type Font } from '$lib/font.svelte';
	import { goto } from '$app/navigation';

	let { session }: { session: UserSession } = $props();

	const initials = $derived(session.user.name?.charAt(0).toUpperCase() ?? '?');
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
	>
		{#if session.user.image}
			<img
				src={session.user.image}
				alt={session.user.name}
				class="size-8 rounded-full object-cover"
				referrerpolicy="no-referrer"
			/>
		{:else}
			<span
				class="bg-muted flex size-8 items-center justify-center rounded-full text-sm font-medium"
			>
				{initials}
			</span>
		{/if}
	</DropdownMenu.Trigger>

	<DropdownMenu.Content class="w-56" align="end">
		<!-- User info -->
		<DropdownMenu.Label class="font-normal">
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-medium leading-none">{session.user.name}</span>
				<span class="text-muted-foreground text-xs leading-none">{session.user.email}</span>
			</div>
		</DropdownMenu.Label>

		<DropdownMenu.Separator />

		<!-- Dark mode -->
		<DropdownMenu.Label class="text-muted-foreground px-2 py-1 text-xs font-normal"
			>Mode</DropdownMenu.Label
		>
		<DropdownMenu.RadioGroup
			value={userPrefersMode.current}
			onValueChange={(v) => {
				if (v === 'system') resetMode();
				else setMode(v as 'light' | 'dark');
			}}
		>
			<DropdownMenu.RadioItem value="light">Light</DropdownMenu.RadioItem>
			<DropdownMenu.RadioItem value="dark">Dark</DropdownMenu.RadioItem>
			<DropdownMenu.RadioItem value="system">System</DropdownMenu.RadioItem>
		</DropdownMenu.RadioGroup>

		<DropdownMenu.Separator />

		<!-- Theme sub-menu -->
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger>Theme</DropdownMenu.SubTrigger>
			<DropdownMenu.SubContent>
				<DropdownMenu.RadioGroup
					value={themeStore.current}
					onValueChange={(v) => themeStore.apply(v as Theme)}
				>
					{#each themes as theme (theme.id)}
						<DropdownMenu.RadioItem value={theme.id}>{theme.label}</DropdownMenu.RadioItem>
					{/each}
				</DropdownMenu.RadioGroup>
			</DropdownMenu.SubContent>
		</DropdownMenu.Sub>

		<!-- Font sub-menu -->
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger>Font</DropdownMenu.SubTrigger>
			<DropdownMenu.SubContent>
				<DropdownMenu.RadioGroup
					value={fontStore.current}
					onValueChange={(v) => fontStore.apply(v as Font)}
				>
					{#each fonts as font (font.id)}
						<DropdownMenu.RadioItem value={font.id}>{font.label}</DropdownMenu.RadioItem>
					{/each}
				</DropdownMenu.RadioGroup>
			</DropdownMenu.SubContent>
		</DropdownMenu.Sub>

		<DropdownMenu.Separator />

		<DropdownMenu.Item onclick={() => goto('/home/preferences')}>Preferences</DropdownMenu.Item>

		<DropdownMenu.Separator />

		<DropdownMenu.Item
			variant="destructive"
			onclick={() => goto(`/auth/logout/${session.provider}`)}
		>
			Sign out
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
