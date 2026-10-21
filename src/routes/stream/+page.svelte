<script lang="ts">
  import type { PageProps } from './$types';
  import Stream from '#lib/components/Stream.svelte';
  import { resolve } from '$app/paths';
  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Stream - Martin Emde</title>
  <meta
    name="description"
    content="Notes, links, projects, photos, and longer thoughts by Martin Emde."
  />
</svelte:head>

<div class="stream-page">
  <header>
    <h1>Stream</h1>
    <p>
      Notes, links, and things worth sharing. Longer writing collects on the
      <a href={resolve('/blog')}>blog</a>, and everything is in the
      <a href={resolve('/rss.xml')}>RSS feed</a>.
    </p>
  </header>
  <Stream entries={data.entries} />
</div>

<style>
  .stream-page {
    max-width: 680px;
    padding: 72px 0 64px;
  }
  header {
    margin-bottom: 40px;
  }
  h1 {
    margin: 0 0 10px;
    font-size: 2rem;
    line-height: 1.15;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--text);
  }
  header p {
    margin: 0;
    line-height: 1.7;
    color: var(--muted);
  }
  a {
    color: var(--accent);
    text-decoration: underline;
    text-decoration-color: color-mix(in oklch, var(--accent) 40%, transparent);
    text-decoration-thickness: 1px;
    text-underline-offset: 4px;
  }
  a:hover {
    text-decoration-color: currentColor;
  }
</style>
