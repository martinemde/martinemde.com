<script lang="ts">
  import { replaceState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { allItems, bankrolls, tierColors, tiers } from '$lib/trillion/items';
  import {
    allocations,
    bankrollAt,
    blockOwners,
    blockValue,
    canAfford,
    clampUnits,
    decodeSpend,
    encodeSpend,
    formatExact,
    formatMoney,
    formatShare,
    itemTotal,
    maxUnits,
    needsUpgrade,
    overdraft,
    refund,
    rungFor,
    rungForTotal,
    receipt,
    shareText,
    shortfall,
    spentFraction,
    totalSpent,
    type Item,
    type Tier
  } from '$lib/trillion/game';

  const STORAGE_KEY = 'trillion-game';

  interface Saved {
    funded: Record<string, number>;
    revealed: number;
    /** Which bankroll is open: 0 is Musk alone, the last rung is the red. */
    level: number;
  }

  /** A restored board, plus whether it came off somebody else's shared link. */
  type Restored = Saved & { borrowed: boolean };

  const DEFAULTS: Restored = { funded: {}, revealed: 1, level: 0, borrowed: false };

  /**
   * A shared ledger beats a saved one: someone followed a link to see a
   * particular split, so show them that split, with every tier open — they are
   * arriving at a finished receipt rather than starting a game.
   */
  function fromLink(): Restored | null {
    const shared = decodeSpend(allItems, new URLSearchParams(window.location.search).get('s'));
    if (Object.keys(shared).length === 0) return null;
    return {
      funded: shared,
      revealed: tiers.length,
      level: rungForTotal(bankrolls, totalSpent(tiers, shared)),
      borrowed: true
    };
  }

  // Restored at init like the other calculators on this site, so a reload
  // doesn't wipe out a ledger someone spent ten minutes building.
  function restore(): Restored {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
      const shared = fromLink();
      if (shared) return shared;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULTS;
      const parsed = JSON.parse(raw) as Partial<Saved>;
      return {
        funded: parsed.funded ?? {},
        revealed: Math.min(Math.max(parsed.revealed ?? 1, 1), tiers.length),
        level: Math.min(Math.max(parsed.level ?? 0, 0), bankrolls.length - 1),
        borrowed: false
      };
    } catch {
      return DEFAULTS;
    }
  }

  const initial = restore();

  let funded = $state<Record<string, number>>(initial.funded);
  let revealed = $state(initial.revealed);
  let level = $state(initial.level);
  /** Somebody else's ledger, on loan until this visitor changes something. */
  let borrowed = $state(initial.borrowed);

  /** The item waiting on an upgrade, and how many years of it. Drives the modal. */
  let pending = $state<{ item: Item; units: number; tierIndex: number } | null>(null);
  let modal = $state<HTMLDialogElement | null>(null);

  let sheet = $state<HTMLDialogElement | null>(null);
  let sheetOpen = $state(false);
  /** Which button just copied something, so it can say so for a moment. */
  let copied = $state<'text' | 'link' | null>(null);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  const bankroll = $derived(bankrollAt(bankrolls, level));
  const pot = $derived(bankroll.amount);

  const allocs = $derived(allocations(tiers, funded));
  const spent = $derived(allocs.reduce((sum, a) => sum + a.amount, 0));
  const left = $derived(pot - spent);
  const inTheRed = $derived(overdraft(spent, pot));
  const owners = $derived(blockOwners(allocs, pot));
  const ledger = $derived(receipt(allocs));
  const visibleTiers = $derived(tiers.slice(0, revealed));
  const allRevealed = $derived(revealed >= tiers.length);

  /** Which rung the parked purchase actually needs, not merely the next one up. */
  const upgradeLevel = $derived(
    pending
      ? rungFor(
          bankrolls,
          level,
          spent -
            itemTotal(pending.item, units(pending.item)) +
            itemTotal(pending.item, pending.units)
        )
      : level + 1
  );
  const upgrade = $derived(bankrolls[upgradeLevel]);

  /** The most expensive thing still within reach — the receipt's parting shot. */
  const biggestLeft = $derived(
    allItems
      .filter((item) => (funded[item.id] ?? 0) === 0 && item.cost <= left)
      .sort((a, b) => b.cost - a.cost)[0]
  );

  $effect(() => {
    const saved: Saved = { funded, revealed, level };
    // Reading the board first keeps this subscribed while the ledger is on loan
    // from a shared link. Nothing is written until the visitor makes it theirs,
    // so following somebody's link cannot overwrite their own spending.
    if (borrowed) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Private mode, quota, whatever — the page still works, it just forgets.
    }
  });

  function units(item: Item): number {
    return clampUnits(item, funded[item.id] ?? 0);
  }

  function isFunded(item: Item): boolean {
    return units(item) > 0;
  }

  /** Money already committed to this item, which is available to re-spend on it. */
  function budgetFor(item: Item): number {
    return left + itemTotal(item, units(item));
  }

  function tierSpend(tier: Tier): number {
    return tier.items.reduce((sum, item) => sum + itemTotal(item, units(item)), 0);
  }

  /** Funding anything in the last visible tier opens the next one. */
  function revealNext(tierIndex: number) {
    if (revealed === tierIndex + 1 && revealed < tiers.length) revealed = tierIndex + 2;
  }

  /** Commits a purchase, or parks it and asks for a bigger bankroll first. */
  function spend(item: Item, nextUnits: number, tierIndex: number) {
    const cost = itemTotal(item, nextUnits) - itemTotal(item, units(item));
    if (needsUpgrade(cost, left, bankrolls, level)) {
      pending = { item, units: nextUnits, tierIndex };
      modal?.showModal();
      return;
    }
    if (!canAfford(cost, left, bankroll.unlimited)) return;
    funded = { ...funded, [item.id]: nextUnits };
    revealNext(tierIndex);
  }

  /**
   * The first change to a borrowed ledger makes it this visitor's own: it starts
   * saving, and the sender's code comes off the URL so a reload keeps the edits.
   */
  function claim() {
    if (!borrowed) return;
    borrowed = false;
    replaceState(resolve('/trillion'), {});
  }

  function toggle(item: Item, tierIndex: number) {
    claim();
    if (isFunded(item)) {
      const { [item.id]: _dropped, ...rest } = funded;
      funded = rest;
      return;
    }
    spend(item, 1, tierIndex);
  }

  function bump(item: Item, delta: number, tierIndex: number) {
    claim();
    const next = clampUnits(item, units(item) + delta);
    if (next === 0) {
      const { [item.id]: _dropped, ...rest } = funded;
      funded = rest;
      return;
    }
    spend(item, next, tierIndex);
  }

  /** Take the bankroll the purchase needs and put it through. */
  function acceptUpgrade() {
    claim();
    level = Math.min(Math.max(upgradeLevel, level), bankrolls.length - 1);
    if (pending) {
      funded = { ...funded, [pending.item.id]: pending.units };
      revealNext(pending.tierIndex);
    }
    closeModal();
  }

  function closeModal() {
    pending = null;
    modal?.close();
  }

  function reset() {
    claim();
    funded = {};
    revealed = 1;
    level = 0;
    closeModal();
    hideSheet();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---- The receipt sheet ------------------------------------------------- */

  function showSheet() {
    copied = null;
    sheet?.showModal();
    sheetOpen = true;
  }

  function hideSheet() {
    sheet?.close();
  }

  /** Clicks land on the dialog itself only when they land on the backdrop. */
  function backdropClick(event: MouseEvent) {
    if (event.target === sheet) hideSheet();
  }

  /** The page, plus this ledger, so a link opens somebody else's priorities. */
  function shareUrl(): string {
    const code = encodeSpend(allItems, funded);
    const base = `${window.location.origin}${resolve('/trillion')}`;
    return code ? `${base}?s=${code}` : base;
  }

  function flash(which: 'text' | 'link') {
    copied = which;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied = null), 2200);
  }

  async function copyToClipboard(value: string, which: 'text' | 'link') {
    try {
      await navigator.clipboard.writeText(value);
      flash(which);
    } catch {
      // No clipboard access. Nothing useful to say about it in the UI.
    }
  }

  /**
   * The native share sheet where there is one — phones, mostly — and the
   * clipboard everywhere else, so the button does something on every machine.
   */
  async function shareReceipt() {
    const text = shareText({ ledger, spent, pot, left, url: shareUrl() });
    if (navigator.share) {
      try {
        await navigator.share({ title: "Give Away Elon's Money", text });
      } catch {
        // Dismissed the share sheet, or the target refused it. Either way, done.
      }
      return;
    }
    await copyToClipboard(text, 'text');
  }
