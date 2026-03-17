<script lang="ts">
  import * as Select from '$lib/components/ui/select/index.js';
  import { themeStore, themes, type Theme } from '$lib/theme.svelte';
  import { syncPref } from '$lib/sync-prefs';
</script>

<Select.Root
  type="single"
  name="theme"
  value={themeStore.current}
  onValueChange={(v) => { themeStore.apply(v as Theme); syncPref({ theme: v }); }}
>
  <Select.Trigger class="w-44">
    {themes.find((t) => t.id === themeStore.current)?.label ?? 'Theme'}
  </Select.Trigger>

  <Select.Content>
    {#each themes as theme (theme.id)}
      <Select.Item value={theme.id} label={theme.label}>
        {theme.label}
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>