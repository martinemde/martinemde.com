<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    checked: boolean;
    ontoggle: () => void;
  }

  let { children, checked, ontoggle }: Props = $props();
</script>

<!-- A label, not a button: a checkbox can't be nested in another control. -->
<label
  class={[
    'btn flex items-center justify-start gap-3',
    { 'preset-outlined-primary-500': checked, 'preset-outlined-surface-200-800': !checked }
  ]}
>
  <input class="checkbox" type="checkbox" {checked} onchange={ontoggle} />
  {@render children()}
</label>
