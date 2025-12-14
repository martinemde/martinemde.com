<script lang="ts">
  import type { PageData } from './$types';
  import { formatPostDate } from '$lib/utils/posts';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Martin Emde</title>
  <meta name="description" content="Technical blog posts about software engineering" />
</svelte:head>

<div>
  <h1 class="mb-12 text-4xl font-bold">Blog</h1>

  <div class="space-y-12">
    {#each data.posts as post (post.slug)}
      <article class="border-b border-surface-200-800 pb-12">
        <h2 class="mb-2 text-2xl font-semibold">
          <a href="/blog/{post.slug}" class="anchor">
            {post.title}
          </a>
        </h2>
        <div class="mb-4 text-sm text-surface-600-400">
          {formatPostDate(post.date)}
        </div>
        {#if post.description}
          <p class="text-surface-700-300">{post.description}</p>
        {/if}
      </article>
    {/each}
  </div>
</div>
