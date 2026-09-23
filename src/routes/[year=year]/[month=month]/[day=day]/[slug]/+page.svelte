<script lang="ts">
  import type { PageData } from './$types';
  import ShareButtons from '$lib/components/ShareButtons.svelte';
  import { dayPath, formatPostDateShort, getReadingTime, postDisplayTitle } from '$lib/utils/posts';
  import { resolve } from '$app/paths';

  let { data }: { data: PageData } = $props();

  const readingTime = $derived(getReadingTime(data.metadata.permalink));
</script>

<svelte:head
  >{#if !data.metadata.published}<meta name="robots" content="noindex,nofollow" />{/if}</svelte:head
>
<article class="post h-entry">
  <a class="p-author h-card sr-only" href={resolve('/')}>Martin Emde</a>
  <a class="back" href={resolve(dayPath(data.metadata))}>
    <span class="back-path">~{dayPath(data.metadata)}/</span>{data.metadata.slug}
  </a>

  {#if data.metadata.title}<h1 class="post-title p-name">{data.metadata.title}</h1>{/if}

  <div class="meta">
    <a class="u-url" href={resolve(data.metadata.permalink)}
      ><time class="meta-date dt-published" datetime={data.metadata.date.toISOString()}
        >{formatPostDateShort(data.metadata.date)}</time
      ></a
    >
    {#if data.metadata.type === 'article'}<span class="meta-dot"></span><span class="meta-read"
        >{readingTime}</span
      >{/if}
    <span class="meta-spacer"></span>
    {#if data.metadata.tags && data.metadata.tags.length}
      <span class="meta-tag">{data.metadata.tags[0]}</span>
    {/if}
  </div>

  {#if data.metadata.image}
    <img class="post-image" src={data.metadata.image} alt={data.metadata.title} />
  {/if}

  <div class="e-content prose prose-lg max-w-none">
    <data.content />
  </div>

  <footer class="post-footer">
    <span class="share-label">Share this {data.metadata.type}</span>
    <ShareButtons
      permalink={data.metadata.permalink}
      title={postDisplayTitle(data.metadata)}
      description={data.metadata.description || data.metadata.excerpt}
    />
  </footer>
</article>

<style>
  .post {
    max-width: 680px;
    margin: 0 auto;
    padding: 48px 0 88px;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 36px;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--muted);
    text-decoration: none;
  }
  .back-path {
    color: var(--faint);
  }
  .back:hover {
    color: var(--accent);
  }
  .post-title {
    margin: 0 0 20px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 38px;
    line-height: 1.12;
    letter-spacing: -0.02em;
    text-wrap: balance;
    color: var(--text);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 36px;
    padding-bottom: 28px;
    border-bottom: 1px solid var(--border);
    font-family: var(--font-mono);
  }
  .meta-date {
    font-weight: 480;
    font-size: 12px;
    color: var(--muted);
  }
  .meta-dot {
    height: 3px;
    width: 3px;
    border-radius: 50%;
    background: var(--faint);
  }
  .meta-read {
    font-weight: 440;
    font-size: 12px;
    color: var(--faint);
  }
  .meta-spacer {
    flex: 1;
  }
  .meta-tag {
    font-weight: 460;
    font-size: 10.5px;
    letter-spacing: 0.03em;
    color: var(--accent);
    border: 1px solid color-mix(in oklch, var(--accent) 40%, var(--border));
    border-radius: 5px;
    padding: 3px 8px;
  }
  .post-image {
    width: 100%;
    max-height: 24rem;
    object-fit: cover;
    border-radius: 0.75rem;
    margin-bottom: 2rem;
    background: var(--surface);
  }
  .post-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 44px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
  }
  .share-label {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--faint);
  }
</style>
