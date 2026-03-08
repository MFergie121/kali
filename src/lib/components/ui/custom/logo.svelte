<!-- src/lib/components/Chakana.svelte -->
<script lang="ts">
  let {
    size = 32,
    color = 'currentColor',
    strokeWidth = 4.5,
    class: className = '',
  }: {
    size?: number;
    color?: string;
    strokeWidth?: number;
    class?: string;
  } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 100 100"
  fill="none"
  class={className}
  aria-label="Chakana"
  role="img"
>
  <path
    d="M 38,5 L 62,5 L 62,20 L 70,20 L 70,30 L 80,30 L 80,38 L 95,38 L 95,62 L 80,62 L 80,70 L 70,70 L 70,80 L 62,80 L 62,95 L 38,95 L 38,80 L 30,80 L 30,70 L 20,70 L 20,62 L 5,62 L 5,38 L 20,38 L 20,30 L 30,30 L 30,20 L 38,20 Z"
    stroke={color}
    stroke-width={strokeWidth}
    stroke-linejoin="miter"
    fill="none"
  />
  <circle cx="50" cy="50" r="13" stroke={color} stroke-width={strokeWidth} fill="none" />
</svg>