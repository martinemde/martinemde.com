<script lang="ts">
  import type { PageData } from './$types';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import ShareButtons from '$lib/components/ShareButtons.svelte';
  import { formatPostDate, getReadingTime } from '$lib/utils/posts';

  let { data }: { data: PageData } = $props();

  const readingTime = $derived(getReadingTime(data.metadata.slug));
</script>

<article>
  <Breadcrumbs crumbs={[{ label: 'Blog', href: '/blog' }, { label: data.metadata.title }]} />

  <header class="mb-8 border-b border-surface-200-800 pb-8">
    {#if data.metadata.title}
      <h1 class="preset-typo-title mb-4">{data.metadata.title}</h1>
    {/if}
    <div class="text-surface-600-400">
      <div class="flex items-center justify-between gap-4">
        <span class="shell-prompt"
          >posted {formatPostDate(data.metadata.date)} &middot; {readingTime}</span
        >
      </div>
    </div>
  </header>

  {#if data.metadata.image}
    <img
      class="mb-8 max-h-96 w-full rounded-container bg-surface-500 object-cover"
      src={data.metadata.image}
      alt={data.metadata.title}
    />
  {/if}

  <div class="prose prose-lg max-w-none dark:prose-invert">
    <data.content />
  </div>

  <div class="mt-12 border-t border-surface-200-800 pt-6">
    <div class="flex items-center justify-between">
      <span
        class="cursor-blink text-surface-500"
        style="font-family: var(--font-mono); font-size: 0.9rem;">:wq</span
      >
      <div class="flex items-center gap-4">
        <span class="text-sm text-surface-600-400">Share this article:</span>
        <ShareButtons
          slug={data.metadata.slug}
          title={data.metadata.title}
          description={data.metadata.description}
        />
      </div>
    </div>
  </div>
</article>
