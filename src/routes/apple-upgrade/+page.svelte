<script lang="ts">
  import { tick } from 'svelte';
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
    money,
    money0,
    type AppleCarePlan,
    type Inputs
  } from '$lib/apple-upgrade/model';

  const STORAGE_KEY = 'apple-upgrade-calculator';

  // September 2026 lineup; iPhone 16 is not eligible for Apple Upgrade.
  // Apple’s US maximum trade-in quotes, checked 2026-09-20:
  // https://www.apple.com/shop/browse/overlay/tradein_landing/iphone_values
  // Age proxies: 17/16/15/14 of the same tier; Air uses regular 16/15/14 for older ages.
  // Duo has no older generations, so it uses the Pro Max percentages, like custom phones.
  // These estimate future offers, not private-sale proceeds or guaranteed quotes.
  const DEVICES = [
    { key: 'iphone-17', label: 'iPhone 17', price: 899, tradeIns: [585, 430, 305, 195] },
    { key: 'iphone-air', label: 'iPhone Air', price: 1099, tradeIns: [585, 430, 305, 195] },
    { key: 'iphone-18-pro', label: 'iPhone 18 Pro', price: 1199, tradeIns: [785, 510, 370, 285] },
    {
      key: 'iphone-18-pro-max',
      label: 'iPhone 18 Pro Max',
      price: 1299,
      tradeIns: [885, 610, 455, 360]
    },
    { key: 'iphone-duo', label: 'iPhone Duo', price: 1999, tradeIns: null },
    { key: 'custom', label: 'Something else', price: 0, tradeIns: null }
  ];

  /** Everything the page remembers between visits. Apple trade-in values
   * re-derive from the selected device; private-sale estimates are saved. */
  interface Saved {
    deviceKey: string | null;
    listPrice: number;
    hasTradeIn: 'no' | 'yes' | null;
    tradeIn: number;
    privateSaleValues: number[] | null;
    annualChoices: ('upgrade' | 'keep' | null)[];
    appleCare: AppleCarePlan | null;
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
    carrierOffer: number;
  }

  const DEFAULTS: Saved = {
    deviceKey: null,
    listPrice: 1199,
    hasTradeIn: null,
    tradeIn: 375,
    privateSaleValues: null,
    annualChoices: [null, null, null],
    appleCare: null,
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
    carrierOffer: 1000
  };

  // Restore at init, like the loan calculator, so the page comes back the way
  // you left it rather than flashing defaults and re-asking every question.
  function restore(): Saved {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULTS;
      const saved = JSON.parse(raw) as Partial<Saved> & {
        carrierCredits?: number;
        hasCarrierOffer?: 'no' | 'yes' | null;
      };
      if (saved.deviceKey && !DEVICES.some((device) => device.key === saved.deviceKey)) {
        // Re-ask setup and yearly decisions, while preserving the reader's cost assumptions.
        saved.deviceKey = null;
        saved.hasTradeIn = null;
        saved.appleCare = null;
        saved.annualChoices = [...DEFAULTS.annualChoices];
        saved.privateSaleValues = null;
        saved.screenChoice = null;
      }
      return {
        ...DEFAULTS,
        ...saved,
        appleCareMonthly:
          saved.appleCareMonthly ??
          (saved.deviceKey === 'iphone-duo' ? 19.99 : DEFAULTS.appleCareMonthly),
        appleCareAnnual:
          saved.appleCareAnnual ??
          (saved.deviceKey === 'iphone-duo' ? 199.99 : DEFAULTS.appleCareAnnual),
        // Old cadence and lease-ending answers described different timelines. Ask again.
        annualChoices: [0, 1, 2].map((index) => {
          const earlier = saved.annualChoices?.slice(0, index) ?? [];
          const choice =
            earlier.length === index &&
            earlier.every((value) => value === 'upgrade' || value === 'keep')
              ? saved.annualChoices?.[index]
              : null;
          return choice === 'upgrade' || choice === 'keep' ? choice : null;
        }),
        carrierOffer:
          (saved.hasCarrierOffer === 'no'
            ? (saved.tradeIn ?? DEFAULTS.tradeIn)
            : saved.carrierOffer) ??
          ((saved.carrierCredits ?? 0) > 0
            ? saved.carrierCredits! + (saved.hasTradeIn === 'yes' ? (saved.tradeIn ?? 0) : 0)
            : DEFAULTS.carrierOffer)
      };
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
  let annualChoices = $state(initial.annualChoices);
  let appleCare = $state(initial.appleCare);

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
    if (screenDialog.open) screenDialog.close();
  }
  let taxRate = $state(initial.taxRate);
  let activationFee = $state(initial.activationFee);
  let caseCost = $state(initial.caseCost);
  let appleCardBack = $state(initial.appleCardBack);
  let klarnaCardBack = $state(initial.klarnaCardBack);
  let carrierCardBack = $state(initial.carrierCardBack);
  let discountRate = $state(initial.discountRate);
  let carrierOffer = $state(initial.carrierOffer);
  const tradeInRates = $derived.by(() => {
    const device =
      DEVICES.find((device) => device.key === deviceKey && device.tradeIns !== null) ??
      DEVICES.find((device) => device.key === 'iphone-18-pro-max')!;
    return device.tradeIns!.map((value) => value / device.price);
  });
  let upgradeTradeIns = $derived(tradeInRates.map((rate) => Math.round(listPrice * rate)));
  let privateSaleValues = $state(initial.privateSaleValues);
  let previousDevice = initial.deviceKey;

  let scrollY = $state(0);
  let pageTitle: HTMLHeadingElement;
  const atTop = $derived(scrollY <= 8);

  async function navigateOrReset() {
    if (!atTop) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
      return;
    }

    if (screenDialog.open) screenDialog.close();
    activeMonth = -1;
    seen = -1;
    deviceKey = DEFAULTS.deviceKey;
    listPrice = DEFAULTS.listPrice;
    hasTradeIn = DEFAULTS.hasTradeIn;
    tradeIn = DEFAULTS.tradeIn;
    annualChoices = [...DEFAULTS.annualChoices];
    appleCare = DEFAULTS.appleCare;
    appleCareMonthly = DEFAULTS.appleCareMonthly;
    appleCareOneMonthly = DEFAULTS.appleCareOneMonthly;
    appleCareAnnual = DEFAULTS.appleCareAnnual;
    screenChoice = DEFAULTS.screenChoice;
    screenRepairCost = DEFAULTS.screenRepairCost;
    appleCareRepairCost = DEFAULTS.appleCareRepairCost;
    taxRate = DEFAULTS.taxRate;
    activationFee = DEFAULTS.activationFee;
    caseCost = DEFAULTS.caseCost;
    appleCardBack = DEFAULTS.appleCardBack;
    klarnaCardBack = DEFAULTS.klarnaCardBack;
    carrierCardBack = DEFAULTS.carrierCardBack;
    discountRate = DEFAULTS.discountRate;
    carrierOffer = DEFAULTS.carrierOffer;
    privateSaleValues = null;
    await tick();
    pageTitle.focus({ preventScroll: true });
  }

  $effect(() => {
    const saved: Saved = {
      deviceKey,
      listPrice,
      hasTradeIn,
      tradeIn,
      privateSaleValues,
      annualChoices,
      appleCare,
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
      carrierOffer
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  });

  // ---- Step gating --------------------------------------------------------
  const tradeInAnswered = $derived(hasTradeIn !== null);
  const step = $derived(!deviceKey ? 1 : !tradeInAnswered ? 2 : appleCare === null ? 3 : 4);

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
    if (key !== previousDevice) {
      privateSaleValues = null;
      appleCareMonthly = key === 'iphone-duo' ? 19.99 : DEFAULTS.appleCareMonthly;
      appleCareAnnual = key === 'iphone-duo' ? 199.99 : DEFAULTS.appleCareAnnual;
    }
    previousDevice = key;
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
    term: 12,
    endChoice: 'nothing',
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
    resaleAtTerm: upgradeTradeIns[1],
    resaleAtHorizon: upgradeTradeIns[3],
    privateSaleValues: privateSaleValues ?? undefined,
    upgradeTradeIns,
    carrierOffer: hasTradeIn === 'yes' ? carrierOffer : null,
    upgradeMonths: annualChoices.flatMap((choice, index) =>
      choice === 'upgrade' ? [(index + 1) * 12] : []
    ),
    carrierTerm: 36
  });

  const repairPrice = $derived(screenRepairPrice(inputs));
  const scenarios = $derived(allScenarios(inputs));
  const story = $derived(beats(inputs));

  /** How far down the ledger the reader is allowed before answering. */
  const unansweredYear = $derived(annualChoices.findIndex((choice) => choice === null));
  const ledgerLimit = $derived(unansweredYear < 0 ? HORIZON : (unansweredYear + 1) * 12);

  function chooseYear(index: number, choice: 'upgrade' | 'keep') {
    if (annualChoices[index] === choice) return;
    annualChoices = annualChoices.map((old, i) => (i < index ? old : i === index ? choice : null));
  }

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

