<script lang="ts">
  import type { PageData } from './$types';
  import Stream from '$lib/components/Stream.svelte';
  import { resolve } from '$app/paths';
  import { SITE_TIME_ZONE } from '$lib/utils/post-model';
  let { data }: { data: PageData } = $props();

  const day = $derived(
    data.entries[0].metadata.date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: SITE_TIME_ZONE
    })
  );
</script>

<svelte:head>
  <title>{day} - Martin Emde</title>
</svelte:head>

<div class="day-page">
  <header>
    <h1>{day}</h1>
    <p><a href={resolve('/stream')}>Everything in the stream</a></p>
  </header>
  <Stream entries={data.entries} showDays={false} />
</div>

<style>
  .day-page {
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
  header p {
    color: var(--muted);
    margin: 12px 0;
  }
  a {
    color: var(--accent);
    text-underline-offset: 3px;
  }
</style>
