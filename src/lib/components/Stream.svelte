<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import type { Component } from 'svelte';
  import type { PostMetadata } from '$lib/utils/posts';
  import StreamEntry from './StreamEntry.svelte';

  let { entries }: { entries: { metadata: PostMetadata; content: Component }[] } = $props();
  let container: HTMLElement;
  const groups = $derived.by(() => {
    const result = new SvelteMap<string, typeof entries>();
    for (const entry of entries) {
      const day = entry.metadata.date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/Los_Angeles'
      });
      result.set(day, [...(result.get(day) ?? []), entry]);
    }
    return [...result];
  });

  function navigate(event: KeyboardEvent) {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.isComposing
    )
      return;
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !container?.contains(active)) return;
    if (window.getSelection()?.toString()) return;
    if (
      active.isContentEditable ||
      active.closest(
        'button, input, textarea, select, [contenteditable], [role="textbox"], [role="slider"], [role="combobox"]'
      )
    )
      return;
    const entry = active.closest<HTMLElement>('article.stream-entry');
    if (!entry) return;
    const details = entry.querySelector('details');
    if (event.key === 'h' || event.key === 'Escape') {
      if (details?.open) {
        event.preventDefault();
        details.open = false;
        entry.focus();
      }
      return;
    }
    if (event.key === 'l' || (event.key === 'Enter' && active === entry)) {
      if (details) {
        event.preventDefault();
        details.open = true;
        details.querySelector<HTMLElement>('.entry-body')?.focus();
      }
      return;
    }
    if (event.key !== 'j' && event.key !== 'k') return;
    const items = [...container.querySelectorAll<HTMLElement>('article.stream-entry')];
    const current = items.findIndex((item) => item === active || item.contains(active));
    const next =
      current < 0
        ? event.key === 'j'
          ? 0
          : items.length - 1
        : Math.max(0, Math.min(items.length - 1, current + (event.key === 'j' ? 1 : -1)));
    if (items[next]) {
      event.preventDefault();
      items[next].focus();
    }
  }
</script>

<svelte:window onkeydown={navigate} />

<div class="h-feed" bind:this={container}>
  {#each groups as [day, posts] (day)}
    <section class="day" aria-label={day}>
      <h2>{day}</h2>
      {#each posts as entry (entry.metadata.slug)}
        <StreamEntry {...entry} />
      {/each}
    </section>
  {/each}
</div>

<style>
  .day {
    margin-bottom: 40px;
  }
  h2 {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--muted);
    padding-bottom: 12px;
  }
</style>
