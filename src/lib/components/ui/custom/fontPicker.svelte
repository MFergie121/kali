<script lang="ts">
  import * as Select from '$lib/components/ui/select/index.js';
  import { fontStore, fonts, type Font } from '$lib/font.svelte';
</script>

<Select.Root
  type="single"
  name="font"
  value={fontStore.current}
  onValueChange={(v) => fontStore.apply(v as Font)}
>
  <Select.Trigger class="w-44">
    {fonts.find((f) => f.id === fontStore.current)?.label ?? 'Font'}
  </Select.Trigger>

  <Select.Content>
    {#each fonts as font (font.id)}
      <Select.Item value={font.id} label={font.label}>
        <span style="font-family: {font.stack}">{font.label}</span>
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>