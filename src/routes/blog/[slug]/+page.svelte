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

  <header class="mt-4 mb-12">
    {#if data.metadata.title}
      <h1 class="mb-6 font-serif text-3xl leading-tight font-extrabold tracking-tight lg:text-5xl">
        {data.metadata.title}
      </h1>
    {/if}
    <div class="meta-editorial text-surface-500">
      <span>{formatPostDate(data.metadata.date)}</span>
      <span class="mx-2">&middot;</span>
      <span>{readingTime}</span>
    </div>
  </header>

  {#if data.metadata.image}
    <img
      class="mb-12 max-h-96 w-full rounded object-cover"
      src={data.metadata.image}
      alt={data.metadata.title}
    />
  {/if}

  <div class="prose prose-lg max-w-none dark:prose-invert">
    <data.content />
  </div>

  <footer class="mt-16 flex items-center gap-4 border-t border-surface-200-800 pt-6">
    <span class="meta-editorial text-surface-500">Share</span>
    <ShareButtons
      slug={data.metadata.slug}
      title={data.metadata.title}
      description={data.metadata.description}
    />
  </footer>
</article>
