<script lang="ts">
  import { fontStore } from '$lib/font.svelte';
  import { themeStore } from '$lib/theme.svelte';
  import { ModeWatcher } from 'mode-watcher';
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import '../app.css';

  onMount(() => {
    themeStore.init();
    fontStore.init();
  });
</script>

<ModeWatcher />
<Toaster richColors={false} closeButton position="top-right" />
<slot />