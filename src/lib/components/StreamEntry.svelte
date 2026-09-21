<script lang="ts">
  import type { Component } from 'svelte';
  import { resolve } from '$app/paths';
  import { postDisplayTitle, type PostMetadata } from '$lib/utils/posts';

  let { metadata, content: Content }: { metadata: PostMetadata; content: Component } = $props();
  const url = $derived(resolve(`/blog/${metadata.slug}`));
</script>

<article
  class="stream-entry h-entry"
  class:article-preview={metadata.type === 'article'}
  id={`entry-${metadata.slug}`}
  tabindex="-1"
  aria-label={postDisplayTitle(metadata)}
>
  {#if metadata.type === 'article'}
    <div class="unfurl">
      <span class="kind">Writing</span>
      <h3 class="p-name"><a class="u-url" href={url}>{metadata.title}</a></h3>
      {#if metadata.description || metadata.excerpt}
        <p class="p-summary">{metadata.description || metadata.excerpt}</p>
      {/if}
      <details>
        <summary>Read here<span class="sr-only">: {metadata.title}</span></summary>
        <div class="entry-body e-content prose max-w-none" tabindex="-1">
          {#if metadata.image}<img src={metadata.image} alt="" />{/if}
          <Content />
        </div>
      </details>
    </div>
  {:else}
    {#if metadata.bookmarkOf}
      <div class="kind">Bookmarked · {new URL(metadata.bookmarkOf).hostname}</div>
    {/if}
    {#if metadata.title}<h3 class="p-name">{metadata.title}</h3>{/if}
    <div class="entry-body e-content prose max-w-none"><Content /></div>
  {/if}
  <a class="permalink u-url" href={url} aria-label={`Permalink: ${postDisplayTitle(metadata)}`}>
    <time
      class="dt-published"
      datetime={metadata.dateOnly
        ? metadata.date.toISOString().slice(0, 10)
        : metadata.date.toISOString()}
    >
      {metadata.dateOnly
        ? metadata.date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'America/Los_Angeles'
          })
        : metadata.date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'America/Los_Angeles'
          })}
    </time>
  </a>
  <a class="p-author h-card sr-only" href={resolve('/')}>Martin Emde</a>
</article>

<style>
  .stream-entry {
    padding: 22px 0;
    scroll-margin-top: 90px;
    overflow-wrap: anywhere;
  }
  .stream-entry:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 8px;
  }
  .stream-entry + :global(.stream-entry) {
    border-top: 1px solid var(--border);
  }
  .unfurl {
    border-left: 3px solid var(--accent);
    padding: 4px 0 4px 22px;
  }
  h3 {
    font-size: 1.3rem;
    line-height: 1.35;
    margin: 0 0 12px;
    font-weight: 560;
  }
  h3 a {
    color: var(--text);
    text-decoration: none;
  }
  h3 a:hover {
    text-decoration: underline;
  }
  .kind,
  .permalink {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--muted);
  }
  .kind {
    margin-bottom: 8px;
  }
  .permalink {
    display: inline-block;
    margin-top: 12px;
    text-underline-offset: 3px;
  }
  .p-summary {
    margin: 0 0 12px;
    line-height: 1.7;
    color: var(--muted);
  }
  summary {
    cursor: pointer;
    color: var(--accent);
    width: fit-content;
    padding: 6px 0;
  }
  details[open] > summary {
    margin-bottom: 18px;
  }
  .entry-body {
    font-size: 1rem;
    line-height: 1.75;
  }
  .entry-body :global(> :first-child) {
    margin-top: 0;
  }
  .entry-body :global(> :last-child) {
    margin-bottom: 0;
  }
  .entry-body :global(img) {
    max-width: 100%;
    max-height: 32rem;
    object-fit: contain;
    object-position: left;
    height: auto;
  }
  .entry-body :global(blockquote) {
    border-left: 2px solid var(--border);
    padding-left: 20px;
    font-style: normal;
    color: var(--muted);
  }
</style>
