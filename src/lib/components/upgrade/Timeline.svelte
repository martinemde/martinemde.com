<script lang="ts">
  import type { Snippet } from 'svelte';
  import { money, money0, type Scenario } from '$lib/apple-upgrade/model';

  interface Props {
    scenario: Scenario;
    /** Paying cash, priced off the same inputs, for the running comparison. */
    baseline: Scenario;
    /** Month to slot the end-of-term decision card into. */
    decisionAt: number;
    decision: Snippet;
  }

  let { scenario, baseline, decisionAt, decision }: Props = $props();

  let activeMonth = $state(0);
  let rowEls: HTMLElement[] = [];

  const active = $derived(scenario.rows[activeMonth] ?? scenario.rows[0]);
  const activeBaseline = $derived(baseline.rows[activeMonth] ?? baseline.rows[0]);

  /** How far the two running NPVs have diverged, as a 0-1 bar fill. */
  const ceiling = $derived(
    Math.max(
      scenario.rows[scenario.rows.length - 1].runningNpv,
      baseline.rows[baseline.rows.length - 1].runningNpv,
      1
    )
  );

  $effect(() => {
    // Only the row crossing the middle of the viewport counts as active.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeMonth = Number((entry.target as HTMLElement).dataset.month);
          }
        }
      },
      { rootMargin: '-48% 0px -48% 0px' }
    );
    for (const el of rowEls) if (el) observer.observe(el);
    return () => observer.disconnect();
  });
</script>

