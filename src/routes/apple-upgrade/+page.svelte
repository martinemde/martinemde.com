<script lang="ts">
  import Step from '$lib/components/upgrade/Step.svelte';
  import Tiles from '$lib/components/upgrade/Tiles.svelte';
  import Field from '$lib/components/upgrade/Field.svelte';
  import Ledger from '$lib/components/upgrade/Ledger.svelte';
  import Compare from '$lib/components/upgrade/Compare.svelte';
  import {
    allScenarios,
    beats,
    HORIZON,
    SCREEN_CRACK_MONTH,
    screenRepairPrice,
    type ScreenChoice,
    leasePayment,
    leaseTerms,
    money,
    money0,
    type AppleCarePlan,
    type EndChoice,
    type Inputs,
    type Term
  } from '$lib/apple-upgrade/model';

  const STORAGE_KEY = 'apple-upgrade-calculator';

  const DEVICES = [
    { key: 'iphone-17', label: 'iPhone 17', price: 799 },
    { key: 'iphone-air', label: 'iPhone Air', price: 999 },
    { key: 'iphone-17-pro', label: 'iPhone 17 Pro', price: 1099 },
    { key: 'iphone-17-pro-max', label: 'iPhone 17 Pro Max', price: 1199 },
    { key: 'custom', label: 'Something else', price: 0 }
  ];

  /** Everything the page remembers between visits. Resale values are excluded
   * on purpose — they re-derive from whichever device you land on. */
  interface Saved {
    deviceKey: string | null;
    listPrice: number;
    hasTradeIn: 'no' | 'yes' | null;
    tradeIn: number;
    term: Term | null;
    appleCare: AppleCarePlan | null;
    endChoice: EndChoice | null;
    appleCareMonthly: number;
    appleCareOneMonthly: number;
    appleCareAnnual: number;
    screenChoice: ScreenChoice | null;
    screenRepairCost: number;
    appleCareRepairCost: number;
    taxRate: number;
    activationFee: number;
    caseCost: number;
    appleCardBack: number;
    klarnaCardBack: number;
    carrierCardBack: number;
    discountRate: number;
    carrierCredits: number;
  }

  const DEFAULTS: Saved = {
    deviceKey: null,
    listPrice: 1199,
    hasTradeIn: null,
    tradeIn: 375,
    term: null,
    appleCare: null,
    endChoice: null,
    appleCareMonthly: 13.49,
    appleCareOneMonthly: 19.99,
    appleCareAnnual: 149,
    screenChoice: null,
    screenRepairCost: 250,
    appleCareRepairCost: 29,
    taxRate: 8.5,
    activationFee: 35,
    caseCost: 59,
    appleCardBack: 3,
    klarnaCardBack: 3,
    carrierCardBack: 2,
    discountRate: 4,
    carrierCredits: 0
  };

  // Restore at init, like the loan calculator, so the page comes back the way
  // you left it rather than flashing defaults and re-asking every question.
  function restore(): Saved {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Saved>) } : DEFAULTS;
    } catch {
      return DEFAULTS; // A corrupt blob just means you get the defaults.
    }
  }
  const initial = restore();

  // ---- Answers ------------------------------------------------------------
  let deviceKey = $state(initial.deviceKey);
  let listPrice = $state(initial.listPrice);
  let hasTradeIn = $state(initial.hasTradeIn);
  let tradeIn = $state(initial.tradeIn);
  let term = $state(initial.term);
  let appleCare = $state(initial.appleCare);
  let endChoice = $state(initial.endChoice);

  // ---- Details ------------------------------------------------------------
  let appleCareMonthly = $state(initial.appleCareMonthly);
  let appleCareOneMonthly = $state(initial.appleCareOneMonthly);
  let appleCareAnnual = $state(initial.appleCareAnnual);
  let screenChoice = $state(initial.screenChoice);
  let screenRepairCost = $state(initial.screenRepairCost);
  let appleCareRepairCost = $state(initial.appleCareRepairCost);
  let activeMonth = $state(-1);
  let screenDialog: HTMLDialogElement;

  $effect(() => {
    if (
      activeMonth >= SCREEN_CRACK_MONTH &&
      screenChoice === null &&
      screenDialog &&
      !screenDialog.open
    ) {
      screenDialog.showModal();
    }
  });

  function chooseScreen(choice: ScreenChoice) {
    screenChoice = choice;
    screenDialog.close();
  }
  let taxRate = $state(initial.taxRate);
  let activationFee = $state(initial.activationFee);
  let caseCost = $state(initial.caseCost);
  let appleCardBack = $state(initial.appleCardBack);
  let klarnaCardBack = $state(initial.klarnaCardBack);
  let carrierCardBack = $state(initial.carrierCardBack);
  let discountRate = $state(initial.discountRate);
  let carrierCredits = $state(initial.carrierCredits);
  let resaleAtTerm = $state(Math.round(initial.listPrice * 0.45));
  let resaleAtHorizon = $state(Math.round(initial.listPrice * 0.24));

  // Resale estimates follow the device and the term. Change either and these
  // re-derive; they're guesses either way, so tune them after you pick.
  $effect(() => {
    const price = listPrice;
    const months = term ?? 24;
    resaleAtTerm = Math.round(price * (months === 12 ? 0.62 : 0.45));
    resaleAtHorizon = Math.round(price * 0.24);
  });

  $effect(() => {
    const saved: Saved = {
      deviceKey,
      listPrice,
      hasTradeIn,
      tradeIn,
      term,
      appleCare,
      endChoice,
      appleCareMonthly,
      appleCareOneMonthly,
      appleCareAnnual,
      screenChoice,
      screenRepairCost,
      appleCareRepairCost,
      taxRate,
      activationFee,
      caseCost,
      appleCardBack,
      klarnaCardBack,
      carrierCardBack,
      discountRate,
      carrierCredits
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  });

  // ---- Step gating --------------------------------------------------------
  const step = $derived(
    appleCare !== null
      ? 5
      : term !== null
        ? 4
        : hasTradeIn !== null
          ? 3
          : deviceKey !== null
            ? 2
            : 1
  );

  // -1 until the first effect run, so restoring a finished form doesn't fling
  // you down the page on load. Only genuine forward progress scrolls.
  let seen = -1;
  $effect(() => {
    const now = step;
    if (seen === -1 || now <= seen) {
      seen = Math.max(seen, now);
      return;
    }
    seen = now;
    const el = document.getElementById(`step-${now}`);
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  });

  function pickDevice(key: string | null) {
    const device = DEVICES.find((d) => d.key === key);
    if (device && device.price > 0) listPrice = device.price;
  }
  $effect(() => {
    pickDevice(deviceKey);
  });

  // ---- Model --------------------------------------------------------------
  const inputs = $derived<Inputs>({
    listPrice,
    tradeIn: hasTradeIn === 'yes' ? tradeIn : 0,
    term: term ?? 24,
    // The columns are identical across all four endings until the term runs
    // out, and the ledger stops there until one is picked, so the placeholder
    // never reaches the screen.
    endChoice: endChoice ?? 'nothing',
    appleCare: appleCare ?? 'none',
    appleCareMonthly,
    appleCareOneMonthly,
    appleCareAnnual,
    screenChoice,
    screenRepairCost,
    appleCareRepairCost,
    taxRate,
    activationFee,
    caseCost,
    appleCardBack,
    klarnaCardBack,
    carrierCardBack,
    discountRate,
    resaleAtTerm,
    resaleAtHorizon,
    carrierCredits,
    carrierTerm: 36
  });

  const repairPrice = $derived(screenRepairPrice(inputs));
  const scenarios = $derived(allScenarios(inputs));
  const story = $derived(beats(inputs));

  /** How far down the ledger the reader is allowed before answering. */
  const ledgerLimit = $derived(endChoice ? HORIZON : (term ?? 24));

  /**
   * What each lease term can absorb of the trade-in. A lease only collects
   * half or seventy percent of the sticker, so a trade-in can run out of
   * payments to reduce long before a purchase would.
   */
  const tradeInSurplus = $derived(
    ([12, 24] as Term[])
      .map((t) => ({ term: t, ...leaseTerms(listPrice, t, hasTradeIn === 'yes' ? tradeIn : 0) }))
      .filter((t) => t.refund > 0.005)
  );

  const termOptions = $derived(
    ([12, 24] as Term[]).map((t) => {
      const terms = leaseTerms(listPrice, t, hasTradeIn === 'yes' ? tradeIn : 0);
      return {
        value: t,
        label: `${t} months`,
        sub: `${money(terms.payment)}/mo`,
        note: `${money0(terms.payment * t)} in payments, then ${money0(terms.buyoutAtTerm)} to keep it`
      };
    })
  );

  const careOptions = $derived([
    { value: 'none' as const, label: 'No AppleCare', sub: '$0', note: 'You own the damage risk' },
    {
      value: 'monthly' as const,
      label: 'AppleCare+ monthly',
      sub: `${money(appleCareMonthly)}/mo`,
      note: 'Cancel any time, billed by Apple'
    },
    {
      value: 'annual' as const,
      label: 'AppleCare+ yearly',
      sub: `${money0(appleCareAnnual)}/yr`,
      note: 'Cheaper if you keep it the whole term'
    },
    {
      value: 'one' as const,
      label: 'AppleCare One',
      sub: `${money(appleCareOneMonthly)}/mo`,
      note: 'Flat rate, up to three devices'
    }
  ]);

  const endOptions = [
    {
      value: 'return' as const,
      label: 'Hand it back',
      note: 'Walk away with nothing'
    },
    {
      value: 'upgrade' as const,
      label: 'Upgrade',
      note: 'New lease, no trade-in allowed'
    },
    {
      value: 'buyout' as const,
      label: 'Buy it now',
      note: 'Pay the remaining balance and own it'
    },
    {
      value: 'nothing' as const,
      label: 'Do nothing',
      note: 'Six more payments, then you own it'
    }
  ];

  const deviceOptions = $derived(
    DEVICES.map((d) => ({
      value: d.key,
      label: d.label,
      sub: d.price > 0 ? money0(d.price) : 'your price',
      note: d.price > 0 ? `${money(leasePayment(d.price, 24))}/mo on a 24-month lease` : undefined
    }))
  );

  const careLabel: Record<AppleCarePlan, string> = {
    none: 'no coverage',
    monthly: 'AppleCare+ monthly',
    annual: 'AppleCare+ yearly',
    one: 'AppleCare One'
  };
</script>

<svelte:head>
  <title>Apple Upgrade, decoded - Martin Emde</title>
  <meta
    name="description"
    content="Four ways to buy the same iPhone, run side by side for forty-eight months. Answer the questions Apple's checkout asks, then scroll and watch the columns fill up: cash, Apple Card financing, the Klarna-backed Apple Upgrade lease, and carrier installments."
  />
</svelte:head>

<article>
  <header class="hero">
    <div class="eyebrow">// you never pay more than full price</div>
    <h1>Apple Upgrade, decoded</h1>
    <p class="lede">Pick your phone, then compare four ways to pay over four years.</p>
  </header>

  <div id="step-1"></div>
  <Step n={1} title="What are you buying?" answer={deviceKey ? money0(listPrice) : undefined}>
    <Tiles options={deviceOptions} bind:value={deviceKey} name="device" min="168px" />

    {#if deviceKey === 'custom'}
      <div class="fields one">
        <Field label="Sticker price" bind:value={listPrice} step={50} hint="Before tax." />
      </div>
    {/if}
  </Step>

  <div id="step-2"></div>
  <Step
    n={2}
    title="Do you have something to trade in?"
    locked={step < 2}
    answer={hasTradeIn === 'yes' ? money0(tradeIn) : hasTradeIn === 'no' ? 'none' : undefined}
  >
    <Tiles
      options={[
        { value: 'no', label: 'No trade-in', sub: '$0' },
        { value: 'yes', label: 'Yes, I have one', sub: 'lowers the payment' }
      ]}
      bind:value={hasTradeIn}
      name="tradein"
    />

    {#if hasTradeIn === 'yes'}
      <div class="fields one">
        <Field
          label="Trade-in credit"
          bind:value={tradeIn}
          step={25}
          hint="Apple's quoted value for your old device."
        />
      </div>
    {/if}

    {#if tradeInSurplus.length}
      <div class="aside">
        <h3>This trade-in is bigger than the lease can use</h3>
        <ul class="surplus">
          {#each tradeInSurplus as t (t.term)}
            <li>
              <strong>{t.term} months:</strong>
              {money(t.payment)}/mo, with {money(t.refund)} back as Apple credit.
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </Step>

  <div id="step-3"></div>
  <Step n={3} title="Lease length?" locked={step < 3} answer={term ? `${term} months` : undefined}>
    <Tiles options={termOptions} bind:value={term} name="term" min="230px" />
  </Step>

  <div id="step-4"></div>
  <Step
    n={4}
    title="AppleCare?"
    locked={step < 4}
    answer={appleCare ? careLabel[appleCare] : undefined}
  >
    <Tiles options={careOptions} bind:value={appleCare} name="applecare" min="170px" />

    <div class="fields">
      {#if appleCare === 'monthly'}
        <Field label="Monthly price" bind:value={appleCareMonthly} step={1} />
      {/if}
      {#if appleCare === 'one'}
        <Field
          label="Monthly price"
          bind:value={appleCareOneMonthly}
          step={1}
          hint="Already subscribed? Adding this device costs nothing — set it to 0."
        />
      {/if}
      {#if appleCare === 'annual'}
        <Field label="Yearly price" bind:value={appleCareAnnual} step={10} />
      {/if}
      <Field
        label="Screen repair without AppleCare"
        bind:value={screenRepairCost}
        step={25}
        hint="Estimate before tax; enter the repair quote for your device."
      />
      <Field
        label="Screen repair with AppleCare"
        bind:value={appleCareRepairCost}
        step={1}
        hint="Estimated service fee before tax; check your coverage."
      />
    </div>
  </Step>

  <div id="step-5"></div>
  <Step n={5} title="Tax, fees, and estimates" locked={step < 5}>
    <div class="fields">
      <Field label="Sales tax" bind:value={taxRate} unit="%" step={0.25} />
      <Field
        label="Carrier activation"
        bind:value={activationFee}
        step={5}
        hint="One-time, at signup."
      />
      <Field label="Case and glass" bind:value={caseCost} step={10} />
      <Field
        label="Card rewards at Apple"
        bind:value={appleCardBack}
        unit="%"
        step={0.5}
        hint="Apple Card pays 3%."
      />
      <Field
        label="Card rewards at Klarna"
        bind:value={klarnaCardBack}
        unit="%"
        step={0.5}
        hint="Apple Card pays 3% here too."
      />
      <Field
        label="Card rewards on the carrier bill"
        bind:value={carrierCardBack}
        unit="%"
        step={0.5}
      />
      <Field
        label="Discount rate"
        bind:value={discountRate}
        unit="%"
        step={0.5}
        hint="What your unspent cash earns."
      />
      <Field
        label="Carrier promo credits"
        bind:value={carrierCredits}
        step={50}
        hint="Total, dribbled out over 36 months."
      />
      <Field
        label="Resale at month {term ?? 24}"
        bind:value={resaleAtTerm}
        step={25}
        hint="What you could sell it for."
      />
      <Field label="Resale at month {HORIZON}" bind:value={resaleAtHorizon} step={25} />
    </div>
  </Step>

  {#if step >= 5 && term}
    <section class="ledger-section">
      <div class="head">
        <div class="eyebrow">// forty-eight months, four columns</div>
        <h2>Scroll, and watch them fill up</h2>
      </div>

      <Ledger
        bind:activeMonth
        {scenarios}
        beats={story}
        limit={ledgerLimit}
        questions={{ [term]: decisionCard }}
      />
    </section>

    {#snippet decisionCard()}
      <div class="decide">
        <div class="decide-head">
          <span class="eyebrow">// this one we do have to ask</span>
          <h3>The lease is up. Now what?</h3>
        </div>

        <Tiles options={endOptions} bind:value={endChoice} name="end" min="165px" />
      </div>
    {/snippet}

    {#if endChoice}
      <section class="compare-section">
        <div class="head">
          <div class="eyebrow">// the same four columns, totalled</div>
          <h2>What the scroll adds up to</h2>
        </div>

        <Compare {scenarios} highlight={`upgrade-${term}`} />
      </section>

      <details class="assumptions">
        <summary>Assumptions and lease terms</summary>
        <p>
          Estimates, not a quote. Tax treatment varies by state; repair and resale values are
          editable.
        </p>
        <p>
          Lease payments use 50% of the sticker for 12 months or 70% for 24, rounded to x.99.
          Payments and trade-in credit reduce the buyout. Upgrades repeat at the same device price,
          without another trade-in.
        </p>
        <p>
          Totals subtract card rewards. “Today’s dollars” applies your discount rate; net cost also
          subtracts the phone’s remaining value.
        </p>
        <p>
          A lease requires an eligible carrier and payment card. Early exit or a lost phone does not
          cancel the remaining balance. Returns require good working condition; the repair estimate
          is not a quoted return fee.
        </p>
        <p>
          Doing nothing means monthly payments continue, followed by an automatic buyout six months
          after the term ends.
        </p>
      </details>
    {/if}
  {/if}
</article>

<dialog
  bind:this={screenDialog}
  aria-labelledby="screen-title"
  aria-describedby="screen-description"
  oncancel={(event) => {
    event.preventDefault();
    chooseScreen('dismiss');
  }}
>
  <div class="eyebrow">// month 09</div>
  <h2 id="screen-title">Oh no! You cracked your screen!</h2>
  <p id="screen-description">
    Estimated repair: {money(repairPrice)} including tax,
    {appleCare === 'none' ? 'without AppleCare' : 'with AppleCare'}. Leave it cracked, and pay for
    the repair if you return or upgrade the leased phone.
  </p>
  <div class="screen-actions">
    <button type="button" onclick={() => chooseScreen('repair')}
      >Pay {money(repairPrice)} to fix it</button
    >
    <button type="button" onclick={() => chooseScreen('defer')}>Deal with it</button>
    <button type="button" onclick={() => chooseScreen('dismiss')}>No I didn’t</button>
  </div>
</dialog>

<style>
  dialog {
    margin: auto;
    width: min(480px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface);
    color: var(--text);
    padding: 26px;
    box-shadow: 0 24px 80px #0006;
  }
  dialog::backdrop {
    background: #0008;
  }
  dialog h2 {
    margin: 12px 0;
    font-size: 26px;
    line-height: 1.15;
  }
  dialog p {
    color: var(--muted);
    line-height: 1.65;
  }
  .screen-actions {
    display: grid;
    gap: 10px;
    margin-top: 22px;
  }
  .screen-actions button {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    background: var(--bg);
    color: var(--text);
  }
  .screen-actions button:first-child {
    background: var(--accent);
    color: var(--bg);
  }
  .screen-actions button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  article {
    padding-bottom: 96px;
  }

  /* Hero */
  .hero {
    padding: 80px 0 44px;
  }
  .hero .eyebrow {
    margin-bottom: 18px;
  }
  h1 {
    margin: 0 0 18px;
    max-width: 16ch;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 46px;
    line-height: 1.05;
    letter-spacing: -0.03em;
  }
  .lede {
    margin: 0 0 14px;
    max-width: 62ch;
    font-size: 17px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }
  .lede:last-child {
    margin-bottom: 0;
  }

  /* Step internals */
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 16px;
    padding-top: 18px;
  }
  .fields.one {
    max-width: 260px;
  }

  .aside {
    margin-top: 26px;
    max-width: 64ch;
    border-top: 1px solid var(--border);
    padding-top: 18px;
  }
  .aside h3 {
    margin: 0 0 8px;
    font-family: var(--font-body);
    font-weight: 580;
    font-size: 15px;
    letter-spacing: -0.01em;
  }
  .surplus {
    margin: 0 0 11px;
    max-width: 62ch;
    padding-left: 18px;
  }
  .surplus li {
    margin-bottom: 6px;
    font-size: 14.5px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }
  .surplus li::marker {
    color: var(--accent);
  }
  .surplus strong {
    color: var(--text);
    font-weight: 560;
  }

  /* Section headers shared by the lower half of the page */
  .head {
    padding: 72px 0 26px;
  }
  .head .eyebrow {
    display: block;
    margin-bottom: 14px;
  }
  .head h2 {
    margin: 0 0 14px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 32px;
    line-height: 1.12;
    letter-spacing: -0.025em;
  }

  .ledger-section {
    border-top: 1px solid var(--border);
  }

  /* End-of-term decision, rendered inline in the ledger */
  .decide {
    border: 1px solid var(--accent);
    border-radius: 14px;
    background: color-mix(in oklch, var(--accent) 7%, var(--surface));
    padding: 24px;
  }
  .decide-head {
    padding-bottom: 18px;
  }
  .decide-head h3 {
    margin: 10px 0 8px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 22px;
    letter-spacing: -0.02em;
  }
  .assumptions {
    margin-top: 32px;
    border-top: 1px solid var(--border);
    padding-top: 18px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.65;
  }
  .assumptions summary {
    cursor: pointer;
    color: var(--text);
  }
  .assumptions p {
    max-width: 68ch;
    margin: 12px 0 0;
  }

  @media (max-width: 640px) {
    .hero {
      padding-top: 56px;
    }
    h1 {
      font-size: 34px;
    }
    .lede {
      font-size: 16px;
    }
    .head {
      padding-top: 52px;
    }
    .head h2 {
      font-size: 25px;
    }
    .decide {
      padding: 18px;
    }
  }
</style>
