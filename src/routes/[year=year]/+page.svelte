<script lang="ts">
  import type { PageProps } from './$types';
  import Stream from '#lib/components/Stream.svelte';
  import PostBreadcrumbs from '#lib/components/PostBreadcrumbs.svelte';
  import { SITE_TIME_ZONE } from '#lib/utils/post-model.ts';
  let { data }: PageProps = $props();

  const year = $derived(
    data.entries[0].metadata.date.toLocaleDateString('en-US', {
      year: 'numeric',
      timeZone: SITE_TIME_ZONE
    })
  );
</script>

<svelte:head>
  <title>{year} - Martin Emde</title>
</svelte:head>

<div class="archive-page">
  <PostBreadcrumbs post={data.entries[0].metadata} depth="year" />
  <header>
    <h1>{year}</h1>
  </header>
  <Stream entries={data.entries} />
</div>

<style>
  .archive-page {
    max-width: 680px;
    padding: 48px 0 64px;
  }
  header {
    margin-bottom: 36px;
  }
  h1 {
    margin: 0;
    font-size: 2rem;
    line-height: 1.15;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--text);
  }
</style>
