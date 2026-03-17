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
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { Collapsible } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const dashboardHref = '/home/kali-afl-scraper';

	const statsNavItems = [
		{ href: '/home/kali-afl-scraper/matches', label: 'Matches & Stats' },
		{ href: '/home/kali-afl-scraper/players', label: 'Players & Stats' },
		{ href: '/home/kali-afl-scraper/section-2', label: 'Section 2' }
	] as const;

	const apiDocsNavItems = [
		{ href: '/home/kali-afl-scraper/api-docs', label: 'Docs' },
		{ href: '/home/kali-afl-scraper/api-usage', label: 'Usage' }
	] as const;

	let statsOpen = $state(true);
	let apiDocsOpen = $state(true);

	const isAflScraper = $derived(page.url.pathname.startsWith('/home/kali-afl-scraper'));
	const isDashboardActive = $derived(
		page.url.pathname === dashboardHref || page.url.pathname === `${dashboardHref}/`
	);
</script>

<SidebarProvider>
	{#if isAflScraper}
		<Sidebar variant="sidebar" collapsible="offcanvas">
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Kali AFL Stats</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton isActive={isDashboardActive}>
									{#snippet child({ props })}
										<a href={dashboardHref} {...props}>Dashboard</a>
									{/snippet}
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<Collapsible.Root bind:open={statsOpen} class="group/collapsible">
					<SidebarGroup>
						<SidebarGroupLabel>
							{#snippet child({ props })}
								<Collapsible.Trigger
									{...props}
									class="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center rounded-md"
								>
									Stats
									<ChevronDownIcon class="ms-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
								</Collapsible.Trigger>
							{/snippet}
						</SidebarGroupLabel>
						<Collapsible.Content>
							<SidebarGroupContent>
								<SidebarMenu>
									{#each statsNavItems as item (item.href)}
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
						</Collapsible.Content>
					</SidebarGroup>
				</Collapsible.Root>

				<Collapsible.Root bind:open={apiDocsOpen} class="group/collapsible">
					<SidebarGroup>
						<SidebarGroupLabel>
							{#snippet child({ props })}
								<Collapsible.Trigger
									{...props}
									class="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center rounded-md"
								>
									API Docs
									<ChevronDownIcon class="ms-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
								</Collapsible.Trigger>
							{/snippet}
						</SidebarGroupLabel>
						<Collapsible.Content>
							<SidebarGroupContent>
								<SidebarMenu>
									{#each apiDocsNavItems as item (item.href)}
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
						</Collapsible.Content>
					</SidebarGroup>
				</Collapsible.Root>
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
