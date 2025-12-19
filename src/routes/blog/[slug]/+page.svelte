<script lang="ts">
  import type { PageData } from './$types';
  import ShareButtons from '$lib/components/ShareButtons.svelte';
  import { formatPostDate } from '$lib/utils/posts';

  let { data }: { data: PageData } = $props();
</script>

<article>
  <header class="mb-8 border-b border-surface-200-800 pb-8">
    {#if data.metadata.title}
      <h1 class="preset-typo-title mb-4">{data.metadata.title}</h1>
    {/if}
    <div class="text-sm text-surface-600-400">
      <div class="flex items-center justify-between gap-4">
        {#if data.metadata.date}
          {formatPostDate(data.metadata.date)}
        {/if}
        <ShareButtons
          slug={data.metadata.slug}
          title={data.metadata.title}
          description={data.metadata.description}
        />
      </div>
    </div>
  </header>

  <div class="prose prose-lg max-w-none dark:prose-invert">
    <data.content />
  </div>

  <footer class="mt-12 flex items-center gap-4 pt-6">
    <span class="text-sm text-surface-600-400">Share this article:</span>
    <ShareButtons
      slug={data.metadata.slug}
      title={data.metadata.title}
      description={data.metadata.description}
    />
  </footer>
</article>
