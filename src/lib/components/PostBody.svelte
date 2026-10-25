<script lang="ts">
  import type { Component } from 'svelte';
  import type { PostMetadata } from '#lib/utils/post-model.ts';
  import { optimizedImage } from '#lib/utils/images.ts';

  // The publisher keeps photos and the bookmarked URL as Micropub properties;
  // the body is only the written content. Render them around it, as the
  // Markdown views do (publishedMarkdown in post-model.ts).
  let {
    metadata,
    content: Content
  }: {
    metadata: Pick<PostMetadata, 'leadPhotos' | 'bookmarkLink' | 'bookmarkOf'>;
    content: Component;
  } = $props();
</script>

{#each metadata.leadPhotos as photo (photo.value)}
  {@const image = optimizedImage(photo.value)}
  <p>
    <img
      class="u-photo"
      src={image?.src ?? photo.value}
      srcset={image?.srcset}
      sizes={image?.sizes}
      width={image?.width}
      height={image?.height}
      alt={photo.alt}
      loading="lazy"
      decoding="async"
    />
  </p>
{/each}
<Content />
{#if metadata.bookmarkLink}
  <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- an external URL -->
  <p><a class="u-bookmark-of" href={metadata.bookmarkLink}>{metadata.bookmarkLink}</a></p>
{:else if metadata.bookmarkOf}
  <!-- The body already links the bookmark; this carries it for microformats. -->
  <data class="u-bookmark-of" value={metadata.bookmarkOf}></data>
{/if}
