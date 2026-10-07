<script lang="ts">
  import type { PageData } from './$types';
  import Stream from '#lib/components/Stream.svelte';
  import PostBreadcrumbs from '#lib/components/PostBreadcrumbs.svelte';
  import { SITE_TIME_ZONE } from '#lib/utils/post-model.ts';
  let { data }: { data: PageData } = $props();

  const month = $derived(
    data.entries[0].metadata.date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: SITE_TIME_ZONE
    })
  );
</script>

<svelte:head>
  <title>{month} - Martin Emde</title>
</svelte:head>

<div class="archive-page">
  <PostBreadcrumbs post={data.entries[0].metadata} depth="month" />
  <header>
    <h1>{month}</h1>
  </header>
  <Stream entries={data.entries} />
</div>

<style>
  .archive-page {
    max-width: 680px;
    margin: 0 auto;
    padding: 64px 0;
  }
  header {
    margin-bottom: 36px;
  }
  h1 {
    font-size: 2.5rem;
    line-height: 1.15;
    font-weight: 580;
    margin: 0 0 16px;
  }
</style>