<div class="wrap">
  <aside class="rail">
    <div class="rail-inner">
      <div class="rail-month">
        Month <strong>{String(activeMonth).padStart(2, '0')}</strong>
      </div>

      <div class="stat">
        <span class="k">Paid to date</span>
        <span class="v">{money0(active.runningCash)}</span>
      </div>

      <div class="stat lead">
        <span class="k">In today&rsquo;s dollars</span>
        <span class="v">{money0(active.runningNpv)}</span>
        <span class="bar"
          ><i style="width: {Math.min(100, (active.runningNpv / ceiling) * 100)}%"></i></span
        >
      </div>

      <div class="stat">
        <span class="k">If you&rsquo;d paid cash</span>
        <span class="v muted">{money0(activeBaseline.runningNpv)}</span>
        <span class="bar"
          ><i
            class="alt"
            style="width: {Math.min(100, (activeBaseline.runningNpv / ceiling) * 100)}%"
          ></i></span
        >
      </div>

      <div class="stat">
        <span class="k">Buy it outright</span>
        <span class="v">
          {#if active.owns}
            <span class="muted">you own it</span>
          {:else if active.buyout === null}
            <span class="muted">returned</span>
          {:else}
            {money0(active.buyout)}
          {/if}
        </span>
      </div>
    </div>
  </aside>

  <div class="months">
    <div class="cols" aria-hidden="true">
      <span>Month</span>
      <span>What happens</span>
      <span class="r">You pay</span>
      <span class="r">Today&rsquo;s $</span>
      <span class="r">Buyout</span>
    </div>

    {#each scenario.rows as row (row.month)}
      <div
        bind:this={rowEls[row.month]}
        data-month={row.month}
        class="row"
        class:on={row.month === activeMonth}
        class:idle={row.outflow === 0 && row.month > 0}
        class:gone={!row.hasPhone}
      >
        <span class="m">{String(row.month).padStart(2, '0')}</span>

        <span class="what">
          {#if row.month === 0}
            <em>Pick it up.</em>
          {/if}
          {#each row.items as item (item.label)}
            <span class="item">{item.label}<i class="biller">{item.biller}</i></span>
          {/each}
          {#if row.items.length === 0 && row.month > 0}
            <span class="item quiet">{row.hasPhone ? 'Nothing due' : 'No phone'}</span>
          {/if}
        </span>

        <span class="n pay">{row.outflow > 0 ? money(row.outflow) : '—'}</span>
        <span class="n">{money0(row.runningNpv)}</span>
        <span class="n buy">{row.buyout === null ? '—' : money0(row.buyout)}</span>

        {#if row.note}
          <span class="note">{row.note}</span>
        {/if}
      </div>

      {#if row.month === decisionAt}
        <div class="decision">{@render decision()}</div>
      {/if}
    {/each}

    <div class="totals">
      <span class="m"></span>
      <span class="what"><strong>36 months in</strong></span>
      <span class="n pay">{money0(scenario.summary.cash)}</span>
      <span class="n lead">{money0(scenario.summary.npv)}</span>
      <span class="n"></span>
    </div>
  </div>
</div>

<style>
  .wrap {
    display: grid;
    grid-template-columns: 1fr 224px;
    align-items: start;
    gap: 34px;
  }

  /* Rail */
  .rail {
    position: sticky;
    top: 88px;
    order: 2;
  }
  .rail-inner {
    display: flex;
    flex-direction: column;
    gap: 15px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
    padding: 16px;
  }
  .rail-month {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 11.5px;
    letter-spacing: 0.05em;
    color: var(--faint);
  }
  .rail-month strong {
    color: var(--accent);
    font-weight: 560;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .k {
    font-size: 11.5px;
    color: var(--muted);
  }
  .v {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 20px;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .stat.lead .v {
    color: var(--accent);
  }
  .v .muted,
  .v.muted {
    font-size: 15px;
    color: var(--faint);
  }
  .bar {
    margin-top: 5px;
    display: block;
    height: 3px;
    border-radius: 2px;
    background: color-mix(in oklch, var(--border) 70%, transparent);
  }
  .bar i {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: var(--accent);
    transition: width 0.25s ease;
  }
  .bar i.alt {
    background: var(--accent2);
  }

  /* Months */
  .months {
    order: 1;
    min-width: 0;
  }

  .cols,
  .row,
  .totals {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) 88px 78px 74px;
    align-items: baseline;
    gap: 10px;
  }

  .cols {
    position: sticky;
    top: 57px;
    z-index: 2;
    border-bottom: 1px solid var(--border);
    background: color-mix(in oklch, var(--bg) 92%, transparent);
    backdrop-filter: blur(6px);
    padding: 9px 4px;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 10.5px;
    letter-spacing: 0.05em;
    color: var(--faint);
    text-transform: uppercase;
  }
  .cols .r {
    text-align: right;
  }

  .row {
    border-bottom: 1px solid color-mix(in oklch, var(--border) 45%, transparent);
    padding: 9px 4px;
    transition: background 0.15s ease;
  }
  .row.on {
    background: color-mix(in oklch, var(--accent) 7%, transparent);
  }
  .row.idle {
    opacity: 0.5;
  }
  .row.gone .what {
    text-decoration: line-through;
    text-decoration-color: var(--faint);
  }

  .m {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--faint);
    font-variant-numeric: tabular-nums;
  }
  .row.on .m {
    color: var(--accent);
  }

  .what {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    font-size: 13.5px;
    line-height: 1.5;
  }
  .what em {
    font-style: normal;
    color: var(--muted);
  }
  .item {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
  }
  .item.quiet {
    color: var(--faint);
  }
  .biller {
    border-radius: 4px;
    background: color-mix(in oklch, var(--border) 55%, transparent);
    padding: 1px 5px;
    font-family: var(--font-mono);
    font-style: normal;
    font-size: 9.5px;
    letter-spacing: 0.04em;
    color: var(--muted);
    text-transform: uppercase;
  }

  .n {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: var(--muted);
  }
  .n.pay {
    color: var(--text);
    font-weight: 500;
  }
  .n.buy {
    color: var(--accent2);
  }
  .n.lead {
    color: var(--accent);
    font-weight: 560;
    font-size: 14px;
  }

  .note {
    grid-column: 2 / -1;
    padding-top: 4px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--accent);
    text-wrap: pretty;
  }

  .decision {
    margin: 26px 0;
  }

  .totals {
    border-top: 1px solid var(--border);
    padding: 14px 4px;
    font-size: 13.5px;
  }

  @media (max-width: 900px) {
    .wrap {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .rail {
      order: 0;
      top: 57px;
      z-index: 3;
      margin-bottom: 18px;
      background: var(--bg);
      padding: 8px 0;
    }
    .rail-inner {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px 20px;
    }
    .rail-month {
      flex-basis: 100%;
    }
    .stat {
      flex: 1;
      min-width: 90px;
    }
    .v {
      font-size: 16px;
    }
    .bar {
      display: none;
    }

    .cols,
    .row,
    .totals {
      grid-template-columns: 28px minmax(0, 1fr) 76px 68px;
    }
    .cols span:last-child,
    .n.buy {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bar i,
    .row {
      transition: none;
    }
  }
</style>
