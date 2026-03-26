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

  <h1 class="preset-typo-headline mb-12">Blog</h1>

  <div class="space-y-10">
    {#each data.posts as post (post.slug)}
      <article>
        <div class="meta-editorial mb-1 text-surface-500">
          {formatPostDate(post.date)}
        </div>
        <h2 class="mb-2 text-xl font-bold">
          <a href={resolve(`/blog/${post.slug}`)} class="anchor">
            {post.title}
          </a>
        </h2>
        {#if post.description}
          <p class="text-surface-600-400">{post.description}</p>
        {/if}
      </article>
    {/each}
  </div>
</div>
