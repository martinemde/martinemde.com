<script lang="ts">
  import { CATEGORIES, CATEGORY_LABELS, money0, type Scenario } from '$lib/apple-upgrade/model';

  interface Props {
    scenarios: Scenario[];
    /** Which month the reader has scrolled to. Columns show totals through it. */
    month: number;
    /** Tallest column at the horizon, so bars are on one scale all the way down. */
    ceiling: number;
    /** Nominal dollars, or the same stream discounted back to today. */
    basis: 'cash' | 'npv';
    /** Plot height in pixels. The ledger owns it so the two stay in step. */
    height: number;
    /** A horizontal marker across the plot — where the phone is paid for. */
    reference?: { value: number; label: string };
    /** Set once the panel has latched to the top of the viewport. */
    stuck?: boolean;
  }

  let {
    scenarios,
    month,
    ceiling,
    basis = $bindable(),
    height,
    reference,
    stuck = false
  }: Props = $props();

  const empty = { phone: 0, rent: 0, care: 0, fees: 0, repair: 0, tax: 0 };

  const bars = $derived(
    scenarios.map((s) => {
      // Month -1 is the state before the first month has been scrolled past:
      // four empty columns, so the first thing the reader sees arrive is the
      // day-one cost rather than a chart that was already part-full.
      const row = month < 0 ? undefined : s.rows[Math.min(month, s.rows.length - 1)];
      const split = !row
        ? empty
        : basis === 'npv'
          ? row.runningNpvByCategory
          : row.runningByCategory;
      const total = !row ? 0 : basis === 'npv' ? row.runningNpv : row.runningCash;
      // Trade-in value this column could not use, handed back as store credit
      // on day one. It is money in, so it hangs below the axis — leave it out
      // and the columns never net out, and a big trade-in makes the lease look
      // dearer than buying outright, which is the opposite of what happens.
      const credit = row ? s.summary.tradeInRefund : 0;
      return {
        key: s.key,
        name: s.shortName,
        total,
        credit,
        net: total - credit,
        // Bottom-up, fixed order: a band never changes place as values move.
        bands: CATEGORIES.map((c) => ({ category: c, amount: split[c] })).filter(
          (b) => b.amount > 0.005
        ),
        pct: ceiling > 0 ? Math.min(100, (total / ceiling) * 100) : 0
      };
    })
  );

  // Nothing is cheapest before anything has been spent.
  const leader = $derived(
    bars.every((b) => b.total <= 0 && b.credit <= 0)
      ? -1
      : bars.reduce((best, b, i) => (b.net < bars[best].net ? i : best), 0)
  );

  /** Deepest credit on screen. Zero unless a trade-in outran what a path can use. */
  const creditCeiling = $derived(Math.max(0, ...bars.map((b) => b.credit)));

  /**
   * A band's share of its own bar. The bar is already sized against the
   * ceiling, and a percentage flex-basis resolves against the bar rather than
   * the plot — sizing the bands off the ceiling too would square the scale
   * and leave every bar shorter than its total.
   */
  function bandPct(amount: number, total: number): number {
    return total > 0 ? (amount / total) * 100 : 0;
  }

  const refPct = $derived(
    reference && ceiling > 0 ? Math.min(92, (reference.value / ceiling) * 100) : null
  );
</script>

