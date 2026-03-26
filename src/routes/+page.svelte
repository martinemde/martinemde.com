<script lang="ts">
  import type { PageData } from './$types';
  import { formatPostDate } from '$lib/utils/posts';
  import { resolve } from '$app/paths';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Martin Emde</title>
  <meta name="description" content="Software Engineer, Enthusiast of Things" />
</svelte:head>

<div>
  <!-- Hero/About Section -->
  <section class="mb-16">
    <p class="text-lg text-surface-600-400">
      AI Developer Tools Engineer at
      <a href="https://gusto.com" rel="external" class="anchor">Gusto</a>. Founding member of
      <a href="https://gem.coop" rel="external" class="anchor">gem.coop</a>. See also:
      <a href="https://github.com/martinemde" rel="external" class="anchor">GitHub</a>.
    </p>
  </section>

  <!-- Latest Posts Section -->
  <section>
    <h2 class="mb-10 font-serif text-2xl font-bold lg:text-4xl">Latest</h2>
    <div class="space-y-10">
      {#each data.recentPosts as post (post.slug)}
        <article>
          <div class="meta-editorial mb-1 text-surface-500">
            {formatPostDate(post.date)}
          </div>
          <h3 class="mb-2 font-serif text-xl font-bold">
            <a
              href={resolve(`/blog/${post.slug}`)}
              class="text-surface-950-50 transition-colors hover:text-primary-500"
            >
              {post.title}
            </a>
          </h3>
          {#if post.description}
            <p class="text-surface-600-400">{post.description}</p>
          {/if}
        </article>
      {/each}
    </div>
  </section>
</div>
