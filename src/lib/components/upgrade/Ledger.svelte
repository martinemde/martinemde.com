<script lang="ts">
  import type { Snippet } from 'svelte';
  import Columns from './Columns.svelte';
  import {
    CATEGORIES,
    CHARGE_NOTES,
    money,
    type Beat,
    type Biller,
    type Category,
    type Scenario
  } from '$lib/apple-upgrade/model';

  interface Props {
    /** One column per way of paying. Four is what fits across a phone. */
    scenarios: Scenario[];
    /** Months worth stopping on, keyed by month. */
    beats: Map<number, Beat>;
    /** Questions that only make sense once you have got there, keyed by month. */
    questions?: Record<number, Snippet>;
  }

  let { scenarios, beats, questions = {} }: Props = $props();

  let basis = $state<'cash' | 'npv'>('cash');
  let activeMonth = $state(0);
  let stuck = $state(false);
  /** Plot height in px, shared with the per-month bar pieces so they agree. */
  let chartPx = $state(260);

  let blockEls: HTMLElement[] = [];
  let sentinel: HTMLElement;
  let panelWrap: HTMLElement;
  let panelPx = $state(0);
  /** Height of the site's own sticky header, which the panel has to clear. */
  let headerPx = $state(57);

  const horizon = $derived(scenarios[0].rows.length - 1);
  const columns = $derived(scenarios.length);
  const months = $derived(Array.from({ length: horizon + 1 }, (_, i) => i));

  /**
   * One scale for the whole scroll: the tallest column at the horizon, plus a
   * little headroom so the winner does not butt into its own total.
   */
  const ceiling = $derived(
    Math.max(
      ...scenarios.map((s) => {
        const last = s.rows[s.rows.length - 1];
        return basis === 'npv' ? last.runningNpv : last.runningCash;
      }),
      1
    ) * 1.06
  );

  /**
   * A charge, described once and then attributed to whichever columns pay it.
   * Grouping by label is what lets a month read as "here is the bill, and here
   * is who gets handed it" rather than as four unrelated ledgers.
   */
  interface Charge {
    label: string;
    biller: Biller;
    category: Category;
    note?: string;
    paid: { key: string; name: string; amount: number }[];
    /** Set when every paying column pays the same, which is the common case. */
    uniform: number | null;
  }

  /** The month each label first shows up, so its explanation is shown once. */
  const firstSeen = $derived.by(() => {
    const seen: Record<string, number> = {};
    for (let m = 0; m <= horizon; m++) {
      for (const s of scenarios) {
        for (const item of s.rows[m].items) {
          seen[item.label] ??= m;
        }
      }
    }
    return seen;
  });

  function chargesFor(month: number): Charge[] {
    const byLabel: Record<string, Charge> = {};
    for (const s of scenarios) {
      for (const item of s.rows[month].items) {
        const charge = (byLabel[item.label] ??= {
          label: item.label,
          biller: item.biller,
          category: item.category,
          note: firstSeen[item.label] === month ? CHARGE_NOTES[item.label] : undefined,
          paid: [],
          uniform: null
        });
        charge.paid.push({ key: s.key, name: s.shortName, amount: item.amount });
      }
    }
    const charges = Object.values(byLabel);
    for (const charge of charges) {
      const first = charge.paid[0].amount;
      charge.uniform = charge.paid.every((p) => Math.abs(p.amount - first) < 0.005) ? first : null;
    }
    // Biggest bill first: on the months that matter, the headline is the balloon.
    return charges.sort(
      (a, b) => Math.max(...b.paid.map((p) => p.amount)) - Math.max(...a.paid.map((p) => p.amount))
    );
  }

  /** The footer: what each column owes this month, and the slice it contributes. */
  function cellsFor(month: number) {
    return scenarios.map((s) => {
      const row = s.rows[month];
      const net = basis === 'npv' ? row.runningNpv - (s.rows[month - 1]?.runningNpv ?? 0) : row.net;
      // Everything in a month discounts by the same factor, so scaling the
      // nominal slices by it discounts them exactly.
      const scale = net > 0 && row.net > 0 ? net / row.net : 1;
      return {
        key: s.key,
        name: s.shortName,
        net,
        // Same category order as the bar, so a slice lands on its own band.
        slices: CATEGORIES.map((category) => ({
          category,
          amount:
            row.items
              .filter((i) => i.category === category)
              .reduce((sum, i) => sum + (i.amount - (i.reward ?? 0)), 0) * scale
        })).filter((slice) => slice.amount > 0.005)
      };
    });
  }

  /**
   * The footer slices are scaled within their own month — the tallest of the
   * four fills the track. Day one is forty times a monthly payment, so one
   * scale across all 48 months would render every ordinary month as a
   * hairline. Absolute size is what the printed number is for; the slices
   * answer "who got hit hardest this month", and the colours and the column
   * they sit under say which band they are about to join.
   */
  const TRACK_PX = 34; // Keep in step with `.track`'s height below.
  function piecePx(amount: number, peak: number): number {
    if (peak <= 0) return 0;
    return Math.max(2, (amount / peak) * TRACK_PX);
  }

  /**
   * The lease column's running commentary on having no phone. It is an aside
   * rather than a replacement for the charges, because the other three columns
   * are usually still billing you through those months.
   */
  function idleLine(month: number): string | undefined {
    for (const s of scenarios) {
      const note = s.rows[month].idleNote;
      if (note) return note;
    }
    return undefined;
  }

  const readLine = $derived(headerPx + (panelPx || chartPx + 96) + 20);

  /**
   * What the phone itself costs if you just buy it — the cash column's own
   * equity total, so tax, trade-in and card rewards are all already in it. It
   * gives the empty top of the plot a meaning: a column that has climbed past
   * this line has spent more than the phone was ever worth buying.
   */
  const reference = $derived.by(() => {
    const outright = scenarios.find((s) => s.key === 'outright');
    if (!outright) return undefined;
    const last = outright.rows[outright.rows.length - 1];
    const split = basis === 'npv' ? last.runningNpvByCategory : last.runningByCategory;
    return split.phone > 0 ? { value: split.phone, label: 'the phone, in cash' } : undefined;
  });

  // Measurement only: the site header is sticky and wraps to two lines on a
  // phone, and the plot height has to be a number rather than a viewport unit
  // so the per-month slices below can be drawn against the same scale.
  $effect(() => {
    const measure = () => {
      const header = document.querySelector('header');
      if (header) headerPx = Math.round(header.getBoundingClientRect().height);
      const narrow = window.innerWidth <= 560;
      chartPx = Math.round(
        Math.max(
          narrow ? 150 : 168,
          Math.min(narrow ? 230 : 290, window.innerHeight * (narrow ? 0.3 : 0.32))
        )
      );
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  });

  $effect(() => {
    if (!panelWrap) return;
    const sizer = new ResizeObserver(([entry]) => (panelPx = entry.contentRect.height));
    sizer.observe(panelWrap);
    return () => sizer.disconnect();
  });

  // Has the panel latched to the top yet? Only used to lift it off the text.
  $effect(() => {
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => (stuck = !entry.isIntersecting), {
      rootMargin: `-${headerPx + 1}px 0px 0px 0px`
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  });

  /**
   * The month sitting just under the panel is the one being read. Straight
   * scroll maths rather than an observer band: 49 blocks, no gaps between
   * them, and it never flickers between two.
   */
  $effect(() => {
    const line = readLine;
    let queued = false;
    const sync = () => {
      queued = false;
      let found = 0;
      for (let m = 0; m <= horizon; m++) {
        const el = blockEls[m];
        if (el && el.getBoundingClientRect().top <= line) found = m;
        else break;
      }
      activeMonth = found;
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(sync);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    sync();
    return () => window.removeEventListener('scroll', onScroll);
  });
</script>

<div class="ledger" style="--sticky-top: {headerPx}px; --columns: {columns}">
  <div class="sentinel" bind:this={sentinel} aria-hidden="true"></div>

  <div class="panel-wrap" bind:this={panelWrap}>
    <Columns
      {scenarios}
      month={activeMonth}
      {ceiling}
      {reference}
      bind:basis
      height={chartPx}
      {stuck}
    />
  </div>

  {#each months as month (month)}
    {@const beat = beats.get(month)}
    {@const charges = chargesFor(month)}
    {@const cells = cellsFor(month)}
    {@const idle = idleLine(month)}
    {@const peak = Math.max(...cells.map((c) => c.net), 0)}
    <section
      bind:this={blockEls[month]}
      data-month={month}
      class="month"
      class:on={month === activeMonth}
      class:landed={month <= activeMonth}
      class:beat={!!beat}
      class:quiet={charges.length === 0}
    >
      <header>
        <span class="mnum">{String(month).padStart(2, '0')}</span>
        {#if beat}
          <h3>{beat.title}</h3>
        {:else}
          <span class="rule"></span>
          <span class="year">year {Math.floor((month + 11) / 12) || 1}</span>
        {/if}
      </header>

      {#if beat}
        <p class="story">{beat.detail}</p>
      {/if}

      {#if charges.length}
        <ul class="charges">
          {#each charges as charge (charge.label)}
            <li data-cat={charge.category}>
              <span class="head">
                <i class="swatch" aria-hidden="true"></i>
                <span class="what">{charge.label}</span>
                {#if charge.uniform !== null}
                  <span class="amount">{money(charge.uniform)}</span>
                {/if}
                <span class="biller">{charge.biller}</span>
              </span>
              <span class="who">
                {#each charge.paid as who (who.key)}
                  <i class="chip"
                    >{who.name}{#if charge.uniform === null}<b>{money(who.amount)}</b>{/if}</i
                  >
                {/each}
              </span>
              {#if charge.note}
                <span class="note">{charge.note}</span>
              {/if}
            </li>
          {/each}
        </ul>
      {:else if !idle}
        <p class="nothing">Nothing due anywhere. The phone just gets a year older.</p>
      {/if}

      {#if idle}
        <p class="nothing">{idle}</p>
      {/if}

      <div class="foot">
        {#each cells as cell (cell.key)}
          <div class="cell" class:zero={cell.net <= 0.005}>
            <span class="amt">{cell.net > 0.005 ? money(cell.net) : '—'}</span>
            <span class="track">
              <span class="piece">
                {#each cell.slices as slice (slice.category)}
                  <i data-cat={slice.category} style="height: {piecePx(slice.amount, peak)}px"></i>
                {/each}
              </span>
            </span>
          </div>
        {/each}
      </div>
    </section>

    {#if questions[month]}
      <div class="question">{@render questions[month]()}</div>
    {/if}
  {/each}
</div>

<style>
  .ledger {
    position: relative;
    /* Four bars spread across a 1000px panel stop reading as a bar chart, and
       the month copy wants a measure anyway. */
    max-width: 760px;
    --gutter: 15px;
    --col-gap: 8px;
    /* Mirrors the panel's bar width so a month's slice sits at the same width,
       under the same column centre, as the band it feeds. */
    --bar-w: 104px;
  }
  .sentinel {
    height: 1px;
  }

  .panel-wrap {
    position: sticky;
    top: var(--sticky-top, 57px);
    z-index: 4;
    margin-bottom: 20px;
    background: var(--bg);
    padding: 8px 0;
  }

  /* One month */
  .month {
    display: grid;
    gap: 8px;
    border-top: 1px solid color-mix(in oklch, var(--border) 45%, transparent);
    padding: 10px 0 8px;
  }
  .month.beat {
    border-top-color: var(--border);
    padding-top: 22px;
  }
  .month.quiet:not(.beat) {
    opacity: 0.6;
  }
  /* The month being read. Tint plus an inset edge — nothing that changes the
     box's width, so the ledger never widens the page. */
  .month.on {
    border-radius: 6px;
    background: color-mix(in oklch, var(--accent) 6%, transparent);
    box-shadow: inset 2px 0 0 color-mix(in oklch, var(--accent) 45%, transparent);
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .mnum {
    flex: none;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 11.5px;
    letter-spacing: 0.06em;
    color: var(--faint);
    font-variant-numeric: tabular-nums;
  }
  .month.on .mnum,
  .month.beat .mnum {
    color: var(--accent);
  }
  header h3 {
    margin: 0;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 19px;
    line-height: 1.25;
    letter-spacing: -0.02em;
    text-wrap: balance;
  }
  .rule {
    flex: 1;
    height: 1px;
    background: color-mix(in oklch, var(--border) 60%, transparent);
  }
  .year {
    flex: none;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.05em;
    color: var(--faint);
    text-transform: uppercase;
  }

  .story {
    margin: 0;
    max-width: 60ch;
    font-size: 14.5px;
    line-height: 1.65;
    color: var(--muted);
    text-wrap: pretty;
  }

  /* What arrived, described once, then attributed */
  .charges {
    display: grid;
    gap: 7px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .charges li {
    display: grid;
    gap: 3px;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 3px 8px;
  }
  .swatch {
    height: 9px;
    width: 9px;
    flex: none;
    align-self: center;
    border-radius: 2px;
    background: var(--fill);
  }
  /* Not `.label` — that is a global form class that forces a full-width block. */
  .what {
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: -0.005em;
  }
  .amount {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 13.5px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .biller {
    border-radius: 4px;
    background: color-mix(in oklch, var(--border) 55%, transparent);
    padding: 1px 5px;
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.04em;
    color: var(--muted);
    text-transform: uppercase;
  }
  .who {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 6px;
  }
  .chip {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    border: 1px solid color-mix(in oklch, var(--fill) 40%, transparent);
    border-radius: 999px;
    background: color-mix(in oklch, var(--fill) 10%, transparent);
    padding: 1px 8px;
    font-family: var(--font-mono);
    font-style: normal;
    font-size: 10px;
    letter-spacing: 0.02em;
    color: var(--muted);
  }
  .chip b {
    font-weight: 500;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .note {
    max-width: 58ch;
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--faint);
    text-wrap: pretty;
  }
  .nothing {
    margin: 0;
    max-width: 58ch;
    font-size: 13px;
    font-style: italic;
    line-height: 1.55;
    color: var(--faint);
    text-wrap: pretty;
  }

  /* Column-aligned totals, on the chart's grid, with the slice that joins it */
  .foot {
    display: grid;
    grid-template-columns: repeat(var(--columns, 4), minmax(0, 1fr));
    align-items: end;
    /* Matches the sticky panel's border + padding and its column gap, so a
       month's slice sits directly under the bar it is about to join. */
    gap: var(--col-gap);
    border-top: 1px dashed color-mix(in oklch, var(--border) 60%, transparent);
    padding: 6px var(--gutter) 0;
  }
  .cell {
    display: grid;
    justify-items: center;
    gap: 3px;
    min-width: 0;
  }
  .amt {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 11px;
    letter-spacing: -0.01em;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .cell.zero .amt {
    color: var(--faint);
    font-weight: 400;
  }
  /* A faint full-height well, so a short slice reads as a small share of the
     month rather than as a stray line. */
  .track {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: 100%;
    height: 34px;
    border-bottom: 1px solid color-mix(in oklch, var(--border) 70%, transparent);
    background: linear-gradient(
      to top,
      color-mix(in oklch, var(--border) 24%, transparent),
      transparent 70%
    );
  }
  .piece {
    position: relative;
    display: flex;
    flex-direction: column-reverse;
    gap: 1px;
    width: 100%;
    max-width: var(--bar-w);
  }
  .piece i {
    display: block;
    border-radius: 1px;
    background: var(--fill);
    opacity: 0.4;
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
  }
  .piece i:last-child {
    border-radius: 3px 3px 1px 1px;
  }

  /* Landed: the slice has been counted into the bars above. It brightens and
     nudges upward, and a hairline runs off the top toward the panel. */
  .month.landed .piece i {
    opacity: 1;
  }
  .month.landed .piece::after {
    position: absolute;
    bottom: 100%;
    left: 50%;
    width: 1px;
    background: linear-gradient(to top, var(--accent), transparent);
    content: '';
    animation: lift 0.5s cubic-bezier(0.3, 0, 0.2, 1) 1;
  }
  @keyframes lift {
    from {
      height: 0;
      opacity: 0.85;
    }
    to {
      height: 46px;
      opacity: 0;
    }
  }

  .question {
    margin: 22px 0 26px;
  }

  /* Category fills, named once in Columns.svelte and mirrored here. */
  .ledger {
    --cat-phone: light-dark(#1289e7, #1795fa);
    --cat-rent: light-dark(#882e9b, #a264b0);
    --cat-care: light-dark(#2b9667, #4f9f77);
    --cat-fees: light-dark(#9a3c00, #e86518);
  }
  [data-cat='phone'] {
    --fill: var(--cat-phone);
  }
  [data-cat='rent'] {
    --fill: var(--cat-rent);
  }
  [data-cat='care'] {
    --fill: var(--cat-care);
  }
  [data-cat='fees'] {
    --fill: var(--cat-fees);
  }

  @media (max-width: 560px) {
    .panel-wrap {
      margin-bottom: 14px;
      padding: 6px 0;
    }
    .month {
      gap: 7px;
    }
    header h3 {
      font-size: 16.5px;
    }
    .story {
      font-size: 13.5px;
    }
    .what,
    .amount {
      font-size: 13px;
    }
    .ledger {
      --gutter: 11px;
      --col-gap: 6px;
      --bar-w: 100%;
    }
    .amt {
      font-size: 10px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .piece i {
      transition: none;
    }
    .month.landed .piece::after {
      animation: none;
      content: none;
    }
  }
</style>
