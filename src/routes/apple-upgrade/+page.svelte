<script lang="ts">
  import Step from '$lib/components/upgrade/Step.svelte';
  import Tiles from '$lib/components/upgrade/Tiles.svelte';
  import Field from '$lib/components/upgrade/Field.svelte';
  import Timeline from '$lib/components/upgrade/Timeline.svelte';
  import Compare from '$lib/components/upgrade/Compare.svelte';
  import {
    allScenarios,
    appleUpgrade,
    buyoutAfter,
    EXTENSION_MONTHS,
    leasePayment,
    money,
    money0,
    outright,
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
    endChoice: EndChoice;
    appleCareMonthly: number;
    appleCareAnnual: number;
    damageFee: number;
    damageOdds: number;
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
    endChoice: 'nothing',
    appleCareMonthly: 13.49,
    appleCareAnnual: 149,
    damageFee: 250,
    damageOdds: 20,
    taxRate: 8.5,
    activationFee: 35,
    caseCost: 59,
    appleCardBack: 3,
    klarnaCardBack: 0,
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
  let appleCareAnnual = $state(initial.appleCareAnnual);
  let damageFee = $state(initial.damageFee);
  let damageOdds = $state(initial.damageOdds);
  let taxRate = $state(initial.taxRate);
  let activationFee = $state(initial.activationFee);
  let caseCost = $state(initial.caseCost);
  let appleCardBack = $state(initial.appleCardBack);
  let klarnaCardBack = $state(initial.klarnaCardBack);
  let carrierCardBack = $state(initial.carrierCardBack);
  let discountRate = $state(initial.discountRate);
  let carrierCredits = $state(initial.carrierCredits);
  let resaleAtTerm = $state(Math.round(initial.listPrice * 0.45));
  let resaleAt36 = $state(Math.round(initial.listPrice * 0.33));

  // Resale estimates follow the device and the term. Change either and these
  // re-derive; they're guesses either way, so tune them after you pick.
  $effect(() => {
    const price = listPrice;
    const months = term ?? 24;
    resaleAtTerm = Math.round(price * (months === 12 ? 0.62 : 0.45));
    resaleAt36 = Math.round(price * 0.33);
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
      appleCareAnnual,
      damageFee,
      damageOdds,
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
    endChoice,
    appleCare: appleCare ?? 'none',
    appleCareMonthly,
    appleCareAnnual,
    damageFee,
    damageOdds,
    taxRate,
    activationFee,
    caseCost,
    appleCardBack,
    klarnaCardBack,
    carrierCardBack,
    discountRate,
    resaleAtTerm,
    resaleAt36,
    carrierCredits,
    carrierTerm: 36
  });

  const chosen = $derived(appleUpgrade(inputs));
  const baseline = $derived(outright(inputs));
  const scenarios = $derived(allScenarios(inputs));

  const gross = $derived(leasePayment(listPrice, term ?? 24));
  const credit = $derived(hasTradeIn === 'yes' ? tradeIn / (term ?? 24) : 0);
  const netPayment = $derived(Math.max(0, gross - credit));
  const residual = $derived(buyoutAfter(term ?? 24, listPrice, gross, 0, term ?? 24));
  const extensionEnd = $derived((term ?? 24) + EXTENSION_MONTHS);

  const termOptions = $derived(
    ([12, 24] as Term[]).map((t) => {
      const g = leasePayment(listPrice, t);
      const c = hasTradeIn === 'yes' ? tradeIn / t : 0;
      return {
        value: t,
        label: `${t} months`,
        sub: `${money(Math.max(0, g - c))}/mo`,
        note: `${money0(g * t)} in payments, then ${money0(buyoutAfter(t, listPrice, g, 0, t))} to keep it`
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
      sub: `${money(appleCareMonthly)}/mo`,
      note: 'Covers this plus your other devices'
    }
  ]);

  const endOptions = $derived([
    {
      value: 'return' as const,
      label: 'Hand it back',
      sub: money0(appleUpgrade({ ...inputs, endChoice: 'return' }).summary.npv),
      note: 'Walk away with nothing'
    },
    {
      value: 'upgrade' as const,
      label: 'Upgrade',
      sub: money0(appleUpgrade({ ...inputs, endChoice: 'upgrade' }).summary.npv),
      note: 'New lease, no trade-in allowed'
    },
    {
      value: 'buyout' as const,
      label: 'Buy it now',
      sub: money0(appleUpgrade({ ...inputs, endChoice: 'buyout' }).summary.npv),
      note: `${money0(residual)} in one shot`
    },
    {
      value: 'nothing' as const,
      label: 'Do nothing',
      sub: money0(appleUpgrade({ ...inputs, endChoice: 'nothing' }).summary.npv),
      note: 'Six more payments, then Klarna buys it'
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
    content="A step-by-step calculator for Apple Upgrade, the Klarna-backed iPhone lease. Walk the decision month by month and compare it against paying cash, Apple Card financing, and carrier installments."
  />
</svelte:head>

<article>
  <header class="hero">
    <div class="eyebrow">// apple upgrade, decoded</div>
    <h1>You never pay more than full price</h1>
    <p class="lede">
      Apple Upgrade is Apple&rsquo;s new device lease, underwritten by Klarna. Twelve or twenty-four
      months of low payments, then you hand the phone back &mdash; or don&rsquo;t. This page walks
      the decision the way Apple&rsquo;s checkout would, one choice at a time, then prices what you
      picked against the three other ways you could have paid.
    </p>

    <div class="thesis">
      <p>
        The whole program is one sentence in the FAQ: <em
          >&ldquo;Will I pay more than the full price of the device? No.&rdquo;</em
        >
      </p>
      <p>
        A 24-month lease collects 70% of the sticker. If you then do nothing at all, Klarna keeps
        billing you for six months and charges the remaining balance, and you own the phone having
        paid exactly list price. That is 0% financing stretched over thirty months, with a free
        option to walk away at month 24 instead.
      </p>
      <p>
        The catches are real. They are just not the ones people assume, and most of them are about
        <strong>when</strong> the money moves rather than how much of it there is.
      </p>
    </div>
  </header>

  <div id="step-1"></div>
  <Step
    n={1}
    title="What are you leasing?"
    lede="Apple Upgrade covers every current iPhone except the 16. The payment is a fixed share of the sticker price, so this one number drives every number below it."
    answer={deviceKey ? money0(listPrice) : undefined}
  >
    <Tiles options={deviceOptions} bind:value={deviceKey} name="device" min="168px" />

    {#if deviceKey === 'custom'}
      <div class="fields one">
        <Field label="Sticker price" bind:value={listPrice} step={50} hint="Before tax." />
      </div>
    {/if}

    <div class="aside">
      <h3>Where the payment comes from</h3>
      <p>
        Apple publishes four example payments in the Apple Upgrade footnotes and never explains the
        formula. Work backwards from them and it&rsquo;s boring: a 12-month iPhone lease collects
        <strong>50%</strong>
        of the sticker price and a 24-month lease collects <strong>70%</strong>. Divide by the term,
        round to the nearest x.99, done.
      </p>
      <p>
        An iPhone 17 Pro at $1,099 gives $45.99 and $31.99. A Pro Max at $1,199 gives $49.99 and
        $34.99. All four match Apple&rsquo;s published numbers exactly, which is the only reason to
        trust anything else on this page. iPad and Mac leases use different shares, so this
        calculator sticks to iPhone.
      </p>
    </div>
  </Step>

  <div id="step-2"></div>
  <Step
    n={2}
    title="Do you have something to trade in?"
    lede="A trade-in does not cut the price. Klarna takes its value, slices it across the payments in your initial term, and stops."
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

    <div class="aside">
      <h3>The word doing the work is &ldquo;initial&rdquo;</h3>
      <p>
        A $375 trade-in against a Pro Max makes the 12-month lease {money(
          Math.max(0, leasePayment(1199, 12) - 375 / 12)
        )} a month and the 24-month lease {money(Math.max(0, leasePayment(1199, 24) - 375 / 24))}.
        The shorter lease ends up cheaper per month, because the same credit is spread over half as
        many payments.
      </p>
      <p>
        Then month 25 arrives, the credit is spent, and the payment snaps back to the full
        {money(leasePayment(1199, 24))}. You will see that jump in the timeline below. You also
        cannot trade in again when you upgrade &mdash; the credit is a one-time enrollment thing.
      </p>
    </div>
  </Step>

  <div id="step-3"></div>
  <Step
    n={3}
    title="Twelve months or twenty-four?"
    lede="The tiles show the payment, the total, and the number Apple leaves off the marketing page: what it costs to keep the phone when the term ends."
    locked={step < 3}
    answer={term ? `${term} months` : undefined}
  >
    <Tiles options={termOptions} bind:value={term} name="term" min="230px" />

    <div class="aside">
      <h3>The buyout is probably in the money</h3>
      <p>
        Finish a 24-month lease and the purchase option fee is 30% of what the phone cost new.
        Finish a 12-month lease and it&rsquo;s 50%. Now go look at what a two-year-old Pro Max
        actually sells for. It is comfortably more than 30% of its original price.
      </p>
      <p>
        Which means the &ldquo;return it and walk away&rdquo; ending &mdash; the one the program is
        named after &mdash; is usually the financially worse choice. Handing back a phone worth
        {money0(resaleAtTerm)} to avoid a {money0(residual)} bill is a {money0(
          Math.max(0, resaleAtTerm - residual)
        )} decision, made in your favor by doing the opposite. Apple is not hiding this. It is just not
        advertising it.
      </p>
    </div>
  </Step>

  <div id="step-4"></div>
  <Step
    n={4}
    title="AppleCare?"
    lede="Not included in the lease, billed by Apple rather than Klarna, and doing a different job than usual: it is the thing standing between you and a damage fee on a phone you have to give back."
    locked={step < 4}
    answer={appleCare ? careLabel[appleCare] : undefined}
  >
    <Tiles options={careOptions} bind:value={appleCare} name="applecare" min="170px" />

    <div class="fields">
      {#if appleCare === 'monthly' || appleCare === 'one'}
        <Field label="Monthly price" bind:value={appleCareMonthly} step={1} />
      {/if}
      {#if appleCare === 'annual'}
        <Field label="Yearly price" bind:value={appleCareAnnual} step={10} />
      {/if}
      {#if appleCare === 'none'}
        <Field
          label="Damage fee if it's dinged"
          bind:value={damageFee}
          step={25}
          hint="Apple hasn't published a schedule. This is your guess."
        />
        <Field
          label="Odds you'd owe it"
          bind:value={damageOdds}
          unit="%"
          step={5}
          hint="Charged as an expected value at return."
        />
      {/if}
    </div>

    <div class="aside">
      <h3>Cracked glass stops being a decision</h3>
      <p>
        On a phone you own, a scuffed back is a thing you shrug at for two years. On a leased phone
        it is an invoice at return, graded by someone who is not you, against a standard
        (&ldquo;good working condition&rdquo;) that Apple has not defined in dollars.
      </p>
      <p>
        AppleCare+ with Theft and Loss also covers the other failure mode. Without it, a stolen
        phone does not end your lease &mdash; you keep paying until you settle the early termination
        fee or the purchase option fee. You have 60 days after enrolling to add coverage.
      </p>
    </div>
  </Step>

  <div id="step-5"></div>
  <Step
    n={5}
    title="The stuff nobody quotes you"
    lede="Six numbers that move the answer more than the monthly payment does."
    locked={step < 5}
  >
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
        hint="Probably zero. See below."
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
      <Field label="Resale at month 36" bind:value={resaleAt36} step={25} />
    </div>

    <div class="aside">
      <h3>Klarna will not take your good card</h3>
      <p>
        This is the single largest hidden cost of the lease and it is three sentences in the FAQ.
        Klarna does not accept AMEX or UnionPay, and does not accept cards <em>issued</em> by Chase or
        Capital One. Apple Pay and PayPal are out entirely.
      </p>
      <p>
        On every other path in this comparison, the full purchase price runs through a card. Apple
        Card&rsquo;s 3% Daily Cash on a $1,199 phone is about {money0(1199 * 1.085 * 0.03)} you simply
        do not get when Klarna is the one collecting. That is most of the lease&rsquo;s timing advantage,
        handed back.
      </p>
      <h3>Why the discount rate matters here</h3>
      <p>
        Two paths can cost the identical number of nominal dollars and still not be the same deal.
        Money you keep for two years is money that earns something. The discount rate converts every
        future payment back into today&rsquo;s dollars so the comparison is honest about timing,
        which &mdash; on a program where the totals are engineered to land on the same number
        &mdash; is the entire ballgame.
      </p>
    </div>
  </Step>

  {#if step >= 5 && term}
    <section class="timeline-section">
      <div class="head">
        <div class="eyebrow">// thirty-six months</div>
        <h2>Every month, one row at a time</h2>
        <p class="lede">
          Your first payment lands about thirty days after you walk out of the store, so month zero
          costs you {money0(chosen.summary.today)}. The panel follows you down the page: what
          you&rsquo;ve paid, what that is worth in today&rsquo;s dollars, and what it would cost to
          own the phone outright at that exact moment.
        </p>
      </div>

      <Timeline scenario={chosen} {baseline} decisionAt={term} decision={decisionCard} />
    </section>

    {#snippet decisionCard()}
      <div class="decide">
        <div class="decide-head">
          <span class="eyebrow">// month {term}</span>
          <h3>The lease is up. Now what?</h3>
          <p>
            Four doors, and Apple opens one of them for you if you ignore all four. Pick one and the
            rest of the timeline above rewrites itself.
          </p>
        </div>

        <Tiles options={endOptions} bind:value={endChoice} name="end" min="165px" />

        <div class="decide-detail">
          {#if endChoice === 'return'}
            <p>
              <strong>Hand it back.</strong> You have paid {money0(
                gross * (term ?? 24) - (hasTradeIn === 'yes' ? tradeIn : 0)
              )} in cash plus whatever you traded in, you owe nothing more, and you were only ever taxed
              on the {Math.round((term ?? 24) === 12 ? 50 : 70)}% you actually paid. You also have
              no phone, which is why the comparison below tracks cost per month of phone rather than
              cost flat.
            </p>
          {:else if endChoice === 'upgrade'}
            <p>
              <strong>Upgrade.</strong> Return this one, sign a fresh lease on a new one. No
              trade-in is allowed on an upgrade, so the new payment is the full undiscounted rate
              &mdash;
              {money(gross)} rather than the {money(netPayment)} you had been paying. Apple&rsquo;s own
              terms warn that &ldquo;your new monthly payments may be greater than your prior monthly
              payments,&rdquo; and this is why.
            </p>
            <p>
              Watch what this does to the bottom of the comparison. Three years in you are twelve
              months into a fresh lease, and a 24-month lease has only collected 35% of the sticker
              by month twelve &mdash; so the buyout is still <em>above</em> what that phone would fetch
              used. You will have paid more than any other path here and you own nothing. That is the
              actual trade: a new phone every couple of years, forever, for payments that never stop.
            </p>
          {:else if endChoice === 'buyout'}
            <p>
              <strong>Buy it.</strong> One payment of {money0(residual)} plus tax and it is yours. Your
              all-in total lands at exactly the sticker price &mdash; you financed a phone at 0% for {term}
              months and then settled up. If the phone is worth more than {money0(residual)} used, and
              it very likely is, this beats handing it back.
            </p>
          {:else}
            <p>
              <strong>Do nothing.</strong> The lease converts to month-to-month. Payments continue
              at
              {money(gross)} &mdash; the un-credited rate, so it may be higher than what you were paying
              &mdash; for up to six months, and then Klarna charges the remaining
              {money0(buyoutAfter(extensionEnd, listPrice, gross, 0, term ?? 24))} to your card and you
              own it. Same total as buying it, {EXTENSION_MONTHS} months later, decided by inertia.
            </p>
          {/if}
        </div>

        <p class="decide-foot">
          Whichever you pick, you have six months to pick it. Apple says it will tell you when
          you&rsquo;re eligible. And the early exit that is <em>not</em> on this list &mdash;
          bailing out before month {term} &mdash; costs every remaining payment through the end of the
          term, not a prorated share of it.
        </p>
      </div>
    {/snippet}

    <section class="compare-section">
      <div class="head">
        <div class="eyebrow">// five ways to pay</div>
        <h2>The same phone, five ways</h2>
        <p class="lede">
          Every column uses the numbers you entered above, over the same 36 months, ending with the
          same question: what did this cost, and what do you have to show for it? The lease columns
          use the ending you picked.
        </p>
      </div>

      <Compare {scenarios} highlight={`upgrade-${term}`} />

      <div class="notes">
        <div class="note-card">
          <h3>Pay cash</h3>
          <p>
            The most expensive option in today&rsquo;s dollars and the cheapest in every other
            sense. You hand over the full price plus tax on day one, collect your 3%, and never
            think about it again. No credit check, no carrier requirement, no return inspection, no
            Klarna.
          </p>
        </div>
        <div class="note-card">
          <h3>Apple Card, 24 months at 0%</h3>
          <p>
            Financing the tax-inclusive total over 24 months at zero interest while still earning 3%
            Daily Cash up front. This is the one the lease has to beat, and on a strict
            dollars-and-timing basis it is very hard to beat, because it does what the lease does
            without giving up the rewards.
          </p>
        </div>
        <div class="note-card">
          <h3>Apple Upgrade, 12 or 24 months</h3>
          <p>
            The lowest monthly payment and the lowest day-one cost, in exchange for a device you do
            not own, a carrier you must attach, a card you probably cannot use, and a decision
            waiting for you at the end. Its unique value is the option to walk away &mdash; which is
            worth real money only if the phone depreciates faster than Apple assumed.
          </p>
        </div>
        <div class="note-card">
          <h3>Carrier financing, 36 months</h3>
          <p>
            Usually the lowest sticker of all, because the promo credits are enormous. They are also
            the leash: the credits arrive monthly across three years and evaporate if you leave, and
            you pay the entire sales tax bill on day one. Put a real promo in the credits field
            above and this column will win outright &mdash; at the price of thirty-six months of
            loyalty.
          </p>
        </div>
      </div>
    </section>

    <section class="catches">
      <div class="head">
        <div class="eyebrow">// read this part</div>
        <h2>The catches, in plain language</h2>
      </div>

      <ol>
        <li>
          <h3>Leaving early costs the whole schedule</h3>
          <p>
            The early termination fee is the total of every unpaid monthly payment through the end
            of the initial term, plus taxes and fees. Not a prorated buyout &mdash; the rest of the
            contract. The only free exit is the 14-day window after you receive the device.
          </p>
        </li>
        <li>
          <h3>You must attach a carrier</h3>
          <p>
            AT&amp;T, T-Mobile, or Verizon, and no prepaid plans. The phone itself stays unlocked
            and you can switch later, but you cannot complete the lease without picking one at
            checkout. iPad, Mac, and Watch leases have no such requirement.
          </p>
        </li>
        <li>
          <h3>Klarna is picky about cards</h3>
          <p>
            No AMEX, no UnionPay, and no cards issued by Chase or Capital One. No Apple Pay, no
            PayPal. Debit works. Whatever card you were planning to earn rewards on, check it first
            &mdash; this quietly costs more than any other line item here.
          </p>
        </li>
        <li>
          <h3>Losing the phone does not end the lease</h3>
          <p>
            Without AppleCare+ with Theft and Loss, a stolen device leaves you paying the early
            termination fee or the purchase option fee on a phone you do not have. Payments continue
            until you settle one of them.
          </p>
        </li>
        <li>
          <h3>The damage fee is undisclosed</h3>
          <p>
            &ldquo;Good working condition&rdquo; is the standard and Apple has not published what
            failing it costs. That is an open-ended liability on every lease without AppleCare.
          </p>
        </li>
        <li>
          <h3>You cannot buy the payment down</h3>
          <p>
            No down payments. The trade-in is the only lever, it only applies to the initial term,
            and you cannot use another one when you upgrade.
          </p>
        </li>
        <li>
          <h3>Inaction has a default, and it is a purchase</h3>
          <p>
            Six months past the term with no decision and Klarna charges your card the purchase
            option fee. This happens to be the mathematically fine outcome, which makes it easy to
            miss that it happens without your say-so.
          </p>
        </li>
        <li>
          <h3>It is a lease, not a loan</h3>
          <p>
            Applying is a soft credit pull, but the resulting account is a lease with Klarna, and
            you do not own the device at any point before the purchase option fee is paid. Not
            available on refurbished devices, or through education, business, government, or
            employee purchase programs.
          </p>
        </li>
      </ol>
    </section>

    <section class="assumptions">
      <div class="head">
        <div class="eyebrow">// show your work</div>
        <h2>Assumptions</h2>
      </div>
      <ul>
        <li>
          Lease payments are derived as 50% (12-month) or 70% (24-month) of the sticker price,
          divided by the term and rounded to the nearest x.99. This reproduces all four of
          Apple&rsquo;s published iPhone examples exactly. If your actual quote differs, the shape
          of the answer will not.
        </li>
        <li>
          The purchase option fee is treated as list price minus every dollar of credit applied to
          the device, including unused trade-in credit. Apple&rsquo;s wording &mdash; &ldquo;list
          price minus any lease payments you&rsquo;ve made minus any remaining discounts or trade-in
          credit&rdquo; &mdash; read strictly would charge you for the trade-in twice and break
          Apple&rsquo;s own promise that you never pay more than full price. This is the reading
          that keeps that promise true.
        </li>
        <li>
          Sales tax is applied to each lease payment and to the buyout, which is how leases are
          normally taxed. Buying outright taxes the whole thing on day one; carrier financing does
          the same. Your state may differ, and a few tax the trade-in credit too.
        </li>
        <li>
          Trade-in credit is modeled as a credit against the order total on the purchase paths, and
          as a reduction to the monthly payment on the lease, per the FAQ.
        </li>
        <li>
          Present values discount monthly at your annual rate divided by twelve. Card rewards are
          netted against the month they are earned.
        </li>
        <li>
          Resale values are guesses seeded from the list price, and are the softest number on the
          page. They only affect the &ldquo;net cost&rdquo; and &ldquo;per month&rdquo; rows &mdash;
          everything above those is contractual.
        </li>
        <li>
          The upgrade path assumes a replacement device at the same price on the same lease terms,
          with no trade-in, because Apple does not allow one.
        </li>
      </ul>
      <p class="disclaimer">
        Not affiliated with Apple or Klarna. Every number here is derived from Apple&rsquo;s
        published Apple Upgrade FAQ and footnotes; nothing is an offer, and your actual quote is the
        one that counts. Check it against this and see if it lines up.
      </p>
    </section>
  {/if}
</article>

<style>
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
    margin: 0;
    max-width: 62ch;
    font-size: 17px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }

  .thesis {
    margin-top: 34px;
    max-width: 64ch;
    border-left: 3px solid var(--accent);
    border-radius: 0 12px 12px 0;
    background: color-mix(in oklch, var(--accent) 8%, var(--surface));
    padding: 22px 26px;
  }
  .thesis p {
    margin: 0 0 12px;
    font-size: 15.5px;
    line-height: 1.7;
    text-wrap: pretty;
  }
  .thesis p:last-child {
    margin-bottom: 0;
  }
  .thesis em {
    color: var(--accent);
    font-style: normal;
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
  .aside h3 ~ h3 {
    margin-top: 18px;
  }
  .aside p {
    margin: 0 0 11px;
    font-size: 14.5px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }
  .aside p:last-child {
    margin-bottom: 0;
  }
  .aside strong {
    color: var(--text);
    font-weight: 560;
  }
  .aside em {
    font-style: italic;
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

  .timeline-section {
    border-top: 1px solid var(--border);
  }

  /* End-of-term decision, rendered inline in the timeline */
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
  .decide-head p {
    margin: 0;
    max-width: 58ch;
    font-size: 14.5px;
    line-height: 1.65;
    color: var(--muted);
    text-wrap: pretty;
  }
  .decide-detail {
    padding-top: 18px;
  }
  .decide-detail p {
    margin: 0;
    max-width: 62ch;
    font-size: 14.5px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }
  .decide-detail strong {
    color: var(--text);
    font-weight: 580;
  }
  .decide-foot {
    margin: 18px 0 0;
    border-top: 1px solid color-mix(in oklch, var(--accent) 30%, transparent);
    padding-top: 14px;
    max-width: 62ch;
    font-size: 13px;
    line-height: 1.65;
    color: var(--faint);
    text-wrap: pretty;
  }

  /* Comparison notes */
  .notes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 18px;
    padding-top: 32px;
  }
  .note-card {
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    padding: 18px;
  }
  .note-card h3 {
    margin: 0 0 8px;
    font-family: var(--font-body);
    font-weight: 580;
    font-size: 14.5px;
    letter-spacing: -0.01em;
  }
  .note-card p {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.65;
    color: var(--muted);
    text-wrap: pretty;
  }

  /* Catches */
  .catches ol {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 26px 34px;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: catch;
  }
  .catches li {
    counter-increment: catch;
    border-top: 1px solid var(--border);
    padding-top: 14px;
  }
  .catches li::before {
    content: counter(catch, decimal-leading-zero);
    font-family: var(--font-mono);
    font-weight: 480;
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--accent);
  }
  .catches h3 {
    margin: 6px 0 7px;
    font-family: var(--font-body);
    font-weight: 580;
    font-size: 16px;
    letter-spacing: -0.01em;
  }
  .catches p {
    margin: 0;
    font-size: 14px;
    line-height: 1.68;
    color: var(--muted);
    text-wrap: pretty;
  }

  /* Assumptions */
  .assumptions ul {
    margin: 0;
    max-width: 68ch;
    padding-left: 18px;
  }
  .assumptions li {
    margin-bottom: 12px;
    font-size: 14px;
    line-height: 1.68;
    color: var(--muted);
    text-wrap: pretty;
  }
  .assumptions li::marker {
    color: var(--faint);
  }
  .disclaimer {
    margin: 26px 0 0;
    max-width: 68ch;
    border-top: 1px solid var(--border);
    padding-top: 16px;
    font-size: 13px;
    line-height: 1.65;
    color: var(--faint);
    text-wrap: pretty;
  }

  @media (max-width: 640px) {
    .hero {
      padding-top: 56px;
    }
    h1 {
      font-size: 34px;
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
