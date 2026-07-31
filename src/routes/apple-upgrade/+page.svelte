<script lang="ts">
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import ChoiceCard from './ChoiceCard.svelte';
  import MobileSummaryBar from './MobileSummaryBar.svelte';
  import MoneyInput from './MoneyInput.svelte';
  import SummaryPanel from './SummaryPanel.svelte';
  import Timeline from './Timeline.svelte';
  import {
    DEFAULT_INPUTS,
    DEVICE_PRESETS,
    buildScenarios,
    fmtMoney,
    leasePayment,
    type EndDecision,
    type UpgradeInputs
  } from './upgrade';

  const STORAGE_KEY = 'apple-upgrade-calculator';

  interface SavedState {
    inputs: Partial<UpgradeInputs>;
    term: 12 | 24;
  }

  function loadState(): SavedState | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SavedState;
    } catch {
      return null;
    }
  }

  const saved = loadState();
  let inputs = $state<UpgradeInputs>({ ...DEFAULT_INPUTS, ...saved?.inputs });
  let term = $state<12 | 24>(saved?.term ?? 12);
  let throughMonth = $state<number | null>(null);

  $effect(() => {
    const state: SavedState = { inputs: $state.snapshot(inputs), term };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  });

  function reset() {
    inputs = { ...DEFAULT_INPUTS };
    term = 12;
  }

  const scenarios = $derived(buildScenarios(inputs));
  const lease = $derived(scenarios.find((s) => s.id === (term === 12 ? 'lease12' : 'lease24'))!);
  const outright = $derived(scenarios.find((s) => s.id === 'outright')!);

  const base = $derived(term === 12 ? inputs.payment12 : inputs.payment24);
  const monthly = $derived(leasePayment(base, inputs.tradeIn, term));

  function setDecision(decision: EndDecision) {
    if (term === 12) inputs.decision12 = decision;
    else inputs.decision24 = decision;
  }

  const decision = $derived(term === 12 ? inputs.decision12 : inputs.decision24);
</script>

