<script lang="ts">
  import type { Component } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import type { PostMetadata } from '$lib/utils/posts';
  import StreamEntry from './StreamEntry.svelte';

  let {
    entries,
    keyboard = false
  }: {
    entries: { metadata: PostMetadata; content: Component }[];
    keyboard?: boolean;
  } = $props();
  let shortcuts = $state(false);
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
      !shortcuts ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.isComposing
    )
      return;
    const active = document.activeElement;
    if (event.key === 'Escape' && active instanceof HTMLElement && container?.contains(active)) {
      const details = active.closest('details[open]');
      if (details instanceof HTMLDetailsElement) {
        details.open = false;
        details.querySelector('summary')?.focus();
        event.preventDefault();
      }
      return;
    }
    if (event.key !== 'j' && event.key !== 'k') return;
    if (window.getSelection()?.toString()) return;
    if (
      active instanceof HTMLElement &&
      (active.isContentEditable ||
        active.closest('a, button, input, textarea, select, summary, [role="textbox"]'))
    )
      return;
    if (active !== document.body && active && !container?.contains(active)) return;
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

{#if keyboard}
  <label class="keyboard"
    ><input type="checkbox" bind:checked={shortcuts} /> Enable j/k navigation</label
  >
  {#if shortcuts}
    <div class="keyboard-help">
      <button type="button" onclick={() => container.querySelector<HTMLElement>('article')?.focus()}
        >Start keyboard navigation</button
      >
      <p>j/k moves between entries. Tab follows links. Escape closes an open article.</p>
    </div>
  {/if}
{/if}
<div class="h-feed" bind:this={container}>
  {#each groups as [day, posts] (day)}
    <section class="day" aria-label={day}>
      <h2>{day}</h2>
      {#each posts as entry (entry.metadata.slug)}<StreamEntry {...entry} />{/each}
    </section>
  {/each}
</div>

<style>
  .keyboard-help {
    margin: -16px 0 30px;
    font-size: 0.8rem;
    color: var(--muted);
  }
  .keyboard-help button {
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
    padding: 8px 0;
  }
  .keyboard {
    display: flex;
    gap: 10px;
    align-items: center;
    width: fit-content;
    font-size: 0.8rem;
    color: var(--muted);
    margin-bottom: 30px;
  }
  .day {
    margin-bottom: 40px;
  }
  h2 {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--muted);
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
  }
</style>
