<script lang="ts">
  import type { PageProps } from './$types';
  import Stream from '#lib/components/Stream.svelte';
  import PostBreadcrumbs from '#lib/components/PostBreadcrumbs.svelte';
  import { formatPostDay } from '#lib/utils/post-format.ts';
  let { data }: PageProps = $props();

  const day = $derived(
    formatPostDay(data.entries[0].metadata.date, data.entries[0].metadata.dateOnly)
  );
</script>

<svelte:head>
  <title>{day} - Martin Emde</title>
</svelte:head>

<div class="day-page">
  <PostBreadcrumbs post={data.entries[0].metadata} depth="day" />
  <header>
    <h1>{day}</h1>
  </header>
  <Stream entries={data.entries} showDays={false} />
</div>

<style>
  .day-page {
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
