<script lang="ts">
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
</script>

<svelte:head>
  <title>About - Martin Emde</title>
  <meta name="description" content="About Martin Emde" />
</svelte:head>

<div>
  <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]} />

  <h1 class="mb-12 text-4xl font-bold">About</h1>

  <p class="text-lg text-surface-700-300">
    Developer Productivity (Modularity) at
    <a href="https://gusto.com" rel="external" class="anchor">Gusto</a>. Founding member of
    <a href="https://gem.coop" rel="external" class="anchor">gem.coop</a>. See also:
    <a href="https://github.com/martinemde" rel="external" class="anchor">GitHub</a>.
  </p>
</div>
