<script lang="ts">
  import type { PageProps } from './$types';
  import { formatPostDateShort } from '#lib/utils/post-format.ts';
  import { resolve } from '$app/paths';
  import { postRouteParams } from '#lib/utils/post-routing.ts';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Blog - Martin Emde</title>
  <meta name="description" content="Technical blog posts about software engineering" />
</svelte:head>

<section class="head">
  <h1 class="page-title">Blog</h1>
  <p class="page-lede">
    Notes on the intersection between developer tooling, AI, and a life spent telling computers what
    to do.
  </p>
</section>

<section class="list-wrap">
  <div class="post-list">
    {#each data.posts as post (post.permalink)}
      <a
        class="post-row"
        href={resolve('/[year=year]/[month=month]/[day=day]/[slug]', postRouteParams(post))}
      >
        <div class="post-meta">
          <span class="post-date">{formatPostDateShort(post.date, post.dateOnly)}</span>
          <span class="post-read">{post.readingTime}</span>
        </div>
        <div>
          <div class="post-title">{post.title}</div>
          {#if post.description}
            <div class="post-desc">{post.description}</div>
          {/if}
          {#if post.tags && post.tags.length}
            <div class="tags">{post.tags.join(' · ')}</div>
          {/if}
        </div>
      </a>
    {/each}
  </div>
</section>

<style>
  a {
    color: inherit;
    text-decoration: none;
  }

  .head {
    padding: 72px 0 40px;
  }
  .page-title {
    margin: 0 0 10px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 2rem;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: var(--text);
  }
  .page-lede {
    margin: 0;
    max-width: 560px;
    font-size: 1rem;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }

  .list-wrap {
    padding-bottom: 88px;
  }
  .post-list {
    display: flex;
    flex-direction: column;
  }
  .post-row {
    display: grid;
    grid-template-columns: 130px 1fr;
    gap: 24px;
    align-items: start;
    border-top: 1px solid var(--border);
    padding: 22px 0;
  }
  .post-row:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
  }
  .post-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 4px;
    font-family: var(--font-mono);
  }
  .post-date {
    font-weight: 480;
    font-size: 12px;
    color: var(--muted);
  }
  .post-read {
    font-weight: 440;
    font-size: 11px;
    color: var(--faint);
  }
  .post-title {
    margin-bottom: 6px;
    font-family: var(--font-body);
    font-weight: 560;
    font-size: 1.15rem;
    line-height: 1.4;
    letter-spacing: -0.01em;
    color: var(--text);
    text-decoration: underline;
    text-decoration-color: color-mix(in oklch, var(--text) 25%, transparent);
    text-decoration-thickness: 1px;
    text-underline-offset: 4px;
  }
  .post-row:hover .post-title,
  .post-row:focus-visible .post-title {
    color: var(--accent);
    text-decoration-color: currentColor;
  }
  .post-desc {
    max-width: 600px;
    margin-bottom: 8px;
    font-size: 0.95rem;
    line-height: 1.65;
    color: var(--muted);
    text-wrap: pretty;
  }
  .tags {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--faint);
  }

  @media (max-width: 640px) {
    .head {
      padding-top: 48px;
    }
    .page-title {
      font-size: 1.75rem;
    }
    .post-row {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .post-meta {
      flex-direction: row;
      gap: 12px;
    }
  }
</style>
