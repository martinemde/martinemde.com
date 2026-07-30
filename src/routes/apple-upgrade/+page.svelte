<script lang="ts">
  import { resolve } from '$app/paths';
  import { ChevronUp } from 'lucide-svelte';
  import NumberField from '$lib/components/NumberField.svelte';
  import {
    APPLECARE_ONE_MONTHLY,
    CARE_PRICING,
    CATEGORY_LABELS,
    CATEGORY_TERMS,
    DEFAULT_DAMAGE_FEE,
    DEFAULT_RESALE_PCT,
    DEVICES,
    FINANCE_MONTHS,
    devicesInCategory,
    findDevice,
    type Category,
    type Term
  } from '$lib/data/apple-upgrade';
  import {
    basePayment,
    CARE_CHOICES,
    compare,
    effectiveBasePayment,
    financeInstallment,
    formatUsd,
    formatUsd0,
    leasePayment,
    purchaseOptionFee,
    remainingLeaseObligation,
    resaleValue,
    type Assumptions,
    type CareChoice,
    type Fork
  } from '$lib/utils/apple-upgrade';

  const STORAGE_KEY = 'apple-upgrade-calculator';

  interface Saved {
    categoryTab: Category;
    deviceId: string;
    configIndex: number;
    priceOverride: number | null;
    paymentOverride: number | null;
    hasTradeIn: boolean | null;
    tradeInValue: number | null;
    termChoice: Term | null;
    careChoice: CareChoice | null;
    forkChoice: Fork | null;
    taxRateInput: number | null;
    taxLeasePayments: boolean;
    discountRateInput: number | null;
    cashBackInput: number | null;
    activationInput: number | null;
    caseInput: number | null;
    postpaidInput: number | null;
    resaleInput: number | null;
    damageFeeInput: number | null;
    damageLikelihoodInput: number | null;
    careMonthlyInput: number | null;
    careAnnualInput: number | null;
    careOneInput: number | null;
    careDeductibleInput: number | null;
    purchaseCreditHonored: boolean;
    financeMonthsInput: number | null;
    financeTaxUpfront: boolean;
    carrierMonthsInput: number | null;
    carrierDownInput: number | null;
    carrierCreditInput: number | null;
    carrierTaxUpfront: boolean;
    exitMonthInput: number | null;
  }

  /** Read before any state is initialized, so nothing overwrites it. */
  function loadSaved(): Partial<Saved> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Partial<Saved>;
      // A catalog entry that no longer exists would break every derivation.
      if (parsed.deviceId && !findDevice(parsed.deviceId)) return {};
      // Choices saved before an option was renamed would restore as a selection
      // no card matches.
      if (parsed.careChoice && !CARE_CHOICES.includes(parsed.careChoice)) parsed.careChoice = null;
      return parsed;
    } catch {
      return {};
    }
  }

  const saved = loadSaved();

  // ── Choices ────────────────────────────────────────────────────────────────
  let categoryTab = $state<Category>(saved.categoryTab ?? 'iphone');
  let deviceId = $state(saved.deviceId ?? 'iphone-17-pro-max');
  let configIndex = $state(saved.configIndex ?? 0);
  let priceOverride = $state<number | null>(saved.priceOverride ?? null);
  let paymentOverride = $state<number | null>(saved.paymentOverride ?? null);

  let hasTradeIn = $state<boolean | null>(saved.hasTradeIn ?? null);
  let tradeInValue = $state<number | null>(saved.tradeInValue ?? null);

  let termChoice = $state<Term | null>(saved.termChoice ?? null);
  let careChoice = $state<CareChoice | null>(saved.careChoice ?? null);
  let forkChoice = $state<Fork | null>(saved.forkChoice ?? null);

  // ── Assumptions, all nullable so the placeholder can show the default ──────
  let taxRateInput = $state<number | null>(saved.taxRateInput ?? null);
  let taxLeasePayments = $state(saved.taxLeasePayments ?? true);
  let discountRateInput = $state<number | null>(saved.discountRateInput ?? null);
  let cashBackInput = $state<number | null>(saved.cashBackInput ?? null);
  let activationInput = $state<number | null>(saved.activationInput ?? null);
  let caseInput = $state<number | null>(saved.caseInput ?? null);
  let postpaidInput = $state<number | null>(saved.postpaidInput ?? null);
  let resaleInput = $state<number | null>(saved.resaleInput ?? null);
  let damageFeeInput = $state<number | null>(saved.damageFeeInput ?? null);
  let damageLikelihoodInput = $state<number | null>(saved.damageLikelihoodInput ?? null);
  let careMonthlyInput = $state<number | null>(saved.careMonthlyInput ?? null);
  let careAnnualInput = $state<number | null>(saved.careAnnualInput ?? null);
  let careOneInput = $state<number | null>(saved.careOneInput ?? null);
  let careDeductibleInput = $state<number | null>(saved.careDeductibleInput ?? null);
  let purchaseCreditHonored = $state(saved.purchaseCreditHonored ?? false);
  let financeMonthsInput = $state<number | null>(saved.financeMonthsInput ?? null);
  let financeTaxUpfront = $state(saved.financeTaxUpfront ?? true);
  let carrierMonthsInput = $state<number | null>(saved.carrierMonthsInput ?? null);
  let carrierDownInput = $state<number | null>(saved.carrierDownInput ?? null);
  let carrierCreditInput = $state<number | null>(saved.carrierCreditInput ?? null);
  let carrierTaxUpfront = $state(saved.carrierTaxUpfront ?? true);

  let exitMonthInput = $state<number | null>(saved.exitMonthInput ?? null);

  // ── Derived selection ──────────────────────────────────────────────────────
  const device = $derived(findDevice(deviceId) ?? DEVICES[0]);
  const category = $derived(device.category);
  const config = $derived(device.configs[Math.min(configIndex, device.configs.length - 1)]);
  const catalogPrice = $derived(config.price);
  const price = $derived(priceOverride ?? catalogPrice);
  const terms = $derived(CATEGORY_TERMS[category]);
  const term = $derived<Term>(
    termChoice && terms.includes(termChoice) ? termChoice : terms[terms.length - 1]
  );
  const care = $derived<CareChoice>(careChoice ?? 'none');
  const fork = $derived<Fork>(forkChoice ?? 'upgrade');
  const tradeIn = $derived(hasTradeIn ? (tradeInValue ?? 0) : 0);

  /**
   * Apple's published payment for the selected configuration, when we have one.
   * A hand-edited price means the catalog quote no longer describes this device,
   * so it falls back to the estimate.
   */
  function quoteFor(t: Term): number | null {
    if (priceOverride !== null) return null;
    return config.quoted?.[t] ?? null;
  }
  const quotedPayment = $derived(quoteFor(term));

  const financeMonths = $derived(financeMonthsInput ?? FINANCE_MONTHS[category]);
  const financeMonthly = $derived(financeInstallment(Math.max(0, price - tradeIn), financeMonths));
  /** The advertised figure, before any trade-in is netted off the price. */
  const financeMonthlyListed = $derived(financeInstallment(price, financeMonths));

  const carrierMonths = $derived(carrierMonthsInput ?? 36);
  /**
   * Carriers spread a trade-in across the installment plan as bill credits, the
   * same way Klarna spreads it across lease payments. Defaulting this to zero
   * while the lease got the credit would rig the comparison.
   */
  const carrierCreditDefault = $derived(carrierMonths > 0 ? tradeIn / carrierMonths : 0);

  const assumptions = $derived<Assumptions>({
    category,
    price,
    term,
    paymentOverride,
    quotedPayment,
    tradeIn,
    fork,
    care,
    careMonthly: careMonthlyInput ?? CARE_PRICING[category].monthly,
    careAnnual: careAnnualInput ?? CARE_PRICING[category].annual,
    careOneMonthly: careOneInput ?? APPLECARE_ONE_MONTHLY,
    careDeductible: careDeductibleInput ?? CARE_PRICING[category].deductible,
    taxRate: taxRateInput ?? 8.5,
    taxLeasePayments,
    discountRate: discountRateInput ?? 7,
    cashBackPct: cashBackInput ?? 3,
    activationFee: activationInput ?? (category === 'iphone' ? 35 : 0),
    caseCost: caseInput ?? 60,
    postpaidPremium: postpaidInput ?? 0,
    resalePct: (resaleInput ?? DEFAULT_RESALE_PCT[category] * 100) / 100,
    damageFee: damageFeeInput ?? DEFAULT_DAMAGE_FEE[category],
    damageLikelihood: damageLikelihoodInput ?? 20,
    purchaseCreditHonored,
    financeMonths,
    financeTaxUpfront,
    carrierMonths,
    carrierDownPayment: carrierDownInput ?? 0,
    carrierBillCredit: carrierCreditInput ?? carrierCreditDefault,
    carrierTaxUpfront
  });

  const comparison = $derived(compare(assumptions));
  const horizon = $derived(comparison.horizon);
  const monthly = $derived(leasePayment(assumptions));
  const undiscountedMonthly = $derived(effectiveBasePayment(assumptions));
  const leaseTotalFirstTerm = $derived(monthly * term);
  const leaseSharePct = $derived(price > 0 ? (undiscountedMonthly * term * 100) / price : 0);

  /** Walking away at term's end ends coverage with the device; everything else keeps it. */
  const careCoverageMonths = $derived(fork === 'walk' ? term : horizon);
  const careYears = $derived(Math.ceil(careCoverageMonths / 12));

  /** What a plan bills over the months it would cover, for the is-it-worth-it math. */
  function careCostOver(choice: CareChoice): number {
    if (choice === 'monthly') return assumptions.careMonthly * careCoverageMonths;
    if (choice === 'annual') return assumptions.careAnnual * careYears;
    if (choice === 'one') return assumptions.careOneMonthly * careCoverageMonths;
    return 0;
  }
  /** With no plan picked yet, monthly AppleCare+ is the thing worth pricing against. */
  const careCostToCompare = $derived(careCostOver(care === 'none' ? 'monthly' : care));
  /** What coverage saves on one incident: the repair you skip, less the deductible. */
  const damageSaved = $derived(Math.max(0, assumptions.damageFee - assumptions.careDeductible));
  /** The two sides of the coverage question, blended by the odds you set. */
  const damageOdds = $derived(assumptions.damageLikelihood / 100);
  const repairsUncovered = $derived(assumptions.damageFee * damageOdds);
  const repairsCovered = $derived(careCostToCompare + assumptions.careDeductible * damageOdds);
  /**
   * Incidents over the coverage window needed for the premiums to pay for
   * themselves. Null when a covered repair costs as much as an uncovered one.
   */
  const careBreakEven = $derived(damageSaved > 0 ? careCostToCompare / damageSaved : null);

  /** The resale estimate the buy-versus-return decision turns on. */
  const resalePctAtTerm = $derived(resaleInput ?? DEFAULT_RESALE_PCT[category] * 100);
  const resaleAtTerm = $derived(resaleValue(assumptions, term));
  const resaleAtHorizon = $derived(resaleValue(assumptions, horizon));

  /** Each fork priced out, so the decision cards can show real numbers. */
  const forkOutcomes = $derived(
    (['upgrade', 'buy', 'extend', 'walk'] as Fork[]).map((f) => ({
      fork: f,
      result: compare({ ...assumptions, fork: f })
    }))
  );

  // ── Progressive reveal, checkout-style ─────────────────────────────────────
  const showTradeIn = $derived(termChoice !== null);
  const showCare = $derived(showTradeIn && hasTradeIn !== null);
  const showDetails = $derived(showCare && careChoice !== null);
  const showTimeline = $derived(showDetails);
  const showCycle2 = $derived(showTimeline && forkChoice !== null);

  // ── Timeline ───────────────────────────────────────────────────────────────
  interface TimelineRow {
    month: number;
    label: string;
    events: { label: string; amount: number }[];
    net: number;
    cumulative: number;
    cumulativeNpv: number;
    /** What Klarna would charge to buy the device outright this month, if leased. */
    buyout: number | null;
    milestone: boolean;
  }

  function buyoutAt(month: number): number | null {
    if (month <= term) return purchaseOptionFee(assumptions, month);
    if (fork === 'upgrade') {
      // The old device went back; this is the second lease's buyout.
      return purchaseOptionFee({ ...assumptions, tradeIn: 0 }, Math.min(month - term, term));
    }
    if (fork === 'extend' && month <= term + 6) {
      return Math.max(
        0,
        purchaseOptionFee(assumptions, term) - undiscountedMonthly * (month - term)
      );
    }
    return null;
  }

  const timeline = $derived<TimelineRow[]>(
    comparison.lease.months.map((row) => ({
      month: row.month,
      label: row.month === 0 ? 'Today' : `Month ${row.month}`,
      events: row.flows.map((f) => ({ label: f.label, amount: f.amount })),
      net: row.net,
      cumulative: row.cumulative,
      cumulativeNpv: row.cumulativeNpv,
      buyout: buyoutAt(row.month),
      milestone: row.month === 0 || row.month === term || row.month === horizon
    }))
  );

  const cycle1 = $derived(timeline.filter((r) => r.month <= term));
  const cycle2 = $derived(timeline.filter((r) => r.month > term));

  /** The three scenarios stacked against the lease, in presentation order. */
  const alternatives = $derived([comparison.finance, comparison.cash, comparison.carrier]);

  /**
   * Mobile collapses the rail to a single tappable line; desktop always shows
   * everything regardless of this state, so a toggle there is a harmless no-op.
   */
  let railExpanded = $state(false);

  // Keep aria-expanded honest on desktop, where the body is never hidden.
  $effect(() => {
    if (window.matchMedia('(min-width: 901px)').matches) railExpanded = true;
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  function pickCategory(next: Category) {
    categoryTab = next;
    const first = devicesInCategory(next)[0];
    if (first) {
      deviceId = first.id;
      configIndex = 0;
    }
    priceOverride = null;
    paymentOverride = null;
    termChoice = null;
    resaleInput = null;
    damageFeeInput = null;
    careMonthlyInput = null;
    careAnnualInput = null;
    careDeductibleInput = null;
  }

  function pickDevice(id: string) {
    deviceId = id;
    configIndex = 0;
    priceOverride = null;
    paymentOverride = null;
  }

  function pickConfig(index: number) {
    configIndex = index;
    priceOverride = null;
    paymentOverride = null;
  }

  const CARE_OPTIONS: { value: CareChoice; name: string; detail: string }[] = $derived([
    {
      value: 'none',
      name: 'No AppleCare',
      detail: 'One year of warranty. You carry the damage risk.'
    },
    {
      value: 'monthly',
      name: 'AppleCare+ monthly',
      detail: `${formatUsd(assumptions.careMonthly)}/mo, cancel anytime`
    },
    {
      value: 'annual',
      name: 'AppleCare+ annual',
      detail: `${formatUsd0(assumptions.careAnnual)}/yr, billed a year at a time — ${careYears} ${
        careYears === 1 ? 'charge' : 'charges'
      } over ${careCoverageMonths} months`
    },
    {
      value: 'one',
      name: 'AppleCare One',
      detail: `${formatUsd(assumptions.careOneMonthly)}/mo for up to three devices`
    }
  ]);

  const FORK_OPTIONS: { value: Fork; name: string; detail: string }[] = [
    {
      value: 'upgrade',
      name: 'Upgrade',
      detail: 'Hand it back, sign a new lease on a new device. No trade-in allowed this time.'
    },
    {
      value: 'buy',
      name: 'Buy it outright',
      detail: 'Pay the purchase option fee through Klarna and keep the device.'
    },
    {
      value: 'extend',
      name: 'Do nothing',
      detail: 'Six month-to-month payments at the full rate, then Klarna charges the buyout anyway.'
    },
    {
      value: 'walk',
      name: 'Return and leave',
      detail: 'Give it back, owe nothing more, own nothing. You need another phone from somewhere.'
    }
  ];

  const forkLabel = $derived(FORK_OPTIONS.find((o) => o.value === fork)?.name ?? '');

  $effect(() => {
    const state: Saved = {
      categoryTab,
      deviceId,
      configIndex,
      priceOverride,
      paymentOverride,
      hasTradeIn,
      tradeInValue,
      termChoice,
      careChoice,
      forkChoice,
      taxRateInput,
      taxLeasePayments,
      discountRateInput,
      cashBackInput,
      activationInput,
      caseInput,
      postpaidInput,
      resaleInput,
      damageFeeInput,
      damageLikelihoodInput,
      careMonthlyInput,
      careAnnualInput,
      careOneInput,
      careDeductibleInput,
      purchaseCreditHonored,
      financeMonthsInput,
      financeTaxUpfront,
      carrierMonthsInput,
      carrierDownInput,
      carrierCreditInput,
      carrierTaxUpfront,
      exitMonthInput
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private browsing or a full quota — the calculator still works.
    }
  });

  function reset() {
    hasTradeIn = null;
    tradeInValue = null;
    termChoice = null;
    careChoice = null;
    forkChoice = null;
    priceOverride = null;
    paymentOverride = null;
  }

  const exitMonth = $derived(Math.min(Math.max(exitMonthInput ?? Math.round(term / 2), 1), term));
  const exitPaid = $derived(monthly * exitMonth);
  const exitRemaining = $derived(remainingLeaseObligation(assumptions, exitMonth));
  const exitBuyout = $derived(purchaseOptionFee(assumptions, exitMonth));
</script>

<svelte:head>
  <title>Apple Upgrade, Priced Out - Martin Emde</title>
  <meta
    name="description"
    content="A step-by-step calculator for Apple's new lease program. Walk the whole lease month by month, pick what you do at the end, and see the total in today's dollars against buying outright or financing with a carrier."
  />
</svelte:head>

<section class="head">
  <div class="eyebrow">// Apple Upgrade lease calculator and comparison</div>
  <h1 class="page-title">Apple Upgrade, Priced Out</h1>
  <p class="page-lede">
    Apple Upgrade is a lease, unlike previous 0% financing or carrier payment plans. You hand the
    device back at the end or pay the remainder of the original price. I've broken down the math,
    using Apple's published information to help you make the best decision for your finances. Since
    the full impact of this lease is not noticable until after the lease term, I've chosen to model
    the purchase over twice the term of the lease.
  </p>
  <p class="page-note">
    <a href={resolve('/projects')}>&larr; projects</a>
  </p>
</section>

<div class="layout">
  <div class="flow">
    <!-- 01 ─────────────────────────────────────────────────────────────────── -->
    <section class="step">
      <div class="step-head">
        <span class="step-num">01</span>
        <h2 class="step-title">Pick the device</h2>
        <span class="rule"></span>
      </div>
      <p class="step-copy">
        Apple Upgrade covers most iPhones, the Series 11 and Ultra watches, iPad Pro, Air and mini,
        and most of the Mac line. Prices are prefilled from the current lineup and editable. Enter
        the real price on apple.com if there's any discrepency.
      </p>

      <div class="tabs" role="tablist" aria-label="Product family">
        {#each Object.entries(CATEGORY_LABELS) as [key, label] (key)}
          <button
            type="button"
            role="tab"
            class="tab"
            aria-selected={categoryTab === key}
            onclick={() => pickCategory(key as Category)}
          >
            {label}
          </button>
        {/each}
      </div>

      <div class="choices choices-wide">
        {#each devicesInCategory(categoryTab) as d (d.id)}
          <button
            type="button"
            class="choice"
            aria-pressed={deviceId === d.id}
            onclick={() => pickDevice(d.id)}
          >
            <span class="choice-name">{d.name}</span>
            <span class="choice-detail">from {formatUsd0(d.configs[0].price)}</span>
          </button>
        {/each}
      </div>

      <div class="chips">
        {#each device.configs as c, i (c.label)}
          <button
            type="button"
            class="chip"
            aria-pressed={configIndex === i}
            onclick={() => pickConfig(i)}
          >
            {c.label} &middot; {formatUsd0(c.price)}
          </button>
        {/each}
      </div>

      <div class="fields">
        <NumberField
          label="List price"
          bind:value={priceOverride}
          placeholder={catalogPrice}
          prefix="$"
          step={10}
          hint="Override if the catalog is stale or you configured something custom."
        />
      </div>
    </section>

    <!-- 02 ─────────────────────────────────────────────────────────────────── -->
    <section class="step">
      <div class="step-head">
        <span class="step-num">02</span>
        <h2 class="step-title">How long?</h2>
        <span class="rule"></span>
      </div>
      <p class="step-copy">
        Shorter terms cost more per month but less in total, because you're renting the steepest
        part of the depreciation curve for less time.
      </p>

      <div class="choices">
        {#each terms as t (t)}
          {@const quote = quoteFor(t)}
          {@const base = quote ?? basePayment(price, category, t)}
          <button
            type="button"
            class="choice"
            aria-pressed={termChoice === t}
            onclick={() => (termChoice = t)}
          >
            <span class="choice-name">{t} months</span>
            <span class="choice-figure">
              {formatUsd(Math.max(0, base - tradeIn / t))}<span class="per">/mo</span>
            </span>
            <span class="choice-detail">
              {formatUsd0(base * t)} in payments &middot; {((base * t * 100) / price).toFixed(0)}%
              of the device{quote === null ? ' · estimated' : ''}
            </span>
          </button>
        {/each}
      </div>

      <div class="callout">
        <p>
          {#if quotedPayment !== null}
            Apple publishes <strong>{formatUsd(quotedPayment)}/mo</strong> for this
            {device.name} on the {term}-month term, which comes to
            {leaseSharePct.toFixed(1)}% of the {formatUsd0(price)} device over the term.
          {:else}
            No published payment exists for this configuration, so this is an estimate:
            <strong>{formatUsd(undiscountedMonthly)}/mo</strong>, or
            {leaseSharePct.toFixed(1)}% of the {formatUsd0(price)} device over {term} months.
          {/if}
        </p>
      </div>

      <div class="fields">
        <NumberField
          label="Quoted payment (before trade-in)"
          bind:value={paymentOverride}
          placeholder={undiscountedMonthly.toFixed(2)}
          prefix="$"
          step={1}
          hint={quotedPayment !== null
            ? "Optional. Apple's published payment for this exact configuration — change it only if you were quoted something else."
            : 'Optional. Estimated from list price, so it will be a few cents off. Enter the real quote if you have one.'}
        />
      </div>
    </section>

    <!-- 03 ─────────────────────────────────────────────────────────────────── -->
    {#if showTradeIn}
      <section class="step">
        <div class="step-head">
          <span class="step-num">03</span>
          <h2 class="step-title">Do you have a trade-in?</h2>
          <span class="rule"></span>
        </div>
        <p class="step-copy">
          A trade-in doesn't come off the price here. Klarna divides its value across the {term} payments
          of the initial term and lowers each one. It applies to the first term only &mdash; you cannot
          trade in again when you upgrade.
        </p>

        <div class="choices">
          <button
            type="button"
            class="choice"
            aria-pressed={hasTradeIn === true}
            onclick={() => (hasTradeIn = true)}
          >
            <span class="choice-name">Yes, I have a device</span>
            <span class="choice-detail">Spread across {term} payments</span>
          </button>
          <button
            type="button"
            class="choice"
            aria-pressed={hasTradeIn === false}
            onclick={() => {
              hasTradeIn = false;
              tradeInValue = null;
            }}
          >
            <span class="choice-name">No trade-in</span>
            <span class="choice-detail">Full monthly payment</span>
          </button>
        </div>

        {#if hasTradeIn}
          <div class="fields">
            <NumberField
              label="Trade-in value"
              bind:value={tradeInValue}
              placeholder="375"
              prefix="$"
              step={25}
              hint="Apple's quote. If the device arrives in worse shape than you said, Klarna raises the payment."
            />
          </div>
          {#if tradeIn > 0}
            <p class="step-copy">
              {formatUsd0(tradeIn)} over {term} payments is {formatUsd(tradeIn / term)} off each month:
              <strong>{formatUsd(monthly)}/mo</strong> instead of {formatUsd(undiscountedMonthly)}.
            </p>
          {/if}
        {/if}
      </section>
    {/if}

    <!-- 04 ─────────────────────────────────────────────────────────────────── -->
    {#if showCare}
      <section class="step">
        <div class="step-head">
          <span class="step-num">04</span>
          <h2 class="step-title">Will you break it?</h2>
          <span class="rule"></span>
        </div>
        <p class="step-copy">
          Not how careful you feel &mdash; the count. How many times in the last four years have you
          cracked a screen or a back glass, including the ones you never bothered to fix? One in
          four years is roughly <strong>25%</strong> odds over a {careCoverageMonths}-month window.
          Two is more like 50%. Never, with a case on and no kids or job site involved, is 10% or
          less. Pick the number your history supports, not the one you'd like to be true.
        </p>
        <div class="fields">
          <NumberField
            label="Odds you damage it"
            bind:value={damageLikelihoodInput}
            placeholder="20"
            suffix="%"
            step={5}
            max={100}
            hint="Charged as an expected cost, once per return or repair moment in the model."
          />
          <NumberField
            label="Out-of-warranty repair"
            bind:value={damageFeeInput}
            placeholder={DEFAULT_DAMAGE_FEE[category]}
            prefix="$"
            step={25}
            hint="What Apple charges with no coverage — also roughly what Klarna would bill you for handing back a damaged device."
          />
          <NumberField
            label="AppleCare deductible"
            bind:value={careDeductibleInput}
            placeholder={CARE_PRICING[category].deductible}
            prefix="$"
            step={10}
            hint="What the same repair still costs you with coverage."
          />
        </div>

        <div class="exit-grid">
          <div>
            <span class="ek">Pay repairs yourself</span><span class="ev"
              >{formatUsd0(repairsUncovered)}</span
            >
          </div>
          <div>
            <span class="ek">Buy AppleCare+ instead</span><span class="ev"
              >{formatUsd0(repairsCovered)}</span
            >
          </div>
        </div>
        <div class="callout">
          <p>
            At {assumptions.damageLikelihood}% odds you either pay
            {formatUsd0(assumptions.damageFee)} for a repair or nothing at all, which averages out to
            {formatUsd0(repairsUncovered)} over {careCoverageMonths} months. Coverage turns that same
            repair into a {formatUsd0(assumptions.careDeductible)} deductible, so it's worth
            {formatUsd0(damageSaved)} each time you use it &mdash; but the premiums cost
            {formatUsd0(careCostToCompare)} whether you use them or not.
            {#if careBreakEven === null}
              The deductible is as expensive as the repair here, so coverage only earns its keep on
              theft, loss, or a second failure.
            {:else if careBreakEven <= 1}
              It pays for itself at roughly
              <strong>{Math.round(careBreakEven * 100)}%</strong> odds &mdash; about one incident in that
              window. Above that, coverage is the cheaper bet. Below it you're buying peace of mind rather
              than expected value, and the honest alternative is to bank the premium and pay the repair
              if it happens.
            {:else}
              For the premiums to pay for themselves on repairs alone you'd have to break it about
              <strong>{careBreakEven.toFixed(1)} times</strong> in {careCoverageMonths} months, which
              is more than most people manage. Priced purely as repair insurance it's a losing bet; what
              you're actually buying is the tail &mdash; theft, loss, and the return-condition risk below.
            {/if}
          </p>
        </div>

        <h3 class="group-title">AppleCare?</h3>
        <p class="step-copy">
          AppleCare is not part of the lease and Apple bills it separately. It matters more here
          than it would on a device you own because you have to hand this one back in "good
          condition" (according to Apple), and whether a scuffed return counts is Klarna's judgment
          call rather than yours. If you plan to buy the device out, or you're a careful owner with
          a history to prove it, skipping coverage is defensible. If you plan to hand it back,
          coverage is buying down a risk you don't control. Prices are estimated; enter the quoted
          price from apple.com for the most accurate calculation.
        </p>

        <div class="choices choices-wide">
          {#each CARE_OPTIONS as option (option.value)}
            <button
              type="button"
              class="choice"
              aria-pressed={careChoice === option.value}
              onclick={() => (careChoice = option.value)}
            >
              <span class="choice-name">{option.name}</span>
              <span class="choice-detail">{option.detail}</span>
            </button>
          {/each}
        </div>

        {#if care !== 'none'}
          <div class="fields">
            {#if care === 'monthly'}
              <NumberField
                label="AppleCare+ monthly"
                bind:value={careMonthlyInput}
                placeholder={CARE_PRICING[category].monthly}
                prefix="$"
                suffix="/mo"
                step={1}
              />
            {:else if care === 'annual'}
              <NumberField
                label="AppleCare+ annual"
                bind:value={careAnnualInput}
                placeholder={CARE_PRICING[category].annual}
                prefix="$"
                suffix="/yr"
                step={10}
              />
            {:else}
              <NumberField
                label="AppleCare One"
                bind:value={careOneInput}
                placeholder={APPLECARE_ONE_MONTHLY}
                prefix="$"
                suffix="/mo"
                step={1}
                hint="Covers up to three devices, so if you already pay it, the marginal cost of adding this one may be zero."
              />
            {/if}
          </div>
        {/if}
      </section>
    {/if}

    <!-- 05 ─────────────────────────────────────────────────────────────────── -->
    {#if showDetails}
      <section class="step">
        <div class="step-head">
          <span class="step-num">05</span>
          <h2 class="step-title">Everything else on the bill</h2>
          <span class="rule"></span>
        </div>
        <p class="step-copy">
          The parts nobody puts on the product page. Each one is small on its own and none of them
          are simple, so here they are one at a time. Defaults are reasonable guesses; every one is
          editable, and every one is applied to all four scenarios so the comparison stays fair.
        </p>

        <h3 class="group-title">Sales tax</h3>
        <p class="step-copy">
          A lease usually changes <em>when</em> you pay tax, not how much. Most states tax each
          lease payment as it's billed, so the tax rides along at
          {(taxRateInput ?? 8.5).toFixed(2).replace(/\.?0+$/, '')}% of
          {formatUsd(monthly)} &mdash; about {formatUsd(monthly * ((taxRateInput ?? 8.5) / 100))} a month
          &mdash; and the buyout gets taxed too when you take it. A few states instead tax the full
          {formatUsd0(price)} at signing, which is the same money much sooner and therefore worse for
          you. Buying outright or financing is always taxed on the full price up front.
        </p>
        <div class="fields">
          <NumberField
            label="Sales tax"
            bind:value={taxRateInput}
            placeholder="8.5"
            suffix="%"
            step={0.25}
            hint="Your combined state and local rate."
          />
        </div>
        <label class="toggle">
          <input type="checkbox" bind:checked={taxLeasePayments} />
          <span>
            My state taxes each lease payment
            <span class="toggle-hint">
              Most do. Uncheck if you owe tax on the full {formatUsd0(price)} at signing instead &mdash;
              roughly {formatUsd0(price * ((taxRateInput ?? 8.5) / 100))} on day one.
            </span>
          </span>
        </label>

        <h3 class="group-title">Credit card rewards</h3>
        <p class="step-copy">
          On a purchase this size, the card matters. Apple Card pays 3% Daily Cash on anything Apple
          bills directly, and Apple says lease payments made with Apple Card earn the same 3% even
          though Klarna is the one billing them &mdash; worth about
          {formatUsd0(monthly * term * ((cashBackInput ?? 3) / 100))} on this lease's {term} payments,
          on top of the rebate on everything Apple bills you directly. The purchase option fee is the
          exception: it's a Klarna sale rather than a lease payment, so it earns nothing.
        </p>
        <p class="step-copy">
          Without an Apple Card you're at the mercy of what Klarna accepts, and Apple's own fine
          print says several networks and issuers don't work for these payments &mdash; American
          Express and UnionPay outright, plus some Chase and Citi cards that get declined even
          though they're Visa or Mastercard. Debit works. If your 2% catch-all card is on that list,
          your effective rebate on the largest line item here is 0%, so set this to what you'd
          actually earn.
        </p>
        <div class="fields">
          <NumberField
            label="Card rewards rate"
            bind:value={cashBackInput}
            placeholder="3"
            suffix="%"
            step={0.5}
            hint="3% is Apple Card. Use your card's rate on Apple purchases, or 0 if the card you'd use can't pay Klarna at all."
          />
        </div>

        <h3 class="group-title">Carrier fees</h3>
        <p class="step-copy">
          A leased iPhone has to sit on an AT&amp;T, T-Mobile or Verizon postpaid line, and all
          three charge an upgrade or activation fee &mdash; currently {formatUsd0(35)} per line &mdash;
          for the privilege of putting a new device on it. It's not part of the lease and it doesn't show
          up in the monthly quote; it lands on your next phone bill. The model charges it once at signing.
          Carriers generally charge it again every time you upgrade, so if you take the upgrade path at
          month {term}, double it.
        </p>
        <p class="step-copy">
          The postpaid requirement is its own cost if you'd otherwise be on a prepaid or MVNO plan.
          Only the difference belongs here &mdash; a jump from a {formatUsd0(30)} prepaid plan to a
          {formatUsd0(75)} postpaid line is {formatUsd0(45)} a month, which over {horizon} months dwarfs
          everything else on this page.
        </p>
        <div class="fields">
          <NumberField
            label="Carrier activation"
            bind:value={activationInput}
            placeholder={category === 'iphone' ? 35 : 0}
            prefix="$"
            step={5}
            hint="Charged at signing on the new line."
          />
          <NumberField
            label="Postpaid plan premium"
            bind:value={postpaidInput}
            placeholder="0"
            prefix="$"
            suffix="/mo"
            step={5}
            hint="Extra per month over the plan you'd otherwise use. Applied for the whole {horizon}-month window, since the requirement outlives the lease."
          />
        </div>

        <h3 class="group-title">Case and accessories</h3>
        <p class="step-copy">
          Easy to wave off, except that a lease makes it closer to mandatory: you're on the hook for
          returning this device in good condition, so the case and screen protector are part of the
          cost of the program rather than a nice-to-have. This gets charged again on the upgrade
          path, because a new body shape needs new everything &mdash; which is exactly the recurring
          cost the treadmill is built to hide.
        </p>
        <div class="fields">
          <NumberField
            label="Case and accessories"
            bind:value={caseInput}
            placeholder="60"
            prefix="$"
            step={10}
            hint="Taxed like any Apple purchase, and charged again for the second device if you upgrade."
          />
        </div>

        <h3 class="group-title">Today's dollars versus future dollars</h3>
        <p class="step-copy">
          Every total on this page is also shown in today's dollars, because {formatUsd0(1000)} you pay
          two years from now costs you less than {formatUsd0(1000)} you pay today &mdash; the money you
          haven't handed over yet is still working for you. That's the discount rate: whatever your cash
          would otherwise earn. Around 4&ndash;5% is a savings account, 7% is a long-run stock market
          assumption, and if you're carrying credit card debt the honest number is your APR, because paying
          Apple later means paying that interest for less time.
        </p>
        <p class="step-copy">
          This is the one assumption that structurally favors the lease. Payments plus buyout equal
          list price exactly, so the lease and 0% financing cost the same nominal dollars &mdash;
          the lease just pushes a big chunk of it out to month {term}. At {(discountRateInput ?? 7)
            .toFixed(2)
            .replace(/\.?0+$/, '')}% that deferral is worth real money; set the rate to 0 and the
          two collapse into the same number, which is a useful sanity check on how much of the
          lease's advantage is timing rather than price.
        </p>
        <div class="fields">
          <NumberField
            label="Discount rate"
            bind:value={discountRateInput}
            placeholder="7"
            suffix="%"
            step={0.5}
            hint="What your money would earn elsewhere, annually. Set it to 0 to compare raw dollars."
          />
        </div>

        <h3 class="group-title">Apple's own 0% financing</h3>
        <p class="step-copy">
          The comparison the lease is really up against. Apple splits the price into interest-free
          installments &mdash; a {formatUsd0(price)}
          {device.name} over {financeMonths} months is
          <strong>{formatUsd(financeMonthlyListed)}/mo</strong>{#if tradeIn > 0}, or
            {formatUsd(financeMonthly)} once your {formatUsd0(tradeIn)} trade-in comes off the price{/if}
          &mdash; and the device is yours the entire time. No residual, no buyout, nothing to hand back.
        </p>
        <div class="fields">
          <NumberField
            label="Installment term"
            bind:value={financeMonthsInput}
            placeholder={FINANCE_MONTHS[category]}
            suffix="mo"
            step={6}
            min={1}
          />
        </div>
        <label class="toggle">
          <input type="checkbox" bind:checked={financeTaxUpfront} />
          <span>
            Pay the sales tax at purchase
            <span class="toggle-hint">
              Uncheck if your tax gets rolled into the installments, which is what Apple Card
              Monthly Installments normally does.
            </span>
          </span>
        </label>

        <h3 class="group-title">The carrier comparison</h3>
        <div class="fields">
          <NumberField
            label="Installment term"
            bind:value={carrierMonthsInput}
            placeholder="36"
            suffix="mo"
            step={6}
          />
          <NumberField
            label="Down payment"
            bind:value={carrierDownInput}
            placeholder="0"
            prefix="$"
            step={50}
          />
          <NumberField
            label="Monthly bill credit"
            bind:value={carrierCreditInput}
            placeholder={carrierCreditDefault.toFixed(2)}
            prefix="$"
            suffix="/mo"
            step={5}
            hint="Defaults to your trade-in spread across the plan, the way carriers actually credit it. Add new-line promo credits here too — and remember they all die if you leave early."
          />
        </div>
        <label class="toggle">
          <input type="checkbox" bind:checked={carrierTaxUpfront} />
          <span>
            Carrier collects sales tax on the full price at signing
            <span class="toggle-hint">How most carriers do it, even at 0% interest.</span>
          </span>
        </label>

        <h3 class="group-title">One genuine ambiguity</h3>
        <label class="toggle">
          <input type="checkbox" bind:checked={purchaseCreditHonored} />
          <span>
            Buying out credits back the trade-in I already used
            <span class="toggle-hint">
              Apple says the buyout is "the list price minus any lease payments you've made minus
              any remaining discounts or trade-in credit." Read literally, credit already applied to
              your payments isn't "remaining", so it gets added back into the buyout and the
              trade-in only pays off if you return the device. Off is the literal reading; on is the
              generous one.
              {#if tradeIn > 0}
                It's worth {formatUsd0(tradeIn)} to you.
              {/if}
            </span>
          </span>
        </label>
      </section>
    {/if}

    <!-- 06 ─────────────────────────────────────────────────────────────────── -->
    {#if showTimeline}
      <section class="step">
        <div class="step-head">
          <span class="step-num">06</span>
          <h2 class="step-title">The first {term} months</h2>
          <span class="rule"></span>
        </div>
        <p class="step-copy">
          Month by month, what leaves your account and what you'd owe to own the thing outright at
          that moment. The buyout column falls by exactly what you pay, which is the tell: this is
          0% financing wearing a lease costume &mdash; but only if you eventually buy.
        </p>

        <div class="ledger">
          <div class="ledger-head">
            <span>When</span>
            <span>What happens</span>
            <span class="num">Out</span>
            <span class="num">Buyout</span>
          </div>
          {#each cycle1 as row (row.month)}
            <div class="ledger-row" class:milestone={row.milestone}>
              <span class="lr-when">{row.label}</span>
              <span class="lr-what">
                {#if row.events.length === 0}
                  <span class="quiet">&mdash;</span>
                {:else}
                  {#each row.events as event (event.label)}
                    <span class="event" class:credit={event.amount < 0}>
                      {event.label}
                      {#if event.amount !== 0}
                        <span class="event-amt">{formatUsd(Math.abs(event.amount))}</span>
                      {/if}
                    </span>
                  {/each}
                {/if}
              </span>
              <span class="num lr-out" class:quiet={row.net === 0}>
                {row.net === 0 ? '—' : formatUsd(row.net)}
              </span>
              <span class="num lr-buyout">
                {row.buyout === null ? 'owned' : formatUsd0(row.buyout)}
              </span>
            </div>
          {/each}
        </div>
      </section>

      <!-- 07 ───────────────────────────────────────────────────────────────── -->
      <section class="step">
        <div class="step-head">
          <span class="step-num">07</span>
          <h2 class="step-title">Month {term}</h2>
          <span class="rule"></span>
        </div>
        <div class="callout">
          <p>
            {term} payments come to <strong>{formatUsd(leaseTotalFirstTerm)}</strong>, and the
            buyout at month {term} is
            <strong>{formatUsd(purchaseOptionFee(assumptions, term))}</strong>. Add them and you get {formatUsd(
              leaseTotalFirstTerm + purchaseOptionFee(assumptions, term)
            )}
            &mdash; list price, to the penny. Apple's promise that you'll never pay more than the device
            is true. What it doesn't say is that you'll pay
            {leaseSharePct.toFixed(0)}% of it and own nothing if you hand the device back.
          </p>
        </div>

        <h3 class="group-title">What the device is worth by then</h3>
        <p class="step-copy">
          Every option below turns on this number, so it's worth setting deliberately. Two of the
          four paths hand the device back, and what you're giving up is whatever it would have sold
          for. iPhones hold value better than almost any consumer electronic &mdash; roughly half of
          list after two years on the private market, less through a trade-in program, which is the
          whole reason Apple can price a lease this way. The estimate decays geometrically from your
          number, so {resalePctAtTerm.toFixed(0)}% at {term} months implies
          {((resalePctAtTerm / 100) ** 2 * 100).toFixed(0)}% at {horizon}.
        </p>
        <div class="fields">
          <NumberField
            label="Resale value at {term} months"
            bind:value={resaleInput}
            placeholder={(DEFAULT_RESALE_PCT[category] * 100).toFixed(0)}
            suffix="%"
            step={5}
            max={100}
            hint="Of the {formatUsd0(
              price
            )} list price. Check a real quote on Swappa or eBay for the same model a generation back — that's what this device will be."
          />
        </div>
        <div class="exit-grid">
          <div>
            <span class="ek">Worth at month {term}</span><span class="ev"
              >{formatUsd0(resaleAtTerm)}</span
            >
          </div>
          <div>
            <span class="ek">Buyout at month {term}</span><span class="ev"
              >{formatUsd0(purchaseOptionFee(assumptions, term))}</span
            >
          </div>
          <div>
            <span class="ek">Worth at month {horizon}</span><span class="ev"
              >{formatUsd0(resaleAtHorizon)}</span
            >
          </div>
        </div>
        <p class="step-copy">
          {#if resaleAtTerm > purchaseOptionFee(assumptions, term)}
            The device is worth more than the buyout costs, which makes buying it out the closest
            thing to free money on this page: pay {formatUsd0(purchaseOptionFee(assumptions, term))} for
            something you could sell for {formatUsd0(resaleAtTerm)}. Handing it back instead gives
            that spread to Apple.
          {:else}
            The buyout costs more than the device is worth, so buying it out only makes sense
            because you want to keep using it &mdash; not as a resale play. Handing it back is the
            rational move if you were going to sell it anyway.
          {/if}
        </p>

        <h3 class="group-title">What do you do next?</h3>
        <p class="step-copy">
          You get six months to decide, and you keep paying the whole time. Each card is priced over
          the same {horizon}-month window so they're comparable, in today's dollars, including every
          fee above.
        </p>

        <div class="choices choices-wide">
          {#each FORK_OPTIONS as option (option.value)}
            {@const outcome = forkOutcomes.find((o) => o.fork === option.value)?.result}
            <button
              type="button"
              class="choice"
              aria-pressed={forkChoice === option.value}
              onclick={() => (forkChoice = option.value)}
            >
              <span class="choice-name">{option.name}</span>
              {#if outcome}
                <span class="choice-figure">{formatUsd0(outcome.lease.npv)}</span>
                <span class="choice-sub">
                  {formatUsd(outcome.lease.npvPerDeviceMonth)}/mo of device
                  {#if !outcome.lease.ownsDevice}&middot; own nothing{/if}
                </span>
              {/if}
              <span class="choice-detail">{option.detail}</span>
            </button>
          {/each}
        </div>

        {#if forkChoice === 'walk'}
          <div class="callout warn">
            <p>
              Returning at month {term} is the cheapest of the four, and that's the trap. You spend months
              {term + 1}&ndash;{horizon} with no device, so the total isn't comparable to the others.
              That's why every figure here is also shown per month of actually having a phone.
            </p>
          </div>
        {/if}
        {#if forkChoice === 'extend'}
          <div class="callout warn">
            <p>
              The extension is the one path you can enter by accident. Six payments at
              {formatUsd(undiscountedMonthly)} &mdash; the trade-in credit is gone, so they're back to
              full price &mdash; and then Klarna charges the remaining buyout automatically. You end up
              owning the device at close to list price, having taken the slowest possible route there.
            </p>
          </div>
        {/if}
      </section>
    {/if}

    <!-- 08 ─────────────────────────────────────────────────────────────────── -->
    {#if showCycle2}
      <section class="step">
        <div class="step-head">
          <span class="step-num">08</span>
          <h2 class="step-title">Months {term + 1} to {horizon}: {forkLabel.toLowerCase()}</h2>
          <span class="rule"></span>
        </div>
        <p class="step-copy">
          {#if fork === 'upgrade'}
            A new lease, at today's prices, with no trade-in to soften it &mdash; so the payment
            jumps from {formatUsd(monthly)} to {formatUsd(undiscountedMonthly)}. This is the
            treadmill: two full terms, two devices, nothing owned at the end of either.
          {:else if fork === 'buy'}
            You own it. Nothing leaves your account for these months, and there's a resale value
            waiting at the end if you want out.
          {:else if fork === 'extend'}
            Six more payments, then the automatic buyout. After that it's yours.
          {:else}
            Nothing leaves your account, because you have no device. Whatever you do about that
            isn't priced here.
          {/if}
        </p>

        <div class="ledger">
          <div class="ledger-head">
            <span>When</span>
            <span>What happens</span>
            <span class="num">Out</span>
            <span class="num">Buyout</span>
          </div>
          {#each cycle2 as row (row.month)}
            <div class="ledger-row" class:milestone={row.milestone}>
              <span class="lr-when">{row.label}</span>
              <span class="lr-what">
                {#if row.events.length === 0}
                  <span class="quiet">&mdash;</span>
                {:else}
                  {#each row.events as event (event.label)}
                    <span class="event" class:credit={event.amount < 0}>
                      {event.label}
                      {#if event.amount !== 0}
                        <span class="event-amt">{formatUsd(Math.abs(event.amount))}</span>
                      {/if}
                    </span>
                  {/each}
                {/if}
              </span>
              <span class="num lr-out" class:quiet={row.net === 0}>
                {row.net === 0 ? '—' : formatUsd(row.net)}
              </span>
              <span class="num lr-buyout">
                {row.buyout === null ? 'owned' : formatUsd0(row.buyout)}
              </span>
            </div>
          {/each}
        </div>
      </section>

      <!-- 09 ───────────────────────────────────────────────────────────────── -->
      <section class="step">
        <div class="step-head">
          <span class="step-num">09</span>
          <h2 class="step-title">{horizon} months, four ways</h2>
          <span class="rule"></span>
        </div>
        <p class="step-copy">
          Same device, same taxes, same case, same damage odds, same {horizon} months. The lease column
          follows the path you chose. Buying outright mirrors its device cadence, so if you upgrade at
          month {term}, the cash buyer sells and rebuys then too; the financing and carrier columns
          assume you keep the device instead.
        </p>

        <div class="verdict">
          {#each comparison.scenarios as scenario (scenario.key)}
            <div
              class="vcard"
              class:best={comparison.bestValueKey === scenario.key}
              class:is-lease={scenario.key === 'lease'}
            >
              <div class="vcard-head">
                <span class="vcard-name">{scenario.name}</span>
                {#if comparison.bestValueKey === scenario.key}
                  <span class="badge">best value</span>
                {/if}
              </div>
              <div class="vcard-figure">{formatUsd0(scenario.npv)}</div>
              <div class="vcard-sub">in today's dollars</div>
              <dl class="vcard-rows">
                <div>
                  <dt>Cash out of pocket</dt>
                  <dd>{formatUsd0(scenario.total)}</dd>
                </div>
                <div>
                  <dt>Per month of device</dt>
                  <dd>{formatUsd(scenario.npvPerDeviceMonth)}</dd>
                </div>
                <div>
                  <dt>Months with a device</dt>
                  <dd>{scenario.deviceMonths}</dd>
                </div>
                <div>
                  <dt>Own it at the end</dt>
                  <dd>{scenario.ownsDevice ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </div>
          {/each}
        </div>

        <h3 class="group-title">Leaving early</h3>
        <p class="step-copy">
          Apple will only say the early termination fee "may be substantial". The remaining payments
          are the natural ceiling on it, so that's what this shows.
        </p>
        <div class="fields">
          <NumberField
            label="Month you'd bail"
            bind:value={exitMonthInput}
            placeholder={Math.round(term / 2)}
            suffix="mo"
            step={1}
            min={1}
            max={term}
          />
        </div>
        <div class="exit-grid">
          <div>
            <span class="ek">Paid by month {exitMonth}</span><span class="ev"
              >{formatUsd0(exitPaid)}</span
            >
          </div>
          <div>
            <span class="ek">Payments still owed</span><span class="ev"
              >{formatUsd0(exitRemaining)}</span
            >
          </div>
          <div>
            <span class="ek">Or buy it out instead</span><span class="ev"
              >{formatUsd0(exitBuyout)}</span
            >
          </div>
        </div>

        <h3 class="group-title">What the math actually says</h3>
        <div class="takeaways">
          <p>
            <strong>Apple already sells 0% financing, and that's the real benchmark.</strong>
            {formatUsd(financeMonthlyListed)}/mo for {financeMonths} months on this
            {formatUsd0(price)} device, no interest, and you own it the whole way. Every question about
            the lease reduces to how it compares with that, not with paying cash.
          </p>
          <p>
            <strong>The lease with a buyout is that same deal, wearing a costume.</strong> Payments
            plus buyout equal list price exactly &mdash; the identical total as financing. The lease
            just reshapes it: {formatUsd(monthly)}/mo instead of {formatUsd(financeMonthly)}, with
            the difference waiting at month {term} as a balloon payment. Money deferred is money saved,
            so in today's dollars the lease edges ahead, and in exchange you spend two years not owning
            the thing and carrying return-condition risk.
          </p>
          <p>
            <strong>It's an expensive rental if you don't buy.</strong>
            {leaseSharePct.toFixed(0)}% of the device over {term} months, and you hand it back. Finance
            the same phone instead and you're out only the depreciation &mdash; roughly
            {(100 - (resaleInput ?? DEFAULT_RESALE_PCT[category] * 100)).toFixed(0)}% here, since
            you still hold something worth selling at month {term}. The gap between those two
            numbers is what the program earns for renting you a device you could have been buying at
            0% the whole time.
          </p>
          <p>
            <strong>A trade-in and a buyout don't mix.</strong> The credit is spread across your payments,
            and the buyout formula adds back whatever it already gave you. Trade in if you plan to return
            the device; if you plan to keep it, sell the old one yourself.
          </p>
          <p>
            <strong>The Apple Card 3% applies to the lease too.</strong> Klarna bills the payments, but
            Apple says lease payments made with Apple Card earn 3% Daily Cash &mdash; which is what the
            calculator assumes you do. Without one, the largest line item on the page earns whatever your
            card gives on a Klarna charge &mdash; and American Express and UnionPay aren't accepted at
            all, with some Chase and Citi cards declined too. The purchase option fee is the exception:
            a Klarna sale, not a lease payment, so it earns nothing.
          </p>
          <p>
            <strong>Doing nothing is a decision.</strong> Drift past month {term} and you get six month-to-month
            payments at the undiscounted rate &mdash; the trade-in credit is gone, so they jump back to
            {formatUsd(undiscountedMonthly)} &mdash; and then Klarna charges the rest of the buyout automatically.
            The total lands in the same place as buying outright, and because it lands there later it
            can even score marginally better in today's dollars. That isn't an argument for drifting.
            It means the passive path ends with you owning a two-year-old device you never decided to
            buy.
          </p>
        </div>

        <h3 class="group-title">What this doesn't model</h3>
        <ul class="caveats">
          <li>
            Credit approval, which is a soft pull to apply and a real underwriting decision after
            that.
          </li>
          <li>
            The actual early termination fee, which Apple doesn't publish. Assume the remaining
            payments and be pleasantly surprised.
          </li>
          <li>
            Klarna's condition standard at return. Every lease-return program in history has been
            stricter in practice than on paper.
          </li>
          <li>
            Price changes on the second device. The upgrade path assumes today's prices, which is
            optimistic.
          </li>
          <li>
            Insurance you may already carry. AppleCare+ with Theft and Loss overlaps with some
            renter and homeowner policies.
          </li>
        </ul>

        <button type="button" class="reset" onclick={reset}>Start over</button>
      </section>
    {/if}
  </div>

  <!-- Rail ───────────────────────────────────────────────────────────────── -->
  <aside class="rail" class:expanded={railExpanded} aria-label="Comparison totals">
    <div class="rail-inner">
      <button
        type="button"
        class="rail-head"
        aria-expanded={railExpanded}
        aria-controls="rail-body"
        onclick={() => (railExpanded = !railExpanded)}
      >
        <span class="rail-when">
          The comparison
          <span class="rail-of">{horizon} months &middot; today's dollars</span>
        </span>
        <span class="rail-peek">{formatUsd0(comparison.lease.npv)}</span>
        <span class="rail-chevron" aria-hidden="true">
          <ChevronUp size={15} />
        </span>
      </button>

      <div class="rail-body" id="rail-body">
        <div class="rail-figure">
          <span class="rail-label">
            {comparison.lease.name}: {forkLabel.toLowerCase()}
            {#if comparison.bestValueKey === 'lease'}
              <span class="badge">best value</span>
            {/if}
          </span>
          <span class="rail-value">{formatUsd0(comparison.lease.npv)}</span>
          <span class="rail-sub">
            {formatUsd0(comparison.lease.total)} cash out &middot;
            {formatUsd(comparison.lease.npvPerDeviceMonth)}/mo of device
          </span>
        </div>

        <div class="rail-compare">
          {#each alternatives as scenario (scenario.key)}
            <div>
              <span class="rc-key">{scenario.name}</span>
              <span class="rc-side">
                {#if comparison.bestValueKey === scenario.key}
                  <span class="badge">best value</span>
                {/if}
                <span class="rc-val">{formatUsd0(scenario.npv)}</span>
              </span>
            </div>
          {/each}
        </div>

        <div class="rail-foot">
          {monthly > 0 ? `${formatUsd(monthly)}/mo` : '—'} &middot; {term}mo &middot;
          {care === 'none' ? 'no AppleCare' : 'AppleCare'}
        </div>
      </div>
    </div>
  </aside>
</div>

<style>
  a {
    color: inherit;
    text-decoration: none;
  }

  /* ── Header ─────────────────────────────────────────────────────────────── */
  .head {
    max-width: 720px;
    padding: 80px 0 40px;
  }
  .eyebrow {
    margin-bottom: 18px;
    font-size: 12px;
  }
  .page-title {
    margin: 0 0 16px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 46px;
    line-height: 1.05;
    letter-spacing: -0.025em;
  }
  .page-lede {
    margin: 0;
    max-width: 620px;
    font-size: 17px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }
  .page-note {
    margin: 24px 0 0;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--faint);
  }
  .page-note a:hover {
    color: var(--accent);
  }

  /* ── Layout ─────────────────────────────────────────────────────────────── */
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 244px;
    gap: 44px;
    padding-bottom: 96px;
    align-items: start;
  }
  .flow {
    min-width: 0;
  }

  /* ── Steps ──────────────────────────────────────────────────────────────── */
  .step {
    padding: 34px 0;
    border-top: 1px solid var(--border);
  }
  .step-head {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
  }
  .step-num {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 11.5px;
    letter-spacing: 0.06em;
    color: var(--accent);
  }
  .step-title {
    margin: 0;
    font-family: var(--font-body);
    font-weight: 580;
    font-size: 21px;
    letter-spacing: -0.015em;
    color: var(--text);
  }
  .rule {
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .step-copy {
    margin: 0 0 20px;
    max-width: 620px;
    font-size: 15px;
    line-height: 1.75;
    color: var(--muted);
    text-wrap: pretty;
  }
  .step-copy strong {
    color: var(--text);
    font-weight: 560;
  }
  .group-title {
    margin: 30px 0 14px;
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 11.5px;
    letter-spacing: 0.06em;
    text-transform: lowercase;
    color: var(--faint);
  }

  /* ── Tabs ───────────────────────────────────────────────────────────────── */
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }
  .tab {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 8px 13px;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12.5px;
    color: var(--muted);
    cursor: pointer;
  }
  .tab:hover {
    color: var(--text);
  }
  .tab[aria-selected='true'] {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  /* ── Choice cards ───────────────────────────────────────────────────────── */
  .choices {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
    margin-bottom: 8px;
  }
  .choices-wide {
    grid-template-columns: repeat(auto-fit, minmax(232px, 1fr));
  }
  .choice {
    display: flex;
    flex-direction: column;
    gap: 5px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    padding: 14px 15px;
    text-align: left;
    cursor: pointer;
  }
  .choice:hover {
    border-color: color-mix(in oklch, var(--accent) 45%, var(--border));
  }
  .choice[aria-pressed='true'] {
    border-color: var(--accent);
    background: color-mix(in oklch, var(--accent) 10%, var(--surface));
    box-shadow: inset 0 0 0 1px var(--accent);
  }
  .choice-name {
    font-family: var(--font-body);
    font-weight: 560;
    font-size: 14.5px;
    color: var(--text);
  }
  .choice-figure {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 19px;
    letter-spacing: -0.01em;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
  .choice-figure .per {
    font-size: 12px;
    color: var(--faint);
  }
  .choice-sub {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--accent2);
  }
  .choice-detail {
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--muted);
    text-wrap: pretty;
  }

  /* ── Chips ──────────────────────────────────────────────────────────────── */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin: 12px 0 20px;
  }
  .chip {
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg);
    padding: 6px 13px;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 11.5px;
    color: var(--muted);
    cursor: pointer;
  }
  .chip:hover {
    color: var(--text);
    border-color: var(--faint);
  }
  .chip[aria-pressed='true'] {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in oklch, var(--accent) 12%, transparent);
  }

  /* ── Fields ─────────────────────────────────────────────────────────────── */
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }
  .toggle {
    display: flex;
    gap: 11px;
    align-items: flex-start;
    margin: 4px 0 18px;
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--text);
    cursor: pointer;
  }
  .toggle input {
    margin-top: 3px;
    accent-color: var(--accent);
    flex: none;
  }
  .toggle-hint {
    display: block;
    margin-top: 3px;
    max-width: 560px;
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }

  /* ── Callouts ───────────────────────────────────────────────────────────── */
  .callout {
    margin: 20px 0 0;
    border-left: 3px solid var(--accent);
    border-radius: 0 10px 10px 0;
    background: color-mix(in oklch, var(--accent) 8%, var(--surface));
    padding: 15px 18px;
  }
  /* A callout opening a step sits right under the head, which already spaces it. */
  .step-head + .callout {
    margin-top: 0;
  }
  /* Fields carry no top margin of their own, so they'd collide with a callout. */
  .callout + .fields {
    margin-top: 20px;
  }
  .callout.warn {
    border-left-color: var(--accent2);
    background: color-mix(in oklch, var(--accent2) 9%, var(--surface));
  }
  .callout p {
    margin: 0;
    max-width: 620px;
    font-size: 14px;
    line-height: 1.7;
    color: var(--text);
    text-wrap: pretty;
  }
  .callout strong {
    font-weight: 560;
  }

  /* ── Ledger ─────────────────────────────────────────────────────────────── */
  .ledger {
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .ledger-head,
  .ledger-row {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr) 92px 88px;
    gap: 10px;
    align-items: baseline;
    padding: 8px 14px;
  }
  .ledger-head {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    font-weight: 500;
    font-size: 10.5px;
    letter-spacing: 0.05em;
    color: var(--faint);
    text-transform: lowercase;
  }
  .ledger-row {
    border-bottom: 1px solid color-mix(in oklch, var(--border) 55%, transparent);
  }
  .ledger-row:last-child {
    border-bottom: none;
  }
  .ledger-row.milestone {
    background: color-mix(in oklch, var(--accent) 7%, transparent);
  }
  .lr-when {
    color: var(--faint);
    font-size: 11px;
  }
  .ledger-row.milestone .lr-when {
    color: var(--accent);
  }
  .lr-what {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    color: var(--muted);
  }
  .event {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .event-amt {
    flex: none;
    color: var(--faint);
    font-variant-numeric: tabular-nums;
  }
  .event.credit {
    color: var(--accent);
  }
  .event.credit .event-amt::before {
    content: '−';
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .lr-out {
    color: var(--text);
    font-weight: 480;
  }
  .lr-buyout {
    color: var(--accent2);
  }
  .quiet {
    color: var(--faint);
    font-weight: 400;
  }

  /* ── Verdict ────────────────────────────────────────────────────────────── */
  .verdict {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 12px;
    margin-bottom: 8px;
  }
  .vcard {
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    padding: 16px 17px;
  }
  .vcard.best {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }
  .vcard-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    /* Reserve two lines so a wrapped name doesn't misalign this card's figure
       against its neighbours'. */
    min-height: 2.7em;
    margin-bottom: 10px;
  }
  .vcard-name {
    font-family: var(--font-body);
    font-weight: 560;
    font-size: 13.5px;
    color: var(--text);
  }
  .badge {
    flex: none;
    border-radius: 999px;
    background: color-mix(in oklch, var(--accent) 20%, transparent);
    padding: 2px 8px;
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.04em;
    color: var(--accent);
  }
  .vcard-figure {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 27px;
    letter-spacing: -0.02em;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .vcard-sub {
    font-family: var(--font-mono);
    font-size: 10.5px;
    letter-spacing: 0.03em;
    color: var(--faint);
  }
  .vcard-rows {
    margin: 14px 0 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }
  .vcard-rows > div {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }
  .vcard-rows dt {
    font-size: 12px;
    color: var(--muted);
  }
  .vcard-rows dd {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  /* ── Early exit ─────────────────────────────────────────────────────────── */
  .exit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin: 4px 0 8px;
  }
  .exit-grid > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 13px 15px;
  }
  .ek {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--muted);
  }
  .ev {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 19px;
    color: var(--accent2);
    font-variant-numeric: tabular-nums;
  }

  /* ── Takeaways ──────────────────────────────────────────────────────────── */
  .takeaways p {
    margin: 0 0 16px;
    max-width: 640px;
    font-size: 15px;
    line-height: 1.75;
    color: var(--muted);
    text-wrap: pretty;
  }
  .takeaways strong {
    color: var(--text);
    font-weight: 560;
  }
  .caveats {
    margin: 0 0 26px;
    padding-left: 20px;
    max-width: 640px;
    font-size: 13.5px;
    line-height: 1.7;
    color: var(--muted);
  }
  .caveats li {
    margin-bottom: 7px;
    text-wrap: pretty;
  }
  .reset {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    padding: 9px 16px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--muted);
    cursor: pointer;
  }
  .reset:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  /* ── Rail ───────────────────────────────────────────────────────────────── */
  .rail {
    position: sticky;
    top: 88px;
  }
  .rail-inner {
    display: flex;
    flex-direction: column;
    gap: 16px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    padding: 17px 18px;
  }
  .rail-when {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 12.5px;
    color: var(--accent);
  }
  .rail-of {
    font-size: 10.5px;
    color: var(--faint);
  }
  /* The head is a <button> so the whole line is a tap target on mobile. */
  .rail-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
    width: 100%;
    margin: 0;
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: left;
  }
  .rail-peek {
    margin-left: auto;
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 13px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .rail-chevron {
    display: inline-flex;
    flex: none;
    align-self: center;
    color: var(--faint);
    transition: transform 160ms ease;
  }
  .rail.expanded .rail-chevron {
    transform: rotate(180deg);
  }
  .rail-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  @media (min-width: 901px) {
    /* Desktop never collapses, so the toggle affordances would lie. */
    .rail-peek,
    .rail-chevron {
      display: none;
    }
    .rail-head {
      pointer-events: none;
    }
  }
  .rail-figure {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .rail-label {
    font-family: var(--font-mono);
    font-size: 10.5px;
    letter-spacing: 0.03em;
    color: var(--faint);
  }
  .rail-value {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 25px;
    letter-spacing: -0.02em;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .rail-sub {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .rail-compare {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
  .rail-compare > div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .rc-side {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex: none;
  }
  .rc-key {
    font-size: 11.5px;
    color: var(--muted);
  }
  .rc-val {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .rail-foot {
    padding-top: 12px;
    border-top: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--faint);
  }

  /* ── Narrow ─────────────────────────────────────────────────────────────── */
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
      gap: 0;
      /* Keep the end of the page clear of the fixed bar. */
      padding-bottom: calc(110px + env(safe-area-inset-bottom));
    }
    .rail {
      position: fixed;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 20;
    }
    .rail-inner {
      gap: 0;
      border: none;
      border-top: 1px solid var(--border);
      border-radius: 0;
      padding: 0 0 env(safe-area-inset-bottom);
      background: color-mix(in oklch, var(--surface) 94%, transparent);
      backdrop-filter: blur(8px);
    }
    /* The head anchors the bottom edge; the body grows upward above it. */
    .rail-head {
      order: 2;
      padding: 12px 20px;
      cursor: pointer;
    }
    .rail-body {
      order: 1;
      display: none;
    }
    .rail.expanded .rail-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px 20px 14px;
      border-bottom: 1px solid var(--border);
    }
    .rail-of {
      display: none;
    }
    .rail.expanded .rail-of {
      display: inline;
    }
    .rail.expanded .rail-peek {
      display: none;
    }
    .rail-figure {
      flex-direction: row;
      align-items: baseline;
      gap: 8px;
    }
    .rail-value {
      font-size: 17px;
    }
    .rail-compare {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 4px 14px;
      padding-top: 0;
      border-top: none;
    }
    .rail-compare > div {
      gap: 6px;
    }
    .rc-key,
    .rc-val {
      font-size: 10.5px;
    }
  }

  @media (max-width: 640px) {
    .head {
      padding-top: 56px;
    }
    .page-title {
      font-size: 34px;
    }
    .ledger-head,
    .ledger-row {
      grid-template-columns: 58px minmax(0, 1fr) 78px;
      gap: 8px;
      padding: 8px 11px;
    }
    .lr-buyout {
      display: none;
    }
    .ledger {
      font-size: 11.5px;
    }
  }
</style>
