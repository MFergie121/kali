<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/components/ui/custom/logo.svelte';
	import UserMenu from '$lib/components/ui/custom/userMenu.svelte';
	import {
	  Sidebar,
	  SidebarContent,
	  SidebarGroup,
	  SidebarGroupContent,
	  SidebarGroupLabel,
	  SidebarInset,
	  SidebarMenu,
	  SidebarMenuButton,
	  SidebarMenuItem,
	  SidebarProvider,
	  SidebarRail,
	  SidebarTrigger
	} from '$lib/components/ui/sidebar';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const aflNavItems = [
		{ href: '/home/kali-afl-scraper', label: 'Matches & Stats' },
		{ href: '/home/kali-afl-scraper/section-1', label: 'Section 1' },
		{ href: '/home/kali-afl-scraper/section-2', label: 'Section 2' }
	] as const;

	const isAflScraper = $derived(page.url.pathname.startsWith('/home/kali-afl-scraper'));
</script>

<SidebarProvider>
	{#if isAflScraper}
		<Sidebar variant="sidebar" collapsible="offcanvas">
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>AFL Scraper</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{#each aflNavItems as item (item.href)}
								<SidebarMenuItem>
									<SidebarMenuButton isActive={page.url.pathname === item.href}>
										{#snippet child({ props })}
											<a href={item.href} {...props}>{item.label}</a>
										{/snippet}
									</SidebarMenuButton>
								</SidebarMenuItem>
							{/each}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	{/if}
	<SidebarInset>
		<header class="bg-background sticky top-0 z-40 flex h-14 items-center border-b px-4">
			<nav class="flex w-full items-center justify-between">
				<div class="flex items-center gap-2">
					{#if isAflScraper}
						<SidebarTrigger class="-ms-1" />
					{/if}
					<a href="/home" class="flex items-center gap-2">
						<Logo size={22} />
						<span class="text-sm font-semibold">Kali</span>
					</a>
				</div>
				{#if data.session}
					<UserMenu session={data.session} />
				{/if}
			</nav>
		</header>
		<div class="flex-1">
			{@render children()}
		</div>
	</SidebarInset>
</SidebarProvider>
