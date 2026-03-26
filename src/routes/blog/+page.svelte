<script lang="ts">
  import type { PageData } from './$types';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { formatPostDate } from '$lib/utils/posts';
  import { resolve } from '$app/paths';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Martin Emde</title>
  <meta name="description" content="Technical blog posts about software engineering" />
</svelte:head>

<div>
  <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Blog' }]} />

  <h1 class="preset-typo-display-1 mb-12">Blog Posts</h1>

  <div class="space-y-12">
    {#each data.posts as post (post.slug)}
      <article class="border-b border-surface-200-800 pb-12">
        <h2 class="preset-typo-title mb-2">
          <a href={resolve(`/blog/${post.slug}`)} class="anchor">
            {post.title}
          </a>
        </h2>
        <div class="shell-prompt mb-4 text-surface-600-400">
          {formatPostDate(post.date)}
        </div>
        {#if post.description}
          <p class="text-surface-700-300">{post.description}</p>
        {/if}
      </article>
    {/each}
  </div>
</div>
