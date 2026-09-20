<script lang="ts">
  import type { Snippet } from 'svelte';
  import Columns from './Columns.svelte';
  import {
    ADJUSTMENTS_LABEL,
    PAID_OFF_IDEAS,
    ledgerAmounts
  } from '$lib/apple-upgrade/presentation';
  import { money, type Beat, type Category, type Scenario } from '$lib/apple-upgrade/model';

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

  let basis = $state<'cash' | 'npv'>('npv');
  let stuck = $state(false);
  let expanded = $state<Record<number, boolean>>({});
  /** Plot height in px, shared with the per-month bar pieces so they agree. */
  let chartPx = $state(112);

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
   * A charge, described once and then drawn across the columns that get handed
   * it. The bar in each column is the attribution and the amount at the same
   * time: four little rectangles means everybody pays it, one means only that
   * column does, and the heights say how much.
   */
  interface Charge {
    label: string;
    category: Category;
    /** One entry per column, in column order. Zero where that column is spared. */
    amounts: number[];
    categories: Category[];
    /** Money coming back rather than going out: drawn below the line, outlined. */
    credit?: boolean;
  }

  function chargesFor(month: number): Charge[] {
    const byLabel: Record<string, Charge> = {};
    scenarios.forEach((s, column) => {
      for (const item of s.rows[month].items) {
        if (item.category === 'tax' || item.category === 'fees') continue;
        const label = [
          'Installment',
          'Device installment',
          'Lease payment',
          'New lease payment',
          'Month-to-month payment'
        ].includes(item.label)
          ? 'Monthly payment'
          : item.label;
        const charge = (byLabel[label] ??= {
          label,
          category: item.category,
          credit: item.amount < 0,
          categories: scenarios.map(() => item.category),
          amounts: scenarios.map(() => 0)
        });
        charge.amounts[column] += Math.abs(item.amount);
        charge.categories[column] = item.category;
      }
      const adjustments = (byLabel[ADJUSTMENTS_LABEL] ??= {
        label: ADJUSTMENTS_LABEL,
        category: 'fees',
        categories: scenarios.map(() => 'fees'),
        amounts: scenarios.map(() => 0)
      });
      adjustments.amounts[column] = ledgerAmounts(s.rows[month], s.rows[month - 1], basis).fees;
    });
    // Biggest bill first: on the months that matter, the headline is the balloon.
    const charges = Object.values(byLabel)
      .filter((charge) => charge.amounts.some((amount) => Math.abs(amount) > 0.005))
      .sort((a, b) => Math.max(...b.amounts.map(Math.abs)) - Math.max(...a.amounts.map(Math.abs)));

    // Store credit for trade-in value a path had no room for. It arrives at
    // pickup and it is money in, so it hangs below the line in outline.
    if (month === 0) {
      const back = scenarios.map((s) => s.summary.tradeInRefund);
      if (back.some((amount) => Math.abs(amount) > 0.005)) {
        charges.push({
          label: 'Apple credit back for excess trade-in',
          category: 'phone',
          credit: true,
          amounts: back,
          categories: scenarios.map(() => 'phone')
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
      return { key: s.key, name: s.shortName, net };
    });
  }

  const TRACK_PX = 16;
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

  const paidOffMonths = $derived(
    months.filter((month) => chargesFor(month).length === 0 && !idleLine(month))
  );

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
      // Leave room below the running tally to read the monthly charges.
      chartPx = Math.round(Math.max(88, Math.min(narrow ? 112 : 140, window.innerHeight * 0.16)));
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
   * scroll maths rather than an observer band: follow each card's top edge
   * so the small gaps between months don't interrupt the running tally.
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
    <Columns {scenarios} month={activeMonth} {reference} bind:basis height={chartPx} {stuck} />
  </div>

  {#each months as month (month)}
    {@const beat = beats.get(month)}
    {@const charges = chargesFor(month)}
    {@const cells = cellsFor(month)}
    {@const idle = idleLine(month)}
    {@const peak = Math.max(0, ...charges.flatMap((c) => c.amounts.map(Math.abs)))}
    {@const stacks = cells.map((_, i) =>
      charges.map((charge) => ({
        label: charge.label,
        category: charge.categories[i],
        amount: charge.credit ? -charge.amounts[i] : charge.amounts[i]
      }))
    )}
    {@const positive = stacks.map((stack) =>
      stack.reduce((sum, item) => sum + Math.max(0, item.amount), 0)
    )}
    {@const negative = stacks.map((stack) =>
      stack.reduce((sum, item) => sum + Math.max(0, -item.amount), 0)
    )}
    {@const stackScale = Math.max(...positive, ...negative, 1)}
    <div
      role="button"
      tabindex="0"
      aria-label={`Month ${month}: ${expanded[month] ? 'hide' : 'show'} breakdown`}
      aria-expanded={!!expanded[month]}
      onclick={() => (expanded[month] = !expanded[month])}
      onkeydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          expanded[month] = !expanded[month];
        }
      }}
      bind:this={blockEls[month]}
      data-month={month}
      class="month"
      class:expanded={!!expanded[month]}
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
      <div class="stacked" aria-hidden="true">
        {#each stacks as stack, i (cells[i].key)}
          <div class="stack-column">
            <div
              class="stack-positive"
              style={`height: ${(Math.max(...positive) / stackScale) * 64}px`}
            >
              {#each stack.filter((item) => item.amount > 0.005) as item (item.label)}
                <i
                  class="segment"
                  data-cat={item.category}
                  style={`height: ${(item.amount / stackScale) * 64}px`}
                ></i>
              {/each}
            </div>
            <div
              class="stack-negative"
              style={`height: ${(Math.max(...negative) / stackScale) * 64}px`}
            >
              {#each stack.filter((item) => item.amount < -0.005) as item (item.label)}
                <i
                  class="segment credit"
                  data-cat={item.category}
                  style={`height: ${(-item.amount / stackScale) * 64}px`}
                ></i>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      <div class="breakdown" inert={!expanded[month]} aria-hidden={!expanded[month]}>
        <div class="breakdown-inner">
          {#if charges.length}
            <ul class="charges">
              {#each charges as charge (charge.label)}
                <li>
                  <span class="head">
                    <span class="what">{charge.label}</span>
                  </span>

                  <!-- The attribution and the amount in one mark: a bar in every
                   column that gets handed this charge, sized against the
                   biggest single bill of the month. -->
                  <div
                    class="bars"
                    class:credit={charge.credit}
                    data-cat={charge.category}
                    style="--track-height: {barPx(
                      Math.max(...charge.amounts.map(Math.abs)),
                      peak
                    )}px"
                  >
                    {#each charge.amounts as amount, i (cells[i].key)}
                      <span
                        class="cell"
                        class:zero={Math.abs(amount) <= 0.005}
                        class:credit={charge.credit || amount < 0}
                        data-cat={charge.categories[i]}
                      >
                        <span class="track">
                          <i class="bar" style="height: {barPx(Math.abs(amount), peak)}px"></i>
                        </span>
                        <span class="amt"
                          >{Math.abs(amount) > 0.005
                            ? `${charge.credit || amount < 0 ? '−' : ''}${money(Math.abs(amount))}`
                            : ''}</span
                        >
                      </span>
                    {/each}
                  </div>
                </li>
              {/each}
            </ul>
          {:else if !idle}
            <p class="nothing">
              Your phone is paid off. {PAID_OFF_IDEAS[
                paidOffMonths.indexOf(month) % PAID_OFF_IDEAS.length
              ]}
            </p>
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
        </div>
      </div>
      <div class="totals">
        {#each cells as cell (cell.key)}
          <span class="sum" class:zero={Math.abs(cell.net) <= 0.005} class:back={cell.net < 0}>
            {Math.abs(cell.net) > 0.005 ? money(cell.net) : '—'}
          </span>
        {/each}
      </div>
    </div>

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
  .month:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .stacked {
    max-height: 130px;
    overflow: hidden;
    transition:
      max-height 250ms ease,
      opacity 250ms ease;
    display: grid;
    grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
    gap: var(--col-gap);
    padding: 0 var(--gutter);
  }
  .stack-positive,
  .stack-negative {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .stack-positive {
    justify-content: flex-end;
    border-bottom: 1px solid var(--border);
  }
  .segment {
    display: block;
    flex: none;
    width: 100%;
    max-width: var(--bar-w);
    background: var(--fill);
  }
  .segment.credit {
    background: transparent;
    border: 1px solid var(--fill);
    box-sizing: border-box;
  }
  .breakdown {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    visibility: hidden;
    transition:
      grid-template-rows 250ms ease,
      opacity 250ms ease,
      visibility 250ms;
  }
  .breakdown-inner {
    min-height: 0;
    overflow: hidden;
    display: grid;
    gap: 5px;
  }
  .expanded .breakdown {
    grid-template-rows: 1fr;
    opacity: 1;
    visibility: visible;
  }
  .expanded .stacked {
    max-height: 0;
    opacity: 0;
  }
  .sentinel {
    height: 1px;
  }

  .panel-wrap {
    position: sticky;
    top: var(--sticky-top, 57px);
    z-index: 4;
    margin-bottom: 12px;
    background: var(--bg);
    padding: 4px 0;
  }

  /* One month */
  .month {
    cursor: pointer;
    display: grid;
    gap: 5px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: color-mix(in oklch, var(--surface) 65%, var(--bg));
    margin-bottom: 8px;
    padding: 8px 0;
  }
  .month.beat {
    padding-top: 10px;
  }
  /* Highlight the current card without changing its size. */
  .month.on {
    border-color: color-mix(in oklch, var(--accent) 50%, var(--border));
    background: color-mix(in oklch, var(--accent) 7%, transparent);
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 0 var(--gutter);
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
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .charges li {
    display: grid;
    gap: 2px;
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
    height: var(--track-height);
    border-bottom: 1px solid color-mix(in oklch, var(--border) 65%, transparent);
  }
  .bar {
    position: relative;
    display: block;
    width: 100%;
    max-width: var(--bar-w);
    border-radius: 3px 3px 0 0;
    background: var(--fill);
  }
  .bar,
  .segment {
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
  .month.landed .bar,
  .month.landed .segment {
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
    color: var(--muted);
    text-wrap: pretty;
  }

  /*
   * A credit row is the same grid upside down: the baseline moves to the top
   * of the track and the bar hangs below it, outlined rather than filled,
   * because this is money coming back.
   */
  .cell.credit .track {
    align-items: flex-start;
    border-top: 1px solid color-mix(in oklch, var(--border) 65%, transparent);
    border-bottom: 0;
  }
  .cell.credit .bar {
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
    color: var(--muted);
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
      margin-bottom: 8px;
      padding: 4px 0;
    }
    .month {
      gap: 5px;
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
    .breakdown,
    .stacked,
    .bar,
    .segment {
      transition: none;
    }
  }
</style>