<svelte:window bind:scrollY />

<button class="page-control" type="button" onclick={navigateOrReset}>
  {atTop ? 'Start over' : 'Jump to top'}
</button>

<article>
  <header class="hero">
    <div class="eyebrow">// you never pay more than full price</div>
    <h1 bind:this={pageTitle} tabindex="-1">Apple Upgrade, decoded</h1>
    <p class="lede">
      Pick your phone, then decide each year whether to upgrade. Compare cash, financing, both lease
      terms, and a carrier plan on the same timeline.
    </p>
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
      <div class="fields">
        <Field
          label="Apple Trade-in offer"
          bind:value={tradeIn}
          step={25}
          hint="Apple's quoted value for your old device."
        />
        <Field
          label="Carrier Trade-in offer"
          bind:value={carrierOffer}
          step={50}
          hint="The whole offer, including your trade-in. Capped at the phone price; paid over 36 months."
        />
      </div>
    {/if}
  </Step>

  <div id="step-3"></div>
  <Step
    n={3}
    title="AppleCare?"
    locked={step < 3}
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

  <div id="step-4"></div>
  {#if step >= 4}
    <details class="fine-tuning">
      <summary>Nitpicky stuff if you want to account for every penny</summary>
      <h3>Rates</h3>
      <div class="fields">
        <Field label="Sales tax" bind:value={taxRate} unit="%" step={0.25} />
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
          hint="Apple Card works and pays 3% Daily Cash. Klarna does not accept American Express, UnionPay, cards issued by Chase or Capital One, Apple Pay, or PayPal. Debit cards work. Check your card before counting on rewards."
        />
        <Field
          label="Card rewards on the carrier bill"
          bind:value={carrierCardBack}
          unit="%"
          step={0.5}
        />
      </div>
      <h3>Expenses</h3>
      <p>These costs repeat each time you get a new phone.</p>
      <div class="fields">
        <Field label="Carrier activation fee" bind:value={activationFee} step={5} />
        <Field label="Case &amp; accessories" bind:value={caseCost} step={10} />
      </div>
      <h3>Apple trade-in estimates</h3>
      <p>
        These fields start with percentages of the phone’s price, based on
        <a href="https://www.apple.com/shop/browse/overlay/tradein_landing/iphone_values"
          >Apple’s trade-in values</a
        > checked September 20, 2026. Adjust them to your expected offer. Duo and custom phones start
        with the Pro Max percentages; Duo has no trade-in history of its own. Older Air estimates use
        regular iPhones. The same estimates set your final phone’s value. Choose private sale below if
        you plan to sell it yourself.
      </p>
      <div class="fields">
        {#each [1, 2, 3, 4] as age, index (age)}
          <Field
            label={`Apple trade-in after ${age} ${age === 1 ? 'year' : 'years'}`}
            bind:value={
              () => upgradeTradeIns[index],
              (value: number) =>
                (upgradeTradeIns = upgradeTradeIns.map((current, i) =>
                  i === index ? value : current
                ))
            }
            hint={`Default: about ${Math.round(tradeInRates[index] * 100)}% of the phone’s price.`}
            step={25}
          />
        {/each}
      </div>
      <label class="private-sale-choice">
        <input
          type="checkbox"
          checked={privateSaleValues !== null}
          onchange={(event) =>
            (privateSaleValues = event.currentTarget.checked ? [...upgradeTradeIns] : null)}
        />
        I’ll sell owned phones privately instead
      </label>
      {#if privateSaleValues !== null}
        <p>
          Enter what you expect to receive after selling fees and shipping. At each upgrade, private
          sale proceeds appear on their own line instead of a trade-in credit. Eligible leases are
          still returned; a phone bought out early can be sold. Selling privately means no new
          carrier trade-in promotion.
        </p>
        <div class="fields">
          {#each [1, 2, 3, 4] as age, index (age)}
            <Field
              label={`Private sale after ${age} ${age === 1 ? 'year' : 'years'}`}
              bind:value={privateSaleValues[index]}
              step={25}
            />
          {/each}
        </div>
      {/if}
      <h3>Estimates</h3>
      <div class="fields">
        <Field
          label="Discount rate"
          bind:value={discountRate}
          unit="%"
          step={0.5}
          hint="What your unspent cash earns."
        />
      </div>
    </details>
  {/if}

  {#if step >= 4}
    <section class="ledger-section">
      <div class="head">
        <div class="eyebrow">// forty-eight months, five columns</div>
        <h2>Scroll, and watch them fill up</h2>
      </div>

      <Ledger
        bind:activeMonth
        {scenarios}
        upgradeSummary={inputs.upgradeMonths!.length > 0
          ? `upgrades in ${inputs.upgradeMonths!.length === 1 ? 'year' : 'years'} ${inputs.upgradeMonths!.map((month) => month / 12).join(', ')}`
          : unansweredYear < 0
            ? 'keeping the original phone'
            : 'deciding each year'}
        beats={story}
        limit={ledgerLimit}
        questions={screenChoice !== null
          ? { 12: yearOne, 24: yearTwo, 36: yearThree, [SCREEN_CRACK_MONTH]: screenCard }
          : { 12: yearOne, 24: yearTwo, 36: yearThree }}
      />
    </section>

    {#snippet screenCard()}
      <section class="screen-card" aria-labelledby="screen-inline-title">
        {@render screenPrompt('screen-inline')}
      </section>
    {/snippet}

    {#snippet yearOne()}{@render annualDecision(0)}{/snippet}
    {#snippet yearTwo()}{@render annualDecision(1)}{/snippet}
    {#snippet yearThree()}{@render annualDecision(2)}{/snippet}

    {#snippet annualDecision(index: number)}
      <section class="decide" aria-labelledby="year-{index + 1}-title">
        <div class="decide-head">
          <span class="eyebrow">// year {index + 1} · every payment path</span>
          <h3 id="year-{index + 1}-title">New phones are out. Upgrade or keep this phone?</h3>
          <p>The same decision applies to cash, financing, both leases, and the carrier.</p>
        </div>
        <div class="screen-actions">
          <button
            type="button"
            aria-pressed={annualChoices[index] === 'upgrade'}
            onclick={() => chooseYear(index, 'upgrade')}>Upgrade</button
          >
          <button
            type="button"
            aria-pressed={annualChoices[index] === 'keep'}
            onclick={() => chooseYear(index, 'keep')}>Keep this phone</button
          >
        </div>
        <p>
          Keep it and the lease continues at its full payment after the term ends, with an automatic
          buyout six months later. Upgrade before a lease ends and the remaining buyout is paid
          before trading it in.
        </p>
      </section>
    {/snippet}

    {#if unansweredYear < 0}
      <section class="compare-section">
        <div class="head">
          <div class="eyebrow">// the same five columns, totalled</div>
          <h2>What the scroll adds up to</h2>
        </div>

        <Compare {scenarios} privateSale={privateSaleValues !== null} />
      </section>

      <details class="assumptions">
        <summary>Assumptions and lease terms</summary>
        <p>
          Estimates, not a quote. Tax treatment varies by state. Private-sale proceeds are your own
          estimates after fees and shipping.
        </p>
        <p>
          Lease payments use 50% of the sticker for 12 months or 70% for 24, rounded to x.99.
          Payments and trade-in credit reduce the buyout. Future phones keep the same price.
          Returning a leased phone settles the lease without a trade-in credit; owned phones use
          Apple’s age-based trade-in values unless you choose a private sale.
        </p>
        <p>
          The September 2026 iPhone 18 Pro at $1,199 gives $49.99 over 12 months and $34.99 over 24;
          the $1,999 iPhone Duo gives $57.99 over 24. These match
          <a href="https://www.apple.com/shop/apple-upgrade">Apple’s examples</a>. This calculator
          is iPhone-only: Watch, iPad and Mac leases use different payment shares.
        </p>
        <p>
          <a href="https://www.apple.com/applecare/">AppleCare One Family</a> is $49.99 a month for every
          eligible device across up to six people, with no device cap and up to six theft-and-loss claims
          a year. Choose AppleCare One and enter the extra monthly cost for this phone: $0 if your household
          already subscribes, or $49.99 if you are adding the whole plan for it.
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
          Every path replaces the phone only in years when you choose to upgrade. Old Apple Card
          installments continue after trade-in; tax is paid upfront. Early lease upgrades pay the
          remaining buyout before trading or privately selling the owned phone. Keeping a phone
          leaves it on its existing payment schedule.
        </p>
        <p>
          The carrier offer replaces the regular trade-in value and repeats on each eligible
          replacement as an estimate. This models a 36-month deal with payoff and lost credits on
          early upgrade, without paid early-upgrade add-ons. Future offers are not guaranteed.
        </p>
        <p>
          Assumes upfront tax is paid in full without interest. Card rewards remain spread across
          the modeled payments; Apple Card actually awards Daily Cash upfront.
        </p>
        <p>
          <a href="https://support.apple.com/en-us/104950">Apple Card terms</a> ·
          <a href="https://www.verizon.com/support/device-payment-faqs/"
            >Carrier payoff and credits</a
          >
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
  class="screen-card"
  bind:this={screenDialog}
  aria-labelledby="screen-title"
  aria-describedby="screen-description"
  oncancel={(event) => {
    event.preventDefault();
    chooseScreen('dismiss');
  }}
>
  {@render screenPrompt('screen')}
</dialog>

{#snippet screenPrompt(id: string)}
  <div class="eyebrow">// month 09</div>
  <h2 id="{id}-title">Oh no! You cracked your screen!</h2>
  <p id="{id}-description">
    Estimated repair: {money(repairPrice)} including tax,
    {appleCare === 'none' ? 'without AppleCare' : 'with AppleCare'}. Leave it cracked, and pay for
    the repair if you return the leased phone. Trade in an unrepaired phone instead, and its
    estimated credit drops by {money(Math.max(0, screenRepairCost))}, down to $0. This uses the full
    glass repair estimate, including for carrier offers, rather than the AppleCare service fee.
  </p>
  <div class="screen-actions">
    <button
      type="button"
      aria-pressed={screenChoice === 'repair'}
      onclick={() => chooseScreen('repair')}>Pay {money(repairPrice)} to fix it</button
    >
    <button
      type="button"
      aria-pressed={screenChoice === 'defer'}
      onclick={() => chooseScreen('defer')}>Deal with it</button
    >
    <button
      type="button"
      aria-pressed={screenChoice === 'dismiss'}
      onclick={() => chooseScreen('dismiss')}>No I didn’t</button
    >
  </div>
{/snippet}

<style>
  .page-control {
    position: fixed;
    right: max(16px, env(safe-area-inset-right));
    bottom: max(16px, env(safe-area-inset-bottom));
    z-index: 21;
    min-height: 48px;
    min-width: 132px;
    padding: 12px 18px;
    border: 1px solid var(--accent);
    border-radius: 12px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 4px 20px #0003;
  }
  .page-control:hover {
    background: var(--surface2, var(--bg));
  }
  .page-control:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  .screen-card {
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface);
    color: var(--text);
    padding: 26px;
  }
  dialog {
    margin: auto;
    width: min(480px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    overflow: auto;
    box-shadow: 0 24px 80px #0006;
  }
  dialog::backdrop {
    background: #0008;
  }
  .screen-card h2 {
    margin: 12px 0;
    font-size: 26px;
    line-height: 1.15;
  }
  .screen-card p {
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
  .screen-actions button[aria-pressed='true'],
  dialog .screen-actions button:first-child {
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
  .fine-tuning {
    border-top: 1px solid var(--border);
    padding: 18px 0;
  }
  .fine-tuning summary {
    padding: 14px 0;
    min-height: 48px;
    cursor: pointer;
    font-weight: 520;
    color: var(--text);
  }
  .fine-tuning summary:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
    border-radius: 4px;
  }
  .fine-tuning h3 {
    margin: 18px 0 12px;
    font-size: 17px;
    font-weight: 520;
    color: var(--text);
  }
  .fine-tuning .fields {
    padding: 4px 0 20px;
  }
  .fine-tuning p {
    margin: 0 0 14px;
    color: var(--muted);
    font-size: 13px;
  }
  .fields.one {
    max-width: 260px;
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
