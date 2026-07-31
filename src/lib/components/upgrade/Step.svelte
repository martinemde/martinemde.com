<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    n: number;
    title: string;
    lede?: string;
    /** Locked steps collapse to a dimmed stub so you can see what's coming. */
    locked?: boolean;
    /** One-line recap of the choice, shown next to the title once answered. */
    answer?: string;
    children: Snippet;
  }

  let { n, title, lede, locked = false, answer, children }: Props = $props();
</script>

<section class="step" class:locked aria-current={locked ? undefined : 'step'}>
  <div class="head">
    <span class="num">{String(n).padStart(2, '0')}</span>
    <h2>{title}</h2>
    {#if answer && !locked}
      <span class="answer">{answer}</span>
    {/if}
  </div>

  {#if !locked}
    <div class="body">
      {#if lede}<p class="lede">{lede}</p>{/if}
      {@render children()}
    </div>
  {/if}
</section>

<style>
  .step {
    border-top: 1px solid var(--border);
    padding: 44px 0 8px;
  }
  .step.locked {
    padding: 22px 0;
    opacity: 0.34;
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 14px;
  }
  .num {
    font-family: var(--font-mono);
    font-weight: 480;
    font-size: 11.5px;
    letter-spacing: 0.08em;
    color: var(--accent);
  }
  h2 {
    margin: 0;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 25px;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }
  .locked h2 {
    font-size: 17px;
    font-weight: 500;
  }
  .answer {
    margin-left: auto;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--muted);
  }

  .body {
    padding-top: 14px;
  }
  .lede {
    margin: 0 0 22px;
    max-width: 62ch;
    font-size: 16px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }

  @media (max-width: 640px) {
    h2 {
      font-size: 21px;
    }
    .answer {
      margin-left: 0;
      flex-basis: 100%;
    }
  }
</style>
