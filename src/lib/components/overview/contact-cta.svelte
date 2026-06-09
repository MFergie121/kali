<script lang="ts">
	const CONTACT_EMAIL = 'contact@kaliaflstats.com';
	const SUBJECT = encodeURIComponent('Kali AFL — quota increase request');
	const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${SUBJECT}`;
	const repoHref = 'https://github.com/MFergie121/kali-afl-stats';
</script>

<div class="border-border bg-card rounded-lg border p-6">
	<h3 class="text-foreground text-base font-semibold tracking-tight">need more than the daily limit?</h3>
	<p class="text-muted-foreground mt-2 text-[0.8125rem] leading-relaxed">
		The free tier is generous, but if you're building something that needs more headroom, just ask —
		quota bumps are handled by hand and happy to oblige.
	</p>
	<div class="mt-4 flex flex-wrap items-center gap-3">
		<a
			href={mailtoHref}
			class="bg-primary text-primary-foreground rounded-md px-4 py-2 text-[0.8125rem] font-semibold transition-opacity hover:opacity-90"
		>
			email me →
		</a>
		<a
			href={repoHref}
			target="_blank"
			rel="noopener noreferrer"
			class="text-muted-foreground hover:text-foreground text-[0.8125rem] transition-colors"
		>
			github ↗
		</a>
	</div>
</div>
