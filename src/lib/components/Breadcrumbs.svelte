<script lang="ts">
  import { resolve } from '$app/paths';

  interface Crumb {
    label: string;
    href?: `/${string}`;
  }

  let { crumbs }: { crumbs: Crumb[] } = $props();
</script>

<nav aria-label="Breadcrumb" class="mb-8">
  <ol class="flex items-center gap-1 text-sm" style="font-family: var(--font-mono);">
    {#each crumbs as crumb, index (index)}
      <li class="flex items-center gap-1">
        {#if index > 0}
          <span class="text-surface-400 select-none" aria-hidden="true">&gt;</span>
        {/if}
        {#if crumb.href}
          <a href={resolve(crumb.href)} class="anchor text-primary-500">{crumb.label}</a>
        {:else}
          <span class="text-surface-600-400">{crumb.label}</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
