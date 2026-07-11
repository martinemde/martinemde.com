<script lang="ts">
  import type { PageData } from './$types';
  import { formatPostDateShort, getReadingTime } from '$lib/utils/posts';
  import { resolve } from '$app/paths';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Blog - Martin Emde</title>
  <meta name="description" content="Technical blog posts about software engineering" />
</svelte:head>

<section class="head">
  <div class="eyebrow">// {data.posts.length} posts</div>
  <h1 class="page-title">Blog</h1>
  <p class="page-lede">
    Notes on Ruby, packaging, developer tooling, and building with AI on the command line.
  </p>
</section>

<section class="list-wrap">
  <div class="post-list">
    {#each data.posts as post (post.slug)}
      <a class="post-row" href={resolve(`/blog/${post.slug}`)}>
        <div class="post-meta">
          <span class="post-date">{formatPostDateShort(post.date)}</span>
          <span class="post-read">{getReadingTime(post.slug)}</span>
        </div>
        <div>
          <div class="post-title">{post.title}</div>
          {#if post.description}
            <div class="post-desc">{post.description}</div>
          {/if}
          {#if post.tags && post.tags.length}
            <div class="tags">
              {#each post.tags as tag (tag)}
                <span class="tag">{tag}</span>
              {/each}
            </div>
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
    padding: 80px 0 40px;
  }
  .page-title {
    margin: 0 0 16px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 46px;
    line-height: 1.05;
    letter-spacing: -0.025em;
  }
  .eyebrow {
    margin-bottom: 18px;
    font-size: 12px;
  }
  .page-lede {
    margin: 0;
    max-width: 560px;
    font-size: 17px;
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
    padding: 26px 6px;
  }
  .post-row:hover {
    background: color-mix(in oklch, var(--surface) 50%, transparent);
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
    margin-bottom: 9px;
    font-family: var(--font-body);
    font-weight: 560;
    font-size: 22px;
    line-height: 1.25;
    letter-spacing: -0.015em;
    color: var(--text);
  }
  .post-desc {
    max-width: 600px;
    margin-bottom: 13px;
    font-size: 15px;
    line-height: 1.65;
    color: var(--muted);
    text-wrap: pretty;
  }
  .tags {
    display: flex;
    gap: 7px;
  }
  .tag {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 10.5px;
    letter-spacing: 0.03em;
    color: var(--faint);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 3px 8px;
  }

  @media (max-width: 640px) {
    .head {
      padding-top: 56px;
    }
    .page-title {
      font-size: 38px;
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
