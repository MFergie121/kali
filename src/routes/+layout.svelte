<script lang="ts">
  import { ModeWatcher } from 'mode-watcher';
  import { Toaster } from 'svelte-sonner';
  import type { Snippet } from 'svelte';
  import '../app.css';

  let { children }: { children: Snippet } = $props();
</script>

<ModeWatcher />
<Toaster richColors={false} closeButton position="top-right" />
{@render children()}