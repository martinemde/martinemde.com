<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import type { Component } from 'svelte';
  import { resolve } from '$app/paths';
  import type { PostMetadata } from '#lib/utils/post-model.ts';
  import { postRouteParams } from '#lib/utils/post-routing.ts';
  import { formatPostDay } from '#lib/utils/post-format.ts';
  import StreamEntry from './StreamEntry.svelte';

  let {
    entries,
    showDays = true,
    level = 2
  }: {
    entries: { metadata: PostMetadata & { readingTime?: string }; content: Component }[];
    showDays?: boolean;
    /** Heading level of the day headings; entry titles sit one level below them. */
    level?: 2 | 3;
  } = $props();
  const entryLevel = $derived(showDays ? (level === 2 ? 3 : 4) : level);
  let container: HTMLElement;
  const groups = $derived.by(() => {
    const result = new SvelteMap<string, typeof entries>();
    for (const entry of entries) {
      const day = formatPostDay(entry.metadata.date, entry.metadata.dateOnly);
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
      {#if showDays}
        <svelte:element this={`h${level}`} class="day-heading">
          <a
            href={resolve(
              '/[year=year]/[month=month]/[day=day]',
              postRouteParams(posts[0].metadata)
            )}>{day}</a
          >
        </svelte:element>
      {/if}
      {#each posts as entry (entry.metadata.permalink)}
        <StreamEntry {...entry} level={entryLevel} />
      {/each}
    </section>
  {/each}
</div>

<style>
  .day + .day {
    margin-top: 28px;
  }
  .day-heading {
    margin: 0;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--muted);
  }
  .day-heading a {
    color: inherit;
    text-decoration: none;
  }
  .day-heading a:hover,
  .day-heading a:focus-visible {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
