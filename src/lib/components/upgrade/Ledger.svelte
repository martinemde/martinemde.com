<script lang="ts">
  import type { Snippet } from 'svelte';
  import Columns from './Columns.svelte';
  import {
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
    /**
     * Last month to render. A question the reader has not answered yet stops
     * the ledger dead rather than letting them scroll past it, because the
     * months below it depend on the answer.
     */
    limit?: number;
    /** -1 before the first month crosses the reading line. */
    activeMonth?: number;
  }

  let { scenarios, beats, questions = {}, limit, activeMonth = $bindable(-1) }: Props = $props();

  let basis = $state<'cash' | 'npv'>('cash');
  let stuck = $state(false);
  /** Plot height in px, shared with the per-month bar pieces so they agree. */
  let chartPx = $state(190);

  let blockEls: HTMLElement[] = [];
  let sentinel: HTMLElement;
  let panelWrap: HTMLElement;
  let panelPx = $state(0);
  /** Height of the site's own sticky header, which the panel has to clear. */
  let headerPx = $state(57);

  const horizon = $derived(scenarios[0].rows.length - 1);
  const columns = $derived(scenarios.length);
  const lastMonth = $derived(Math.min(limit ?? horizon, horizon));
  const months = $derived(Array.from({ length: lastMonth + 1 }, (_, i) => i));

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
   * A charge, described once and then drawn across the columns that get handed
   * it. The bar in each column is the attribution and the amount at the same
   * time: four little rectangles means everybody pays it, one means only that
   * column does, and the heights say how much.
   */
  interface Charge {
    label: string;
    billers: Biller[];
    category: Category;
    /** One entry per column, in column order. Zero where that column is spared. */
    amounts: number[];
    /** Money coming back rather than going out: drawn below the line, outlined. */
    credit?: boolean;
  }

  function chargesFor(month: number): Charge[] {
    const byLabel: Record<string, Charge> = {};
    scenarios.forEach((s, column) => {
      for (const item of s.rows[month].items) {
        if (item.category === 'tax') continue;
        const charge = (byLabel[item.label] ??= {
          label: item.label,
          billers: [],
          category: item.category,
          credit: item.amount < 0,
          amounts: scenarios.map(() => 0)
        });
        if (!charge.billers.includes(item.biller)) charge.billers.push(item.biller);
        charge.amounts[column] += Math.abs(item.amount);
      }
    });
    // Biggest bill first: on the months that matter, the headline is the balloon.
    const charges = Object.values(byLabel).sort(
      (a, b) => Math.max(...b.amounts) - Math.max(...a.amounts)
    );

    // Store credit for trade-in value a path had no room for. It arrives at
    // pickup and it is money in, so it hangs below the line in outline.
    if (month === 0) {
      const back = scenarios.map((s) => s.summary.tradeInRefund);
      if (back.some((amount) => amount > 0.005)) {
        charges.push({
          label: 'Apple credit back for excess trade-in',
          billers: ['apple'],
          category: 'phone',
          credit: true,
          amounts: back
        });
      }
    }

    return charges;
  }

  /**
   * Bars are scaled within their own month — the biggest single charge that
   * month fills the track, and every other bar in the month is drawn against
   * it. Day one is forty times a monthly payment, so one scale across all 48
   * months would render every ordinary month as a hairline. Absolute size is
   * what the printed number is for; the bars answer "who pays this, and how
   * does it compare to the rest of this month".
   */
  /**
   * What each column actually costs this month, once card rewards are netted —
   * and, on day one, once the store credit a path could not use is netted too,
   * so the month lines up with what the panel above it is drawing.
   */
  function cellsFor(month: number) {
    return scenarios.map((s) => {
      const row = s.rows[month];
      const out = basis === 'npv' ? row.runningNpv - (s.rows[month - 1]?.runningNpv ?? 0) : row.net;
      const net = month === 0 ? out - s.summary.tradeInRefund : out;
      const tax = row.items.reduce(
        (sum, item) => sum + (item.category === 'tax' ? item.amount : 0),
        0
      );
      return { key: s.key, name: s.shortName, net, tax };
    });
  }

  const TRACK_PX = 26; // Keep in step with `.track`'s height below.
  function barPx(amount: number, peak: number): number {
    if (peak <= 0 || amount <= 0.005) return 0;
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
   * device total plus its separately displayed tax, net of trade-in and rewards. It
   * gives the empty top of the plot a meaning: a column that has climbed past
   * this line has spent more than the phone was ever worth buying.
   */
  const reference = $derived.by(() => {
    const outright = scenarios.find((s) => s.key === 'outright');
    if (!outright) return undefined;
    const last = outright.rows[0];
    const split = basis === 'npv' ? last.runningNpvByCategory : last.runningByCategory;
    const tax = outright.rows[0].items.find((item) => item.label === 'Sales tax, up front');
    const value = split.phone + (tax ? tax.amount - (tax.reward ?? 0) : 0);
    return value > 0 ? { value, label: 'the phone, in cash' } : undefined;
  });

  // Measurement only: the site header is sticky and wraps to two lines on a
  // phone, and the plot height has to be a number rather than a viewport unit
  // so the per-month slices below can be drawn against the same scale.
  $effect(() => {
    const measure = () => {
      const header = document.querySelector('header');
      if (header) headerPx = Math.round(header.getBoundingClientRect().height);
      const narrow = window.innerWidth <= 560;
      // A quarter of the screen. The panel is a running tally, not the page.
      chartPx = Math.round(Math.max(112, Math.min(narrow ? 176 : 210, window.innerHeight * 0.25)));
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
      let found = -1;
      for (let m = 0; m <= lastMonth; m++) {
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
    {@const peak = Math.max(0, ...charges.flatMap((c) => c.amounts))}
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

      {#if charges.length}
        <ul class="charges">
          {#each charges as charge (charge.label)}
            <li>
              <span class="head">
                <span class="what">{charge.label}</span>
                <span class="biller">{charge.billers.join(' / ')}</span>
              </span>

              <!-- The attribution and the amount in one mark: a bar in every
                   column that gets handed this charge, sized against the
                   biggest single bill of the month. -->
              <div class="bars" class:credit={charge.credit} data-cat={charge.category}>
                {#each charge.amounts as amount, i (cells[i].key)}
                  <span class="cell" class:zero={amount <= 0.005}>
                    <span class="track">
                      <i
                        class="bar"
                        style="height: {barPx(amount, peak)}px"
                        title={amount > 0.005
                          ? `${cells[i].name}: ${money(amount)}`
                          : `${cells[i].name}: nothing`}
                      ></i>
                    </span>
                    <span class="amt">{amount > 0.005 ? money(amount) : ''}</span>
                  </span>
                {/each}
              </div>
            </li>
          {/each}
        </ul>

        <div class="totals">
          {#each cells as cell (cell.key)}
            <span class="sum" class:zero={Math.abs(cell.net) <= 0.005} class:back={cell.net < 0}>
              {Math.abs(cell.net) > 0.005 ? money(cell.net) : '—'}
              {#if cell.tax > 0.005}
                <small class="tax-total">incl. {money(cell.tax)} tax</small>
              {/if}
            </span>
          {/each}
        </div>
      {:else if !idle}
        <p class="nothing">Nothing due anywhere. The phone just gets a year older.</p>
      {/if}

      {#if idle}
        <p class="nothing">{idle}</p>
      {/if}
      {#each scenarios as scenario (scenario.key)}
        {#if scenario.rows[month].forfeitedCredits}
          <p class="nothing">
            {scenario.shortName}: {money(scenario.rows[month].forfeitedCredits!)} in trade-in credits
            forfeited
          </p>
        {/if}
      {/each}
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
  /* The month being read. A tint only: an inset edge sat on top of the month
     number, and anything with width would widen the page. */
  .month.on {
    border-radius: 6px;
    background: color-mix(in oklch, var(--accent) 7%, transparent);
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

  /* What arrived, described once, then drawn across the columns that pay it */
  .charges {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .charges li {
    display: grid;
    gap: 4px;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 3px 8px;
    padding: 0 var(--gutter);
  }
  /* Not `.label` — a global form class owns that name. */
  .what {
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: -0.005em;
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

  /*
   * One row of columns per charge, on the sticky panel's grid. Four bars means
   * everybody is billed for it; one means only that column is. Height is the
   * amount, against the biggest single charge of the month.
   */
  .bars,
  .totals {
    display: grid;
    grid-template-columns: repeat(var(--columns, 4), minmax(0, 1fr));
    gap: var(--col-gap);
    padding: 0 var(--gutter);
  }
  .cell {
    display: grid;
    justify-items: center;
    gap: 2px;
    min-width: 0;
  }
  .track {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: 100%;
    height: 26px;
    border-bottom: 1px solid color-mix(in oklch, var(--border) 65%, transparent);
  }
  .bar {
    position: relative;
    display: block;
    width: 100%;
    max-width: var(--bar-w);
    border-radius: 3px 3px 0 0;
    background: var(--fill);
    opacity: 0.38;
    transition: opacity 0.3s ease;
  }
  .amt {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 10.5px;
    letter-spacing: -0.01em;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  /* No bar and no number: being spared a charge is shown by the empty column,
     and the baseline keeps it aligned with the ones that were not. */
  .cell.zero .amt {
    min-height: 1em;
  }

  /* The month's own line: what each column owes once rewards are netted. */
  .totals {
    border-top: 1px dashed color-mix(in oklch, var(--border) 60%, transparent);
    padding-top: 5px;
    margin-top: 2px;
  }
  .sum {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 11.5px;
    text-align: center;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .tax-total {
    display: block;
    margin-top: 3px;
    font-size: 9px;
    font-weight: 400;
    color: var(--cat-tax);
  }
  .sum.zero {
    color: var(--faint);
    font-weight: 400;
  }
  /* Day one can end with money in your pocket, if the trade-in was big enough. */
  .sum.back {
    color: var(--cat-phone);
  }

  /* Landed: the month has been counted into the bars above. Its charges come
     up to full strength and a hairline runs off the top toward the panel. */
  .month.landed .bar {
    opacity: 1;
  }
  .month.landed .charges li:first-child .bar::after {
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
      height: 40px;
      opacity: 0;
    }
  }

  .nothing {
    margin: 0;
    padding: 0 var(--gutter);
    max-width: 58ch;
    font-size: 13px;
    font-style: italic;
    line-height: 1.55;
    color: var(--faint);
    text-wrap: pretty;
  }

  /*
   * A credit row is the same grid upside down: the baseline moves to the top
   * of the track and the bar hangs below it, outlined rather than filled,
   * because this is money coming back.
   */
  .bars.credit .track {
    align-items: flex-start;
    border-top: 1px solid color-mix(in oklch, var(--border) 65%, transparent);
    border-bottom: 0;
  }
  .bars.credit .bar {
    border: 1.5px solid var(--fill);
    border-top: 0;
    border-radius: 0 0 3px 3px;
    background: none;
  }
  /* Nothing to draw: a zero-height outline still shows its collapsed sides. */
  .cell.zero .bar {
    border: 0;
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

  .cell {
    display: grid;
    justify-items: center;
    gap: 2px;
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
    --cat-care: light-dark(#53616d, #b3c4d2);
    --cat-tax: light-dark(#2b9667, #4f9f77);
    --cat-fees: light-dark(#9a3c00, #e86518);
    --cat-repair: light-dark(#665d16, #d8c86b);
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
  [data-cat='repair'] {
    --fill: repeating-linear-gradient(
      135deg,
      var(--cat-repair) 0 4px,
      color-mix(in oklch, var(--cat-repair) 65%, var(--surface)) 4px 6px
    );
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
    .what,
    .ledger {
      --gutter: 11px;
      --col-gap: 6px;
      --bar-w: 62px;
    }
    .amt {
      font-size: 10px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
  }
</style>
