<script lang="ts">
  import type { PageData } from './$types';
  import { formatPostDate } from '$lib/utils/posts';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Martin Emde</title>
  <meta name="description" content="Software Engineer Consultant, RubyGems Maintainer" />
</svelte:head>

<div>
  <!-- Hero/About Section -->
  <section class="mb-12">
    <p class="text-lg text-surface-700-300">
      Developer Productivity (Modularity) at
      <a href="https://gusto.com" rel="external" class="anchor">Gusto</a>. Founding member of
      <a href="https://gem.coop" rel="external" class="anchor">gem.coop</a>. See also:
      <a href="https://github.com/martinemde" rel="external" class="anchor">GitHub</a>.
    </p>
  </section>

  <!-- Latest Posts Section -->
  <section>
    <h2 class="mb-8 text-3xl font-bold">Latest Updates</h2>
    <div class="space-y-12">
      {#each data.recentPosts as post (post.slug)}
        <article class="border-b border-surface-200-800 pb-12">
          <h3 class="mb-2 text-2xl font-semibold">
            <a href="/blog/{post.slug}" class="anchor">
              {post.title}
            </a>
          </h3>
          <div class="mb-4 text-sm text-surface-600-400">
            {formatPostDate(post.date)}
          </div>
          {#if post.description}
            <p class="text-surface-700-300">{post.description}</p>
          {/if}
        </article>
      {/each}
    </div>
  </section>
</div>