<svelte:head>
  <title>Apple Upgrade Calculator - Martin Emde</title>
  <meta
    name="description"
    content="Should you lease your next iPhone? Walk through Apple's new Upgrade program month by month and compare it against buying outright, Apple Card financing, and your carrier."
  />
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-4 pb-24 lg:p-8">
  <Breadcrumbs
    crumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Apple Upgrade Calculator' }]}
  />

  <header class="max-w-3xl space-y-4">
    <h1 class="h1 text-surface-950-50">Should you lease your next iPhone?</h1>
    <p class="text-surface-700-300">
      Apple Upgrade is Apple's first device <em>lease</em> — low monthly payments for 12 or 24 months,
      run by Klarna, with your phone handed back at the end. It's not a loan and you never own the device
      unless you pay a fee at the end. So when is it a good deal?
    </p>
    <p class="text-surface-700-300">
      Build your checkout below, then scroll through three years of payments month by month. The
      panel on the right keeps score in today's dollars, and compares the lease against buying
      outright, Apple Card's 0% financing, and your carrier.
    </p>
  </header>

  <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
    <div class="min-w-0 space-y-12">
      <!-- Step 1: device -->
      <section class="space-y-4">
        <h2 class="h3 text-surface-950-50">
          <span class="text-primary-600-400">1.</span> Pick your iPhone
        </h2>
        <p class="text-sm text-surface-600-400">
          These are Apple's advertised lease payments. The 12-month lease collects about half the
          list price; the 24-month about 70%. The rest is what Apple keeps when you hand the phone
          back — unless you pay the purchase option fee.
        </p>
        <div class="grid gap-2 sm:grid-cols-2">
          {#each DEVICE_PRESETS as preset (preset.name)}
            <ChoiceCard
              title={preset.name}
              price="{fmtMoney(preset.payment12)}/mo · 12 mo — {fmtMoney(
                preset.payment24
              )}/mo · 24 mo"
              description="List price {fmtMoney(preset.price)}"
              selected={inputs.price === preset.price &&
                inputs.payment12 === preset.payment12 &&
                inputs.payment24 === preset.payment24}
              onclick={() => {
                inputs.price = preset.price;
                inputs.payment12 = preset.payment12;
                inputs.payment24 = preset.payment24;
                inputs.nextPrice = preset.price;
              }}
            />
          {/each}
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <MoneyInput label="List price" bind:value={inputs.price} />
          <MoneyInput label="12-mo payment" bind:value={inputs.payment12} step={0.01} />
          <MoneyInput label="24-mo payment" bind:value={inputs.payment24} step={0.01} />
        </div>
        <div class="max-w-xs">
          <MoneyInput
            label="Next iPhone's price"
            bind:value={inputs.nextPrice}
            hint="What you assume the phone you'd upgrade into will cost"
          />
        </div>
      </section>

      <!-- Step 2: trade-in -->
      <section class="space-y-4">
        <h2 class="h3 text-surface-950-50">
          <span class="text-primary-600-400">2.</span> Got a trade-in?
        </h2>
        <p class="text-sm text-surface-600-400">
          A trade-in lowers every payment of your <em>first</em> lease: Apple spreads the credit
          evenly across the term. A $375 trade-in turns {fmtMoney(49.99)} into
          {fmtMoney(leasePayment(49.99, 375, 12))} on a 12-month lease. Trade-in worth more than the whole
          term of payments? The extra comes back as an Apple gift card. The catch: you can't trade in
          when you upgrade, so every later lease costs the full payment.
        </p>
        <div class="grid gap-2 sm:grid-cols-2">
          <ChoiceCard
            title="No trade-in"
            description="Straight lease at the advertised payment."
            selected={inputs.tradeIn === 0}
            onclick={() => (inputs.tradeIn = 0)}
          />
          <ChoiceCard
            title="I have a phone to trade"
            description="Credit spreads across your first lease term only."
            selected={inputs.tradeIn > 0}
            onclick={() => {
              if (inputs.tradeIn === 0) inputs.tradeIn = 375;
            }}
          />
        </div>
        {#if inputs.tradeIn > 0}
          <div class="max-w-xs">
            <MoneyInput
              label="Trade-in value"
              bind:value={inputs.tradeIn}
              hint="Check apple.com/shop/trade-in for your device's estimate"
            />
          </div>
          <p class="text-sm text-surface-600-400">
            Your payment: <strong class="text-surface-950-50">{fmtMoney(monthly)}/mo</strong>
            ({fmtMoney(base)} − {fmtMoney(inputs.tradeIn / term)} credit). If Klarna decides your trade-in
            isn't in good condition, they raise the payment back up.
          </p>
        {/if}
      </section>

      <!-- Step 3: term -->
      <section class="space-y-4">
        <h2 class="h3 text-surface-950-50">
          <span class="text-primary-600-400">3.</span> Choose your lease term
        </h2>
        <p class="text-sm text-surface-600-400">
          Shorter term, bigger payments, newer phone every year. Longer term, smaller payments, and
          Apple keeps a smaller slice when you return it — 24 payments collect ~70% of the list
          price, 12 collect ~50%.
        </p>
        <div class="grid gap-2 sm:grid-cols-2">
          <ChoiceCard
            title="12 months — new phone every year"
            price="{fmtMoney(leasePayment(inputs.payment12, inputs.tradeIn, 12))}/mo"
            description="Return or upgrade after a year. Total: {fmtMoney(
              leasePayment(inputs.payment12, inputs.tradeIn, 12) * 12
            )} of {fmtMoney(inputs.price)}."
            selected={term === 12}
            onclick={() => (term = 12)}
          />
          <ChoiceCard
            title="24 months — keep it two years"
            price="{fmtMoney(leasePayment(inputs.payment24, inputs.tradeIn, 24))}/mo"
            description="Return or upgrade after two years. Total: {fmtMoney(
              leasePayment(inputs.payment24, inputs.tradeIn, 24) * 24
            )} of {fmtMoney(inputs.price)}."
            selected={term === 24}
            onclick={() => (term = 24)}
          />
        </div>
      </section>

      <!-- Step 4: AppleCare -->
      <section class="space-y-4">
        <h2 class="h3 text-surface-950-50">
          <span class="text-primary-600-400">4.</span> AppleCare? It's not included
        </h2>
        <p class="text-sm text-surface-600-400">
          The lease doesn't include coverage, and the phone must come back in good condition or
          you'll owe a damage fee. AppleCare is billed separately by Apple (not Klarna), and you
          have 60 days after enrolling to add it.
        </p>
        <div class="grid gap-2 sm:grid-cols-2">
          <ChoiceCard
            title="No AppleCare"
            description="Risk a damage fee at return if it's not in good condition."
            selected={inputs.appleCare === 'none'}
            onclick={() => (inputs.appleCare = 'none')}
          />
          <ChoiceCard
            title="AppleCare One"
            price="{fmtMoney(inputs.acOneMonthly)}/mo"
            description="Covers up to 3 devices — add your leased iPhone when you enroll."
            selected={inputs.appleCare === 'one'}
            onclick={() => (inputs.appleCare = 'one')}
          />
          <ChoiceCard
            title="AppleCare+ monthly"
            price="{fmtMoney(inputs.acPlusMonthly)}/mo"
            description="Theft & Loss included. Cancel when you leave the lease."
            selected={inputs.appleCare === 'monthly'}
            onclick={() => (inputs.appleCare = 'monthly')}
          />
          <ChoiceCard
            title="AppleCare+ annual"
            price="{fmtMoney(inputs.acPlusAnnual)}/yr"
            description="Prepaid each year you keep coverage."
            selected={inputs.appleCare === 'annual'}
            onclick={() => (inputs.appleCare = 'annual')}
          />
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <MoneyInput
            label="AppleCare One"
            bind:value={inputs.acOneMonthly}
            step={0.01}
            hint="per month"
          />
          <MoneyInput
            label="AppleCare+ monthly"
            bind:value={inputs.acPlusMonthly}
            step={0.01}
            hint="per month"
          />
          <MoneyInput
            label="AppleCare+ annual"
            bind:value={inputs.acPlusAnnual}
            step={0.01}
            hint="per year"
          />
        </div>
        {#if inputs.appleCare === 'none'}
          <div class="max-w-xs">
            <MoneyInput
              label="Expected damage fee"
              bind:value={inputs.damageFee}
              hint="Out-of-coverage screen repair runs ~$379. 0 if you're careful."
            />
          </div>
        {/if}
      </section>

      <!-- Step 5: your numbers -->
      <section class="space-y-4">
        <h2 class="h3 text-surface-950-50">
          <span class="text-primary-600-400">5.</span> Make it yours
        </h2>
        <p class="text-sm text-surface-600-400">
          The fine print that changes the answer. Sales tax hits the full price up front when you
          buy or finance, but the lease is taxed on each monthly payment — how most states tax
          leases — so its tax trickles out over time (and your trade-in credit lowers it).
        </p>
        <div class="grid gap-3 sm:grid-cols-3">
          <MoneyInput label="Sales tax" bind:value={inputs.taxRate} mode="percent" step={0.25} />
          <MoneyInput
            label="Carrier activation"
            bind:value={inputs.activationFee}
            hint="Charged per new device, upgrades included"
          />
          <MoneyInput label="Case & accessories" bind:value={inputs.caseCost} />
          <MoneyInput
            label="Your card's cash back"
            bind:value={inputs.cashBackPct}
            mode="percent"
            step={0.5}
            hint="Klarna takes most cards — but not Amex, Chase, or Capital One"
          />
          <MoneyInput
            label="Discount rate"
            bind:value={inputs.discountRatePct}
            mode="percent"
            step={0.5}
            hint="What your cash could earn instead (for NPV)"
          />
          <MoneyInput
            label="Phone's value after 3 years"
            bind:value={inputs.residualPct}
            mode="percent"
            step={5}
            hint="Resale/trade value when you own it — the lease gives this to Apple"
          />
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="space-y-1">
            <span class="text-sm font-medium text-surface-950-50">Carrier trade-in style</span>
            <div class="grid grid-cols-2 gap-2">
              <ChoiceCard
                title="Bill credits / 36 mo"
                selected={inputs.carrierMode === 'bill-credit'}
                onclick={() => (inputs.carrierMode = 'bill-credit')}
              />
              <ChoiceCard
                title="Instant credit"
                selected={inputs.carrierMode === 'instant'}
                onclick={() => (inputs.carrierMode = 'instant')}
              />
            </div>
          </div>
          <MoneyInput
            label="Carrier promo credit"
            bind:value={inputs.carrierPromoMonthly}
            hint="per month, if your carrier is running a deal"
          />
        </div>
      </section>

      <!-- Timeline -->
      <section class="space-y-4">
        <h2 class="h3 text-surface-950-50">Now scroll through three years</h2>
        <p class="text-sm text-surface-600-400">
          Here's your {term}-month lease at
          <strong class="text-surface-950-50">{fmtMoney(monthly)}/mo</strong>, month by month,
          against the cost of just buying the phone. When the lease ends you'll face a decision —
          pick it in the timeline and the totals on the right update. The counter shows what each
          path has cost you <em>so far, in today's dollars</em>.
        </p>
        <Timeline
          {lease}
          {outright}
          {term}
          {decision}
          ondecision={setDecision}
          {inputs}
          onMonthChange={(m) => (throughMonth = m)}
        />
      </section>

      <!-- Catches -->
      <section
        class="rounded-xl border border-surface-300-700 bg-surface-100-900/40 p-4"
        aria-labelledby="catches-heading"
      >
        <h2 id="catches-heading" class="text-sm font-semibold text-surface-950-50">
          Catches worth knowing
        </h2>
        <ul
          class="mt-2 grid list-disc gap-x-6 gap-y-1.5 pl-4 text-xs leading-relaxed text-surface-600-400 sm:grid-cols-2"
        >
          <li>Klarna runs the lease and doesn't take Amex, Chase, or Capital One cards.</li>
          <li>
            iPhone leases require AT&amp;T, T-Mobile, or Verizon at signup (the phone itself is
            unlocked).
          </li>
          <li>14-day return window; after that, leaving early costs every remaining payment.</li>
          <li>
            Trade-in credit applies to your first lease only — upgrades start at the full payment.
          </li>
          <li>
            Wait out the 6-month decision window and Klarna charges the purchase option fee
            automatically.
          </li>
          <li>
            Advertised lease payments exclude sales tax — most states add it to each monthly
            payment.
          </li>
        </ul>
      </section>
    </div>

    <!-- Sidebar -->
    <aside class="mt-10 lg:mt-0">
      <div class="space-y-4 lg:sticky lg:top-20">
        <div class="hidden lg:block">
          <SummaryPanel {scenarios} discountRatePct={inputs.discountRatePct} {throughMonth} />
        </div>

        <button
          type="button"
          onclick={reset}
          class="w-full rounded-md border border-surface-300-700 px-4 py-2 text-sm font-medium text-surface-700-300 hover:bg-surface-200-800/40"
        >
          Reset everything to defaults
        </button>
      </div>
    </aside>
  </div>

  <footer class="max-w-3xl space-y-3 border-t border-surface-200-800 pt-6">
    <h2 class="h4 text-surface-950-50">How the math works</h2>
    <p class="text-sm text-surface-600-400">
      <strong class="text-surface-950-50">Today's dollars (NPV)</strong> discount every future
      payment back to the present at your discount rate, because $50 next year costs you less than
      $50 today. The biggest difference between these paths isn't how much you pay — it's
      <em>when</em>. Buying concentrates the cost on day one; the lease and financing spread it out.
    </p>
    <p class="text-sm text-surface-600-400">
      <strong class="text-surface-950-50">The purchase option fee</strong> is the list price minus the
      scheduled lease payments — and a trade-in pays down that same schedule, so at term end you always
      owe ~50% of list on a 12-month lease or ~30% on a 24-month one, no matter how big your trade-in
      was. Lease-then-buy therefore costs list minus your trade-in (before tax). What the lease really
      sells you is the option to hand the phone back: on a 12-month term you pay ~50% of list for a year
      of use, and Apple keeps the phone's remaining value.
    </p>
    <p class="text-sm text-surface-600-400">
      Payments are Apple's advertised Apple Upgrade amounts; verify your quote at checkout. Owned
      phones are credited at your "value after 3 years" setting at month 36 so the comparison
      accounts for what you still hold.
    </p>
  </footer>
</div>

<MobileSummaryBar {scenarios} discountRatePct={inputs.discountRatePct} {throughMonth} />
