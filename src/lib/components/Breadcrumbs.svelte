<script lang="ts">
  import { resolve } from '$app/paths';

  interface Crumb {
    label: string;
    href?: `/${string}`;
  }

  let { crumbs }: { crumbs: Crumb[] } = $props();
</script>

<nav aria-label="Breadcrumb" class="mb-8">
  <ol class="font-mono-ui flex items-center gap-2 text-sm">
    {#each crumbs as crumb, index (index)}
      <li class="flex items-center gap-2">
        {#if index > 0}
          <span class="opacity-40 select-none">&middot;</span>
        {/if}
        {#if crumb.href}
          <a href={resolve(crumb.href)} class="nav-link lowercase">{crumb.label}</a>
        {:else}
          <span class="text-surface-600-400">{crumb.label}</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
