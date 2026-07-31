<script lang="ts">
  import { Check } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    price?: string;
    selected?: boolean;
    onclick: () => void;
    children?: Snippet;
  }

  let { title, description, price, selected = false, onclick, children }: Props = $props();
</script>

<button
  type="button"
  {onclick}
  aria-pressed={selected}
  class="relative w-full rounded-xl border p-4 text-left transition-all {selected
    ? 'border-primary-500 bg-primary-100-900/40 ring-2 ring-primary-500'
    : 'border-surface-300-700 bg-surface-100-900/40 hover:border-surface-400-600'}"
>
  {#if selected}
    <span
      class="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-primary-contrast-500"
    >
      <Check size={13} strokeWidth={3} />
    </span>
  {/if}
  <span class="block pr-6 text-sm font-semibold text-surface-950-50">{title}</span>
  {#if price}
    <span class="mt-0.5 block text-sm font-medium text-primary-600-400 tabular-nums">{price}</span>
  {/if}
  {#if description}
    <span class="mt-1 block text-xs leading-relaxed text-surface-600-400">{description}</span>
  {/if}
  {@render children?.()}
</button>
