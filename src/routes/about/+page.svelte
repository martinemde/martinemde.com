<script lang="ts">
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
</script>

<svelte:head>
  <title>About - Martin Emde</title>
  <meta name="description" content="About Martin Emde" />
</svelte:head>

<div>
  <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]} />

  <h1 class="mb-12 text-3xl font-bold">About</h1>

  <p class="text-lg text-surface-700-300">
    AI Developer Tools Engineer at
    <a href="https://gusto.com" rel="external">Gusto</a>. Founding member of
    <a href="https://gem.coop" rel="external">gem.coop</a>.
  </p>

  <div class="mt-8">
    <p class="text-lg text-surface-700-300">Find me on:</p>
    <ul class="mt-2 list-inside list-disc text-lg text-surface-700-300">
      <li>
        <a href="https://github.com/martinemde" rel="external">@martinemde on GitHub</a>
      </li>
      <li>
        <a href="https://bsky.app/profile/martinemde.com" rel="external"
          >@martinemde.com on Bluesky</a
        >
      </li>
    </ul>
  </div>
</div>
