<script lang="ts">
  import type { Component } from 'svelte';
  import { resolve } from '$app/paths';
  import { postDisplayTitle, type PostMetadata } from '#lib/utils/post-model.ts';
  import { formatPostTime, postDateTime } from '#lib/utils/post-format.ts';
  import { postRouteParams } from '#lib/utils/post-routing.ts';
  import { optimizedImage } from '#lib/utils/images.ts';
  import PostBody from './PostBody.svelte';

  let {
    metadata,
    content: Content,
    level = 3
  }: {
    metadata: PostMetadata & { readingTime?: string };
    content: Component;
    level?: 2 | 3 | 4;
  } = $props();
  const image = $derived(optimizedImage(metadata.image));
  const url = $derived(
    resolve('/[year=year]/[month=month]/[day=day]/[slug]', postRouteParams(metadata))
  );
  const summary = $derived(metadata.description || metadata.excerpt);
</script>

<article
  class="stream-entry h-entry"
  id={`entry-${metadata.permalink.slice(1).replaceAll('/', '-')}`}
  tabindex="-1"
  aria-label={postDisplayTitle(metadata)}
>
  {#if metadata.title}
    <svelte:element this={`h${level}`} class="p-name">
      <a class="title u-url" href={url}>{metadata.title}</a>
    </svelte:element>
  {/if}
  <p class="meta">
    <a class="permalink u-url" href={url} aria-label={`Permalink: ${postDisplayTitle(metadata)}`}>
      <time class="dt-published" datetime={postDateTime(metadata.date, metadata.dateOnly)}>
        {formatPostTime(metadata.date, metadata.dateOnly)}
      </time>
    </a>
    {#if metadata.type === 'article' && metadata.readingTime}
      <span aria-hidden="true">·</span> {metadata.readingTime}
    {/if}
  </p>
  {#if metadata.type === 'article'}
    <!-- The summary is the excerpt itself: clicking it opens the article in place,
         after which only the chevron remains to close it. -->
    <details>
      <summary>
        <span class="p-summary">{summary}</span><span class="sr-only">{metadata.title}</span><span
          class="expand"
          aria-hidden="true"
        ></span>
      </summary>
      <div class="entry-body e-content prose max-w-none" tabindex="-1">
        {#if metadata.image}<img
            src={image?.src ?? metadata.image}
            srcset={image?.srcset}
            sizes={image?.sizes}
            width={image?.width}
            height={image?.height}
            alt=""
            loading="lazy"
            decoding="async"
          />{/if}
        <PostBody {metadata} content={Content} />
      </div>
    </details>
  {:else}
    <div class="entry-body e-content prose max-w-none">
      <PostBody {metadata} content={Content} />
    </div>
  {/if}
  <a class="p-author h-card sr-only" href={resolve('/')}>Martin Emde</a>
</article>

<style>
  .stream-entry {
    padding: 18px 0 22px;
    scroll-margin-top: 90px;
    overflow-wrap: anywhere;
  }
  .stream-entry:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 8px;
    border-radius: 2px;
  }
  .p-name {
    margin: 0 0 4px;
    font-size: 1.15rem;
    line-height: 1.4;
    font-weight: 560;
    letter-spacing: -0.01em;
  }
  .title {
    color: var(--text);
    font-weight: inherit;
    text-decoration: underline;
    text-decoration-color: color-mix(in oklch, var(--text) 25%, transparent);
    text-decoration-thickness: 1px;
    text-underline-offset: 4px;
  }
  .title:hover,
  .title:focus-visible {
    color: var(--accent);
    text-decoration-color: currentColor;
  }
  .meta {
    margin: 0 0 10px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--faint);
  }
  .permalink {
    color: inherit;
    text-decoration: none;
  }
  .permalink:hover,
  .permalink:focus-visible {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  summary {
    display: block;
    cursor: pointer;
    list-style: none;
    line-height: 1.7;
    color: var(--muted);
    border-radius: 4px;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:hover {
    color: var(--text);
  }
  summary:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
  }
  /* A chevron that points down while closed and up once the article is open. */
  .expand {
    display: inline-block;
    width: 0.45em;
    height: 0.45em;
    margin-left: 0.6em;
    border-right: 1.5px solid var(--accent);
    border-bottom: 1.5px solid var(--accent);
    transform: translateY(-0.2em) rotate(45deg);
    transition: transform 150ms;
  }
  details[open] .expand {
    transform: translateY(0.05em) rotate(-135deg);
  }
  details[open] > summary {
    width: fit-content;
    margin-bottom: 12px;
  }
  details[open] .p-summary {
    display: none;
  }
  details[open] .expand {
    margin-left: 0;
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
  @media (prefers-reduced-motion: reduce) {
    .expand {
      transition: none;
    }
  }
</style>
