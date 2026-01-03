<script lang="ts">
  import { ChevronRight } from 'lucide-svelte';

  interface Crumb {
    label: string;
    href?: string;
  }

  let { crumbs }: { crumbs: Crumb[] } = $props();
</script>

<nav aria-label="Breadcrumb" class="mb-8">
  <ol class="flex items-center gap-2 text-sm">
    {#each crumbs as crumb, index}
      <li class="flex items-center gap-2">
        {#if index > 0}
          <ChevronRight class="h-4 w-4 text-surface-600-400" />
        {/if}
        {#if crumb.href}
          <a href={crumb.href} class="anchor text-primary-500">{crumb.label}</a>
        {:else}
          <span class="text-surface-600-400">{crumb.label}</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
