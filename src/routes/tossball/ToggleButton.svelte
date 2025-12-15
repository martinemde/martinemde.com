<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children, checked, ontoggle } = $props<{
    children: Snippet;
    checked: boolean;
    ontoggle: () => void;
  }>();
</script>

<button
  onclick={ontoggle}
  class="btn flex items-center justify-start gap-3"
  class:preset-outlined-primary-500={checked}
  class:preset-outlined-surface-200-800={!checked}
>
  <input class="checkbox" type="checkbox" {checked} onchange={ontoggle} onclick={ontoggle} />
  {@render children()}
</button>