<div class="panel" class:stuck>
  <div class="top">
    <span class="eyebrow"
      >// month {month < 0 ? '--' : String(month).padStart(2, '0')} of {scenarios[0].rows.length -
        1}</span
    >
    <button
      class="basis"
      type="button"
      aria-pressed={basis === 'npv'}
      onclick={() => (basis = basis === 'npv' ? 'cash' : 'npv')}
    >
      {basis === 'npv' ? 'today’s dollars' : 'nominal dollars'}
    </button>
  </div>

  <div
    class="chart"
    style="height: {height}px"
    role="img"
    aria-label={month < 0
      ? 'Nothing paid yet'
      : `Paid to date through month ${month}: ${bars
          .map(
            (b) =>
              `${b.name} ${money0(b.net)}` +
              (b.credit > 0 ? ` (${money0(b.total)} out, ${money0(b.credit)} back)` : '')
          )
          .join(', ')}`}
  >
    <!-- Every cell is placed explicitly: the reference line spans the whole
         plot row, and auto-placement would shove the bars out of it. -->
    {#each bars as bar, i (bar.key)}
      <span class="total" class:low={i === leader} style="grid-column: {i + 1}"
        >{money0(bar.net)}</span
      >
    {/each}

    {#each bars as bar, i (bar.key)}
      <div class="track" style="grid-column: {i + 1}">
        <div class="up" style="flex: {ceiling} 0 0">
          <div class="stack" style="height: {bar.pct}%">
            {#each bar.bands as band (band.category)}
              <div
                class="band"
                data-cat={band.category}
                style="flex: 0 1 {bandPct(band.amount, bar.total)}%"
                title="{CATEGORY_LABELS[band.category]}: {money0(band.amount)}"
              ></div>
            {/each}
          </div>
        </div>
        {#if creditCeiling > 0}
          <div class="down" style="flex: {creditCeiling} 0 0">
            {#if bar.credit > 0}
              <i
                class="credit"
                style="height: {(bar.credit / creditCeiling) * 100}%"
                title="Apple credit back: {money0(bar.credit)}"
              ></i>
            {/if}
          </div>
        {/if}
      </div>
    {/each}

    {#if refPct !== null}
      <div class="plot-marker" aria-hidden="true">
        <div class="up" style="flex: {ceiling} 0 0">
          <span class="line" style="bottom: {refPct}%"></span>
        </div>
        {#if creditCeiling > 0}
          <div class="down" style="flex: {creditCeiling} 0 0"></div>
        {/if}
      </div>
    {/if}

    {#each bars as bar, i (bar.key)}
      <span class="name" class:low={i === leader} style="grid-column: {i + 1}">
        {bar.name}
        {#if bar.credit > 0}<b>{money0(bar.credit)} back</b>{/if}
      </span>
    {/each}
  </div>

  {#if reference}
    <p class="caption">
      <i aria-hidden="true"></i>{money0(reference.value)} &middot; {reference.label}
    </p>
  {/if}
</div>

<style>
  /*
   * The original four solid fills, one per kind of dollar. Derived by snapping the
   * site's teal/violet idiom to the nearest steps that clear the full
   * colour-vision gate, then validated as a set against the panel surface
   * (#f0ece5 light, #121824 dark) on the strict all-pairs list:
   *   light  worst CVD ΔE 12.9 · normal-vision ΔE 20.9 · min contrast 3.10:1
   *   dark   worst CVD ΔE 11.5 · normal-vision ΔE 19.2 · min contrast 4.22:1
   * Both clear the ΔE 8 target, the ΔE 15 normal-vision floor and 3:1 contrast,
   * so identity survives protanopia and deuteranopia in either theme. Every
   * band is also named in its tooltip, and the ledger below prints every charge
   * beside a swatch of its own colour as it arrives — which is what teaches the
   * mapping, and why this panel carries no legend of its own. Re-run the
   * validator before touching a value. Repairs add a fifth, hatched band so
   * they remain distinct without relying on color alone.
   */
  .panel {
    --cat-phone: light-dark(#1289e7, #1795fa);
    --cat-rent: light-dark(#882e9b, #a264b0);
    --cat-care: light-dark(#2b9667, #4f9f77);
    --cat-fees: light-dark(#9a3c00, #e86518);
    --cat-tax: light-dark(#53616d, #b3c4d2);
    --cat-repair: light-dark(#665d16, #d8c86b);
    --cat-credit: light-dark(#1289e7, #1795fa);
    /* Bars stay bar-shaped on a wide screen instead of becoming slabs; the
       ledger uses the same token so a month's slice keeps the same width. */
    --bar-w: 104px;

    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
    padding: 12px 14px 10px;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }
  /* Latched to the top of the viewport: lift it off the text flowing beneath. */
  .panel.stuck {
    border-color: color-mix(in oklch, var(--accent) 45%, var(--border));
    box-shadow: 0 10px 24px -14px color-mix(in oklch, var(--text) 45%, transparent);
  }

  .top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  /* The whole thesis of the page is timing, so switching basis stays one tap
     away rather than living in a settings block further up. */
  .basis {
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    padding: 2px 9px;
    color: var(--faint);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    transition:
      color 0.15s ease,
      border-color 0.15s ease;
  }
  .basis:hover {
    border-color: color-mix(in oklch, var(--accent) 55%, var(--border));
    color: var(--muted);
  }
  .basis[aria-pressed='true'] {
    border-color: color-mix(in oklch, var(--accent) 60%, var(--border));
    color: var(--accent);
  }

  /*
   * One grid for the whole plot rather than four independent columns: the
   * totals, the bars and the names each get a row, so they line up across
   * columns and the reference line can span the plot row exactly.
   * Height comes from the ledger, in pixels.
   */
  .chart {
    display: grid;
    grid-template-columns: repeat(var(--columns, 4), minmax(0, 1fr));
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 4px 8px;
  }

  .total {
    grid-row: 1;
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 13px;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: var(--text);
  }
  /* Cheapest so far. Marked, not recoloured — the fills mean categories. */
  .total.low,
  .name.low {
    color: var(--accent);
  }

  /*
   * Two regions, split in the same ratio as the scales they carry, so a dollar
   * is the same height above the axis as below it. `.down` only exists when a
   * trade-in outran what some path could absorb.
   */
  .track,
  .plot-marker {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .track {
    position: relative;
    z-index: 2;
    grid-row: 2;
  }
  .up {
    display: flex;
    align-items: flex-end;
    min-height: 0;
  }
  .track .up {
    border-bottom: 1px solid var(--border);
  }
  .plot-marker .up {
    position: relative;
  }
  .down {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 0;
  }
  /* Outlined, not filled: this is money coming back, not money going out. */
  .credit {
    width: 100%;
    max-width: var(--bar-w);
    border: 1.5px solid var(--cat-credit);
    border-top: 0;
    border-radius: 0 0 4px 4px;
    transition: height 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /*
   * Where the phone has been paid for outright, which is what the empty top of
   * the plot is counting down to. Drawn over the bars the way a target line
   * normally is, with its label on a chip at the right-hand end.
   */
  .plot-marker {
    z-index: 3;
    grid-row: 2;
    grid-column: 1 / -1;
    pointer-events: none;
  }
  .plot-marker .line {
    position: absolute;
    right: 0;
    left: 0;
    border-top: 1px dashed color-mix(in oklch, var(--faint) 75%, transparent);
  }

  /* One line, naming the dashed line only. Not a colour key: the ledger below
     prints every charge beside a swatch of its own colour as it arrives. */
  .caption {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.02em;
    color: var(--faint);
  }
  .caption i {
    height: 0;
    width: 14px;
    flex: none;
    border-top: 1px dashed color-mix(in oklch, var(--faint) 75%, transparent);
  }
  .stack {
    display: flex;
    flex-direction: column-reverse;
    gap: 2px;
    margin: 0 auto;
    width: 100%;
    max-width: var(--bar-w);
    transition: height 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  }
  /* Shrinkable, so the 2px separators come out of the bands in proportion
     rather than pushing the bar past its own height. */
  .band {
    min-height: 1px;
    background: var(--fill);
    transition: flex-basis 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  }
  /* 4px rounded data-end on the top of the bar; the baseline stays square. */
  .stack .band:last-child {
    border-radius: 4px 4px 0 0;
  }

  .name {
    grid-row: 3;
    display: block;
    min-width: 0;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 10.5px;
    letter-spacing: 0.02em;
    text-align: center;
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name b {
    display: block;
    font-weight: 460;
    font-size: 9px;
    color: var(--cat-credit);
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
  [data-cat='tax'] {
    --fill: var(--cat-tax);
  }
  [data-cat='fees'] {
    --fill: var(--cat-fees);
  }

  @media (max-width: 560px) {
    .panel {
      --bar-w: 62px;

      border-radius: 11px;
      padding: 9px 10px 8px;
    }
    .chart {
      gap: 6px;
    }
    .total {
      font-size: 11.5px;
    }
    .name {
      font-size: 9.5px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel,
    .stack,
    .band,
    .credit,
    .basis {
      transition: none;
    }
  }
</style>
