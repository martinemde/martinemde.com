<script lang="ts">
  import type { PageData } from './$types';
  import Stream from '$lib/components/Stream.svelte';
  import { resolve } from '$app/paths';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Stream - Martin Emde</title>
  <meta name="description" content="Notes, links, photos, and longer thoughts by Martin Emde." />
</svelte:head>

<div class="stream-page">
  <header>
    <h1>Stream</h1>
    <p>Notes, links, and things worth sharing.</p>
    <p>
      <a href={resolve('/blog')}>Longer writing</a> ·
      <a href={resolve('/rss.xml')}>Subscribe via RSS</a>
    </p>
  </header>
  <Stream entries={data.entries} keyboard />
</div>

<style>
  .stream-page {
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