</script>

<svelte:head>
  <title>Give Away Elon's Money - Martin Emde</title>
  <meta
    name="description"
    content="A trillion dollars, one thousand squares, and a list of real, sourced prices for fixing things. Spend it all and watch how little moves."
  />
</svelte:head>

<!--
  The ledger and the two totals, rendered both at the end of the page and inside
  the share sheet, so the receipt says exactly the same thing in both places.
-->
{#snippet receiptBody(empty: string)}
  {#if ledger.length === 0}
    <p class="empty">{empty}</p>
  {:else}
    <ol class="ledger">
      {#each ledger as alloc (alloc.item.id)}
        <li style:--tier={tierColors[alloc.tierId]}>
          <span class="l-name">
            <!-- Non-breaking space: a plain one gets trimmed at the block edge. -->
            {alloc.item.label}{#if alloc.units > 1}<span class="dim"
                >&nbsp;× {alloc.units} years</span
              >{/if}
          </span>
          <span class="l-amount">{formatMoney(alloc.amount)}</span>
        </li>
      {/each}
    </ol>

    <div class="totals">
      <div>
        <span class="t-label">Allocated</span>
        <span class="t-value">{formatExact(spent)}</span>
        <span class="t-note"
          >{formatShare(spent)} of the fortune, across {ledger.length}
          {ledger.length === 1 ? 'line' : 'lines'}</span
        >
      </div>
      <div>
        <span class="t-label">{inTheRed > 0 ? 'Overdrawn by' : 'Still in the pile'}</span>
        <span class="t-value" class:red={inTheRed > 0}>{formatExact(Math.abs(left))}</span>
        <span class="t-note">
          {#if inTheRed > 0}
            Past every billionaire on Earth. This money does not exist.
          {:else if left <= 0}
            Gone. Every square is full.
          {:else if biggestLeft}
            Still enough for: {biggestLeft.label.toLowerCase()} ({formatMoney(
              biggestLeft.cost
            )}{#if biggestLeft.per}/yr{/if})
          {:else}
            Not enough left for anything else on this list.
          {/if}
        </span>
        <!-- The kicker: the leftovers, handed back to the people you billed. -->
        {#if left > 0 && bankroll.count > 0}
          <span class="t-sub">
            Enough to give {bankroll.each}
            {formatMoney(refund(left, bankroll.count))} back.
          </span>
        {/if}
      </div>
    </div>
  {/if}
{/snippet}

<div class="page">
  <Breadcrumbs
    crumbs={[{ label: 'Projects', href: '/projects' }, { label: "Give Away Elon's Money" }]}
  />

  <header class="hero">
    <div class="eyebrow">// a spending experiment</div>
    <h1>Give Away Elon's Money</h1>
    <p class="lede">
      In June 2026 Elon Musk became the first person on Earth to be worth a trillion dollars. So
      here is a trillion dollars. Your job is to get rid of it.
    </p>
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <p class="credit">
      <a
        href="https://www.forbes.com/sites/tylerroush/2026/06/29/musk-is-a-trillionaire-again-spacex-and-tesla-boost-net-worth-by-50-billion/"
        rel="external noopener"
        target="_blank">Forbes, June 2026 ↗</a
      >
    </p>
    <p class="sub">
      Every price below is a real, published number with a link to where it came from. This is not a
      scoreboard for anyone's politics and nobody here owes anybody anything — it is a ruler. Most
      people, including me, have no working intuition for what a trillion dollars is. Spend it and
      find out. Run out, and you'll be offered somebody else's money.
    </p>

    <figure class="gridwrap">
      <div class="grid" aria-hidden="true">
        {#each owners as owner, i (i)}
          <span class="blk" style:background={owner ? tierColors[owner] : undefined}></span>
        {/each}
      </div>
      <figcaption>
        1,000 squares. Each one is <strong>{formatExact(blockValue(pot))}</strong>. You have filled
        <strong>{Math.round(spentFraction(spent, pot) * 1000)}</strong> of them.
        {#if level > 0}
          <span class="rescaled">
            The grid did not get bigger when you took {bankroll.label} — the squares did.
          </span>
        {/if}
      </figcaption>
    </figure>
  </header>

  {#each visibleTiers as tier, tierIndex (tier.id)}
    <section class="tier" style:--tier={tierColors[tier.id]}>
      <div class="tier-head">
        <div class="tier-kicker">{tier.kicker}</div>
        <h2>{tier.title}</h2>
        <p>{tier.lede}</p>
      </div>

      <div class="cards">
        {#each tier.items as item (item.id)}
          {@const n = units(item)}
          {@const committed = itemTotal(item, n)}
          {@const affordable = canAfford(item.cost, budgetFor(item), bankroll.unlimited)}
          {@const short = shortfall(item.cost, budgetFor(item))}
          {@const askable = needsUpgrade(item.cost, budgetFor(item), bankrolls, level)}
          <article class="card" class:funded={n > 0} class:broke={!affordable && n === 0}>
            <div class="card-top">
              <h3>{item.label}</h3>
              <div class="price">
                {formatMoney(item.cost)}{#if item.per}<span class="per">/yr</span>{/if}
              </div>
            </div>

            <p class="why">{item.note}</p>

            <div class="card-foot">
              {#if item.per}
                <div class="stepper" class:on={n > 0}>
                  <button
                    type="button"
                    onclick={() => bump(item, -1, tierIndex)}
                    disabled={n === 0}
                    aria-label="Fund {item.label} for one year less">−</button
                  >
                  <span class="years">
                    {#if n === 0}
                      Fund by the year
                    {:else}
                      {n}
                      {n === 1 ? 'year' : 'years'} · {formatMoney(committed)}
                    {/if}
                  </span>
                  <button
                    type="button"
                    onclick={() => bump(item, 1, tierIndex)}
                    disabled={n >= maxUnits(item) ||
                      (itemTotal(item, n + 1) > budgetFor(item) &&
                        !bankroll.unlimited &&
                        !needsUpgrade(itemTotal(item, n + 1) - committed, left, bankrolls, level))}
                    aria-label="Fund {item.label} for one more year">+</button
                  >
                </div>
              {:else}
                <button
                  type="button"
                  class="fund"
                  class:on={n > 0}
                  class:ask={askable && n === 0}
                  disabled={!affordable && !askable && n === 0}
                  onclick={() => toggle(item, tierIndex)}
                >
                  {#if n > 0}
                    Funded — undo
                  {:else if affordable}
                    Fund it
                  {:else if askable}
                    Needs {formatMoney(short)} more →
                  {:else}
                    Short {formatMoney(short)}
                  {/if}
                </button>
              {/if}

              <div class="share">
                {#if n > 0}
                  {formatShare(committed, pot)} of the pot
                {:else}
                  {formatShare(item.cost, pot)}{#if item.per}&nbsp;a year{/if}
                {/if}
              </div>
            </div>

            <!-- Prices come from the linked sources; the rule can't see that these are external. -->
            <!-- eslint-disable svelte/no-navigation-without-resolve -->
            <div class="sources">
              {#each item.sources as source (source.url)}
                <a href={source.url} rel="external noopener" target="_blank">{source.label} ↗</a>
              {/each}
            </div>
            <!-- eslint-enable svelte/no-navigation-without-resolve -->
          </article>
        {/each}
      </div>

      <div class="tier-foot">
        <span class="tally">
          This tier: <strong>{formatMoney(tierSpend(tier))}</strong>
          <span class="dim">· {formatShare(tierSpend(tier), pot)} of the pot</span>
        </span>
        {#if tierIndex === revealed - 1 && !allRevealed}
          <button type="button" class="next" onclick={() => (revealed += 1)}>
            Next: {tiers[tierIndex + 1].title} ↓
          </button>
        {/if}
      </div>
    </section>
  {/each}

  {#if allRevealed}
    <section class="finale">
      <h2>The receipt</h2>

      {@render receiptBody(
        "You haven't spent a dollar yet. The whole trillion is still sitting up there."
      )}

      <div class="closers">
        <h3>Three ways to hold the number</h3>
        <p>
          <strong>Spend a million dollars a day.</strong> Start the day Julius Caesar was assassinated
          and keep going, weekends included, for 2,070 years. You would be about $240 billion short of
          a trillion.
        </p>
        <p>
          <strong>Count to a trillion out loud</strong>, one number a second, without sleeping. You
          finish in roughly 31,700 years.
        </p>
        <p>
          <strong>It moves faster than you can spend it.</strong> Forbes clocked this particular fortune
          gaining about $60 billion in a single week in June 2026 — enough, in seven days, to end polio,
          immunize half a billion children, fully fund the global fight against AIDS, TB and malaria,
          replace every lead pipe in America, and still have $4 billion left over.
        </p>
      </div>

      <div class="fineprint">
        <p>
          Every figure links to its source. Global estimates are estimates: the underlying research
          usually gives a range, and where it does, these prices use a number the cited source
          itself leads with. Sports valuations are Forbes' 2025 marks, not offers — nobody has to
          sell. Recurring costs are shown per year because that is how their budgets are actually
          written.
        </p>
        <button type="button" class="reset" onclick={reset}>Put it all back</button>
      </div>
    </section>
  {/if}

  <!-- Sticky rather than fixed: it rides the viewport bottom while you spend,
       then settles at the end of the page instead of sitting on the footer.
       The whole bar is the handle for the receipt — it is the one control that
       is always on screen, and the running total is what you want to open. -->
  <aside class="hud" aria-live="polite">
    <button
      type="button"
      class="hud-inner"
      onclick={showSheet}
      aria-haspopup="dialog"
      aria-expanded={sheetOpen}
    >
      <div class="hud-main">
        <span class="hud-label">{inTheRed > 0 ? 'Overdrawn' : 'Still to spend'}</span>
        <span class="hud-amount" class:red={inTheRed > 0}
          >{inTheRed > 0 ? '−' : ''}{formatExact(Math.abs(left))}</span
        >
      </div>
      <div class="hud-bar">
        <div
          class="hud-fill"
          class:red={inTheRed > 0}
          style:width="{spentFraction(spent, pot) * 100}%"
        ></div>
      </div>
      <div class="hud-meta">
        <span>bankroll: {bankroll.short}</span>
        <span>{ledger.length} funded</span>
        <span class="hud-cta">Receipt &amp; share ↑</span>
      </div>
    </button>
  </aside>
</div>

<!-- Bottom sheet on a phone, a card parked at the bottom edge on a desktop.
     A <dialog> gives Escape, focus trapping and the top layer; the backdrop
     click, the grip and the × are all there to make closing obvious. -->
<dialog
  bind:this={sheet}
  class="sheet"
  aria-label="Your receipt"
  onclick={backdropClick}
  onclose={() => {
    sheetOpen = false;
    copied = null;
  }}
>
  <div class="sheet-grip" aria-hidden="true"></div>

  <div class="sheet-head">
    <div>
      <h2>The receipt</h2>
      <p class="sheet-sub">
        {formatExact(spent)} of {formatMoney(pot)} · {ledger.length}
        {ledger.length === 1 ? 'line' : 'lines'}
      </p>
    </div>
    <button type="button" class="sheet-x" onclick={hideSheet} aria-label="Close the receipt"
      >×</button
    >
  </div>

  <div class="sheet-body">
    {@render receiptBody('Nothing on it yet. Fund something and it turns up here.')}
  </div>

  <div class="sheet-foot">
    <div class="sheet-actions">
      <button type="button" class="sheet-share" onclick={shareReceipt}>
        {copied === 'text' ? 'Copied your receipt' : 'Share my receipt'}
      </button>
      <button type="button" class="sheet-copy" onclick={() => copyToClipboard(shareUrl(), 'link')}>
        {copied === 'link' ? 'Link copied' : 'Copy link'}
      </button>
      <button type="button" class="sheet-close" onclick={hideSheet}>Close</button>
    </div>
    <p class="sheet-note">
      The link opens this page with your split already loaded, so whoever you send it to sees what
      you picked — then spends the trillion their own way.
    </p>
  </div>
</dialog>

<!-- Native <dialog> so focus trapping, Escape and the backdrop come for free. -->
<dialog bind:this={modal} class="ask-modal" onclose={() => (pending = null)}>
  {#if pending && upgrade}
    {@const cost = itemTotal(pending.item, pending.units)}
    <h2>{bankroll.exhausted}</h2>
    <p class="ask-lede">
      <strong>{pending.item.label}</strong>
      {#if pending.units > 1}for {pending.units} years{/if}
      costs {formatMoney(cost)} — {formatMoney(shortfall(cost, left))} more than is left in the pot.
    </p>

    <div class="ask-next">
      <div class="ask-next-head">
        <span class="ask-next-label">Next up: {upgrade.label}</span>
        <span class="ask-next-amount">
          {upgrade.unlimited ? 'no limit' : formatMoney(upgrade.amount)}
        </span>
      </div>
      <p class="ask-note">{upgrade.note}</p>
      {#if !upgrade.unlimited}
        <p class="ask-people">
          {upgrade.people} · each square in the grid becomes {formatMoney(
            blockValue(upgrade.amount)
          )}
        </p>
      {/if}
      <!-- eslint-disable svelte/no-navigation-without-resolve -->
      <div class="ask-sources">
        {#each upgrade.sources as source (source.url)}
          <a href={source.url} rel="external noopener" target="_blank">{source.label} ↗</a>
        {/each}
      </div>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
    </div>

    <div class="ask-actions">
      <button type="button" class="ask-yes" onclick={acceptUpgrade}>
        {#if upgrade.unlimited}
          Go into the red
        {:else}
          Spend theirs too
        {/if}
      </button>
      <button type="button" class="ask-no" onclick={closeModal}>Never mind</button>
    </div>
  {/if}
</dialog>

<style>
  .page {
    padding-bottom: 8px;
  }

  /* ---- Hero ------------------------------------------------------------ */
  .hero {
    padding: 8px 0 40px;
  }
  h1 {
    margin: 14px 0 18px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 40px;
    line-height: 1.03;
    letter-spacing: -0.03em;
    color: var(--text); /* Skeleton's h1 preset tints headings; the page wants ink */
  }
  .lede {
    margin: 0 0 14px;
    max-width: 620px;
    font-size: 18px;
    line-height: 1.6;
    text-wrap: pretty;
  }
  .credit {
    margin: 0 0 16px;
  }
  .credit a {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--faint);
    text-decoration: none;
  }
  .credit a:hover {
    color: var(--accent);
  }
  .sub {
    margin: 0;
    max-width: 620px;
    font-size: 15px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }

  .gridwrap {
    margin: 32px 0 0;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(25, 1fr);
    gap: 2px;
    max-width: 520px;
  }
  .blk {
    aspect-ratio: 1;
    border-radius: 1px;
    background: color-mix(in oklch, var(--border) 70%, transparent);
    transition: background 180ms ease;
  }
  .gridwrap figcaption {
    margin-top: 14px;
    max-width: 520px;
    font-family: var(--font-mono);
    font-size: 11.5px;
    line-height: 1.7;
    color: var(--faint);
  }
  .gridwrap strong {
    color: var(--text);
    font-weight: 500;
  }
  .rescaled {
    display: block;
    margin-top: 4px;
    color: var(--accent2);
  }

  /* ---- Tiers ----------------------------------------------------------- */
  /*
   * --tier is a fill color: it sits at mid lightness so the grid squares and
   * button fills read on either background. That same value fails as small
   * text — 2:1 on a light card. --tier-ink is the same hue re-lit per theme
   * for anything type-sized; fills keep --tier, text uses --tier-ink.
   */
  .tier,
  .ledger li {
    --tier-ink: light-dark(
      color-mix(in oklch, var(--tier) 55%, black),
      color-mix(in oklch, var(--tier) 92%, white)
    );
  }

  .tier {
    border-top: 1px solid var(--border);
    padding: 40px 0 8px;
  }
  .tier-kicker {
    font-family: var(--font-mono);
    font-size: 11.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--tier-ink);
  }
  .tier-head h2 {
    margin: 10px 0 12px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 28px;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: var(--text);
  }
  .tier-head p {
    margin: 0 0 26px;
    max-width: 620px;
    font-size: 15.5px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }

  .cards {
    display: grid;
    gap: 12px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    border: 1px solid var(--border);
    border-left: 3px solid color-mix(in oklch, var(--border) 80%, transparent);
    border-radius: 10px;
    background: var(--surface);
    padding: 16px;
  }
  .card.funded {
    border-left-color: var(--tier);
    background: color-mix(in oklch, var(--tier) 7%, var(--surface));
  }
  /* Out of reach reads as a dashed edge and a disabled button, not as dimmed
     text — the note and the shortfall are content people still need to read. */
  .card.broke {
    border-style: dashed;
    background: none;
  }
  .card-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 14px;
  }
  .card-top h3 {
    margin: 0;
    font-family: var(--font-body);
    font-weight: 560;
    font-size: 16.5px;
    line-height: 1.3;
    letter-spacing: -0.01em;
    color: var(--text);
  }
  .price {
    flex: none;
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 16px;
    color: var(--tier-ink);
    white-space: nowrap;
  }
  .per {
    font-size: 11px;
    color: var(--faint);
  }
  .why {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.65;
    color: var(--muted);
    text-wrap: pretty;
  }

  .card-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .fund,
  .stepper button,
  .next,
  .reset {
    font-family: var(--font-mono);
    font-size: 12.5px;
    cursor: pointer;
  }
  .fund {
    border: 1px solid var(--tier-ink);
    border-radius: 7px;
    background: transparent;
    padding: 8px 15px;
    color: var(--tier-ink);
    min-height: 38px;
  }
  .fund:not(.on):hover:not(:disabled) {
    background: color-mix(in oklch, var(--tier) 16%, transparent);
  }
  .fund.on,
  .fund.on:hover {
    background: var(--tier);
    border-color: var(--tier);
    color: oklch(0.16 0.02 264); /* fill is opaque and theme-independent, so ink is too */
  }
  .fund.on:hover {
    background: color-mix(in oklch, var(--tier) 86%, white);
  }
  /* An unaffordable price is an invitation to open a bigger bankroll, so it
     reads as an action rather than a dead control. */
  .fund.ask {
    border-style: dashed;
    color: var(--tier-ink);
  }
  .fund.ask:hover {
    background: color-mix(in oklch, var(--tier) 16%, transparent);
    border-style: solid;
  }
  .fund:disabled {
    border-color: var(--border);
    color: var(--muted); /* "Short $895B" is information, not decoration */
    cursor: not-allowed;
  }
  .fund:focus-visible,
  .stepper button:focus-visible,
  .next:focus-visible,
  .reset:focus-visible {
    outline: 2px solid var(--tier-ink, var(--accent));
    outline-offset: 2px;
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 2px;
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 3px;
  }
  .stepper.on {
    border-color: var(--tier-ink);
  }
  .stepper button {
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--tier-ink);
    font-size: 16px;
    line-height: 1;
  }
  .stepper button:hover:not(:disabled) {
    background: color-mix(in oklch, var(--tier) 16%, transparent);
  }
  .stepper button:disabled {
    color: var(--muted); /* --faint lands near 3:1 on both surfaces; still reads as off */
    opacity: 0.75;
    cursor: not-allowed;
  }
  .years {
    min-width: 128px;
    text-align: center;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--muted);
  }
  .stepper.on .years {
    color: var(--text);
  }

  .share {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--faint);
  }
  .sources {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    border-top: 1px solid color-mix(in oklch, var(--border) 60%, transparent);
    padding-top: 10px;
  }
  .sources a {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--faint);
    text-decoration: none;
  }
  .sources a:hover {
    color: var(--tier-ink);
  }

  .tier-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 22px 2px 8px;
  }
  .tally {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--muted);
  }
  .tally strong {
    color: var(--tier-ink);
    font-weight: 500;
  }
  .dim {
    color: var(--faint);
  }
  .next {
    border: 1px solid var(--tier-ink);
    border-radius: 7px;
    background: color-mix(in oklch, var(--tier) 12%, transparent);
    padding: 10px 16px;
    color: var(--tier-ink);
  }
  .next:hover {
    background: color-mix(in oklch, var(--tier) 22%, transparent);
  }

  /* ---- Finale ---------------------------------------------------------- */
  .finale {
    border-top: 1px solid var(--border);
    padding: 40px 0 0;
  }
  .finale h2 {
    margin: 0 0 20px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 28px;
    letter-spacing: -0.02em;
    color: var(--text);
  }
  .empty {
    font-size: 15px;
    color: var(--muted);
  }
  .ledger {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--border);
  }
  .ledger li {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--border);
    border-left: 3px solid var(--tier);
    padding: 11px 12px;
  }
  .l-name {
    font-size: 14px;
    line-height: 1.4;
  }
  .l-amount {
    flex: none;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--tier-ink);
  }

  .totals {
    display: grid;
    gap: 12px;
    margin-top: 22px;
  }
  .totals > div {
    display: flex;
    flex-direction: column;
    gap: 5px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    padding: 16px;
  }
  .t-label {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--faint);
  }
  .t-value {
    font-family: var(--font-mono);
    font-size: clamp(19px, 5.4vw, 27px);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    color: var(--accent);
  }
  .t-note {
    font-size: 12.5px;
    color: var(--muted);
  }
  /* The money-back line: true at every bankroll, and quieter than the total. */
  .t-sub {
    font-family: var(--font-mono);
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--faint);
  }

  .closers {
    margin-top: 40px;
    border-top: 1px solid var(--border);
    padding-top: 28px;
  }
  .closers h3 {
    margin: 0 0 16px;
    font-family: var(--font-body);
    font-weight: 560;
    font-size: 19px;
    color: var(--text);
  }
  .closers p {
    margin: 0 0 16px;
    max-width: 640px;
    font-size: 15px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }
  .closers strong {
    color: var(--text);
    font-weight: 560;
  }

  .fineprint {
    margin-top: 20px;
    border-top: 1px solid var(--border);
    padding: 22px 0 8px;
  }
  .fineprint p {
    margin: 0 0 20px;
    max-width: 640px;
    font-size: 12.5px;
    line-height: 1.7;
    color: var(--faint);
  }
  .reset {
    border: 1px solid var(--border);
    border-radius: 7px;
    background: transparent;
    padding: 10px 16px;
    color: var(--muted);
  }
  .reset:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  /* ---- The wallet ------------------------------------------------------ */
  .hud {
    position: sticky;
    bottom: 0;
    z-index: 30;
    margin: 28px -20px 0;
    border-top: 1px solid var(--border);
    background: color-mix(in oklch, var(--bg) 92%, transparent);
    backdrop-filter: saturate(1.2) blur(10px);
  }
  /* A button, but it has to look like the bar it replaced. */
  .hud-inner {
    display: flex;
    flex-direction: column;
    gap: 7px;
    width: 100%;
    border: 0;
    background: transparent;
    padding: 11px 20px calc(11px + env(safe-area-inset-bottom));
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .hud-inner:hover .hud-cta {
    color: var(--accent);
  }
  .hud-inner:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -3px;
  }
  .hud-main {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .hud-label {
    flex: none;
    font-family: var(--font-mono);
    font-size: 10.5px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--faint);
  }
  .hud-amount {
    font-family: var(--font-mono);
    font-size: clamp(17px, 5.2vw, 26px);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    color: var(--accent);
  }
  .hud-bar {
    height: 4px;
    border-radius: 2px;
    background: color-mix(in oklch, var(--border) 80%, transparent);
    overflow: hidden;
  }
  .hud-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--accent);
    transition: width 260ms ease;
  }
  .hud-amount.red,
  .t-value.red {
    color: light-dark(oklch(0.5 0.2 25), oklch(0.75 0.17 25));
  }
  .hud-fill.red {
    background: light-dark(oklch(0.5 0.2 25), oklch(0.75 0.17 25));
  }
  .hud-meta {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--faint);
  }
  .hud-cta {
    color: var(--accent);
  }

  /* ---- The receipt sheet ------------------------------------------------ */
  /*
   * Anchored to the bottom edge and animated up from it, the way a share sheet
   * behaves on a phone. On a desktop it is the same object, floated off the
   * bottom edge and capped at a readable width, so the interaction is one
   * thing to learn rather than two.
   */
  .sheet {
    display: none;
    flex-direction: column;
    box-sizing: border-box;
    width: min(660px, 100%);
    max-width: 100%;
    max-height: 88svh;
    margin: auto auto 0;
    border: 1px solid var(--border);
    border-bottom: 0;
    border-radius: 16px 16px 0 0;
    background: var(--bg);
    padding: 0;
    color: var(--text);
    opacity: 0;
    transform: translateY(101%);
    transition:
      transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 200ms ease,
      overlay 300ms allow-discrete,
      display 300ms allow-discrete;
  }
  .sheet[open] {
    display: flex;
    opacity: 1;
    transform: translateY(0);
  }
  @starting-style {
    .sheet[open] {
      opacity: 0;
      transform: translateY(101%);
    }
  }
  .sheet::backdrop {
    background: oklch(0.12 0.02 264 / 0);
    transition:
      background 300ms ease,
      overlay 300ms allow-discrete,
      display 300ms allow-discrete;
  }
  .sheet[open]::backdrop {
    background: oklch(0.12 0.02 264 / 0.66);
    backdrop-filter: blur(3px);
  }
  @starting-style {
    .sheet[open]::backdrop {
      background: oklch(0.12 0.02 264 / 0);
    }
  }

  .sheet-grip {
    flex: none;
    width: 44px;
    height: 4px;
    margin: 8px auto 0;
    border-radius: 2px;
    background: var(--border);
  }
  .sheet-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex: none;
    padding: 12px 18px 14px;
  }
  .sheet-head h2 {
    margin: 0;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 21px;
    letter-spacing: -0.02em;
    color: var(--text);
  }
  .sheet-sub {
    margin: 4px 0 0;
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--faint);
  }
  .sheet-x {
    flex: none;
    width: 40px;
    height: 40px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--muted);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
  }
  .sheet-x:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  /* The ledger scrolls; the header and the buttons stay put. */
  .sheet-body {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0 18px 4px;
  }
  .sheet-foot {
    flex: none;
    border-top: 1px solid var(--border);
    padding: 14px 18px calc(14px + env(safe-area-inset-bottom));
  }
  .sheet-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .sheet-share,
  .sheet-copy,
  .sheet-close {
    border-radius: 8px;
    padding: 12px 16px;
    font-family: var(--font-mono);
    font-size: 13px;
    min-height: 44px;
    cursor: pointer;
  }
  .sheet-share {
    flex: 1 1 11rem;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: light-dark(oklch(0.99 0 0), oklch(0.16 0.02 264));
  }
  .sheet-share:hover {
    background: color-mix(in oklch, var(--accent) 86%, white);
  }
  .sheet-copy,
  .sheet-close {
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
  }
  .sheet-copy:hover,
  .sheet-close:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .sheet-share:focus-visible,
  .sheet-copy:focus-visible,
  .sheet-close:focus-visible,
  .sheet-x:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .sheet-note {
    margin: 12px 0 0;
    font-size: 11.5px;
    line-height: 1.6;
    color: var(--faint);
    text-wrap: pretty;
  }
  .sheet .empty {
    margin: 0 0 8px;
    font-size: 14px;
  }
  .sheet .totals {
    margin-top: 14px;
  }

  /* ---- The bigger-bankroll modal --------------------------------------- */
  .ask-modal {
    width: min(520px, calc(100vw - 32px));
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--bg);
    padding: 24px 20px 20px;
    color: var(--text);
  }
  .ask-modal::backdrop {
    background: oklch(0.12 0.02 264 / 0.66);
    backdrop-filter: blur(3px);
  }
  .ask-modal h2 {
    margin: 0 0 12px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 23px;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: var(--text);
    text-wrap: balance;
  }
  .ask-lede {
    margin: 0 0 18px;
    font-size: 14.5px;
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }
  .ask-lede strong {
    color: var(--text);
    font-weight: 560;
  }
  .ask-next {
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    padding: 14px;
  }
  .ask-next-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }
  .ask-next-label {
    font-family: var(--font-body);
    font-weight: 560;
    font-size: 15px;
  }
  .ask-next-amount {
    flex: none;
    font-family: var(--font-mono);
    font-size: 16px;
    color: var(--accent);
  }
  .ask-note {
    margin: 0 0 8px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }
  .ask-people {
    margin: 0 0 10px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--faint);
  }
  .ask-sources a {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--faint);
    text-decoration: none;
  }
  .ask-sources a:hover {
    color: var(--accent);
  }
  .ask-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
  }
  .ask-yes,
  .ask-no {
    border-radius: 8px;
    padding: 12px 16px;
    font-family: var(--font-mono);
    font-size: 13px;
    cursor: pointer;
    min-height: 44px;
  }
  .ask-yes {
    flex: 1;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: light-dark(oklch(0.99 0 0), oklch(0.16 0.02 264));
  }
  .ask-yes:hover {
    background: color-mix(in oklch, var(--accent) 86%, white);
  }
  .ask-no {
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
  }
  .ask-no:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .ask-yes:focus-visible,
  .ask-no:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  /* ---- Wider screens --------------------------------------------------- */
  @media (min-width: 720px) {
    .hero {
      padding-top: 24px;
    }
    h1 {
      font-size: 54px;
    }
    .lede {
      font-size: 20px;
    }
    .grid {
      grid-template-columns: repeat(50, 1fr);
      gap: 3px;
      max-width: 100%;
    }
    .gridwrap figcaption {
      max-width: 100%;
      font-size: 12px;
    }
    .cards {
      grid-template-columns: 1fr 1fr;
    }
    .card {
      padding: 18px;
    }
    .tier-head h2,
    .finale h2 {
      font-size: 34px;
    }
    .totals {
      grid-template-columns: 1fr 1fr;
    }
    .hud {
      margin: 32px -32px 0;
    }
    .hud-inner {
      flex-direction: row;
      align-items: center;
      gap: 20px;
      padding: 13px 32px;
    }
    .hud-main {
      flex: none;
    }
    .hud-bar {
      flex: 1;
    }
    .hud-meta {
      flex: none;
      gap: 18px;
    }
    /* Off the bottom edge, so it reads as a panel rather than a browser chrome. */
    .sheet {
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
      border-radius: 16px;
      max-height: 80svh;
    }
    .sheet-grip {
      display: none;
    }
    .sheet-head {
      padding: 18px 22px 14px;
    }
    .sheet-body {
      padding: 0 22px 4px;
    }
    .sheet-foot {
      padding: 16px 22px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .blk,
    .hud-fill {
      transition: none;
    }
    /* Keep the discrete transitions so the dialog still leaves the top layer. */
    .sheet {
      transition:
        overlay 1ms allow-discrete,
        display 1ms allow-discrete;
      transform: none;
      opacity: 1;
    }
    .sheet::backdrop {
      transition:
        overlay 1ms allow-discrete,
        display 1ms allow-discrete;
    }
  }
</style>
