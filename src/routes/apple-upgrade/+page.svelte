<script lang="ts">
  import { tick } from 'svelte';
  import { PhoneOff, Smartphone } from 'lucide-svelte';
  import Step from '$lib/components/upgrade/Step.svelte';
  import Tiles from '$lib/components/upgrade/Tiles.svelte';
  import Field from '$lib/components/upgrade/Field.svelte';
  import Ledger from '$lib/components/upgrade/Ledger.svelte';
  import Compare from '$lib/components/upgrade/Compare.svelte';
  import {
    allScenarios,
    bestUpgradeEstimate,
    closeOut,
    appleUpgrade,
    leaseTerms,
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

  // Apple maximum offers from the supplied 2026-09-20 trade-in list.
  const TRADE_IN_DEVICES = [
    ['iPhone 17 Pro Max', 885],
    ['iPhone 17 Pro', 785],
    ['iPhone Air', 585],
    ['iPhone 17', 585],
    ['iPhone 16 Pro Max', 610],
    ['iPhone 16 Pro', 510],
    ['iPhone 16 Plus', 430],
    ['iPhone 16', 430],
    ['iPhone 16e', 270],
    ['iPhone 15 Pro Max', 455],
    ['iPhone 15 Pro', 370],
    ['iPhone 15 Plus', 315],
    ['iPhone 15', 305],
    ['iPhone 14 Pro Max', 360],
    ['iPhone 14 Pro', 285],
    ['iPhone 14 Plus', 210],
    ['iPhone 14', 195],
    ['iPhone SE (3rd generation)', 75],
    ['iPhone 13 Pro Max', 320],
    ['iPhone 13 Pro', 255],
    ['iPhone 13', 175],
    ['iPhone 13 mini', 145],
    ['iPhone 12 Pro Max', 210],
    ['iPhone 12 Pro', 165],
    ['iPhone 12', 120],
    ['iPhone 12 mini', 80],
    ['iPhone SE (2nd generation)', 40],
    ['iPhone 11 Pro Max', 140],
    ['iPhone 11 Pro', 125],
    ['iPhone 11', 100],
    ['iPhone XS Max', 85],
    ['iPhone XS', 60],
    ['iPhone XR', 75],
    ['iPhone X', 50],
    ['iPhone 8 Plus', 35],
    ['Galaxy S22 Ultra 5G', 125],
    ['Galaxy S22+ 5G', 80],
    ['Galaxy S22 5G', 80],
    ['Galaxy S21 Ultra 5G', 95],
    ['Galaxy S21+ 5G', 70],
    ['Galaxy S21 5G', 55],
    ['Google Pixel 9 Pro XL', 290],
    ['Google Pixel 9 Pro', 275],
    ['Google Pixel 9', 200],
    ['Google Pixel 8 Pro', 150],
    ['Google Pixel 8', 115],
    ['Google Pixel 8a', 105],
    ['Google Pixel 7 Pro', 90],
    ['Google Pixel 7', 65],
    ['OnePlus 13', 250],
    ['OnePlus 13R', 165],
    ['Other — Recycling', 0]
  ] as const;

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
    tradeInDevice: string;
    privateSaleValues: number[] | null;
    annualChoices: ('upgrade' | 'keep' | null)[];
    leaseUpgradeChoices: Record<string, 'return' | 'buyout'>;
    finalChoices: Record<string, 'return' | 'buyout'>;
    finalEnding: 'own' | 'walkaway';
    finalSaleEstimate: number | null;
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
    tradeInDevice: '',
    privateSaleValues: null,
    annualChoices: [null, null, null],
    leaseUpgradeChoices: {},
    finalChoices: {},
    finalEnding: 'own',
    finalSaleEstimate: null,
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
        tradeInDevice: saved.tradeInDevice ?? (saved.hasTradeIn === 'yes' ? 'custom' : ''),
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
  let tradeInDevice = $state(initial.tradeInDevice);
  const selectedTradeIn = $derived(
    tradeInDevice === ''
      ? ''
      : TRADE_IN_DEVICES.some(([name, value]) => name === tradeInDevice && value === tradeIn)
        ? tradeInDevice
        : 'custom'
  );
  let annualChoices = $state(initial.annualChoices);
  let leaseUpgradeChoices = $state(initial.leaseUpgradeChoices);
  let finalChoices = $state(initial.finalChoices);
  let finalEnding = $state(initial.finalEnding);
  let finalSaleEstimate = $state(initial.finalSaleEstimate);
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
    tradeInDevice = DEFAULTS.tradeInDevice;
    annualChoices = [...DEFAULTS.annualChoices];
    leaseUpgradeChoices = {};
    finalChoices = {};
    finalEnding = 'own';
    finalSaleEstimate = null;
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
      tradeInDevice,
      privateSaleValues,
      annualChoices,
      leaseUpgradeChoices,
      finalChoices,
      finalEnding,
      finalSaleEstimate,
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
  const tradeInAnswered = $derived(
    hasTradeIn === 'no' || (hasTradeIn === 'yes' && tradeInDevice !== '')
  );
  const step = $derived(!deviceKey ? 1 : !tradeInAnswered ? 2 : appleCare === null ? 3 : 4);

  // -1 until the first effect run, so restoring a finished form doesn't fling
  // you down the page on load. Only genuine forward progress scrolls.
  let seen = -1;
  let previousAnswers: (string | null)[] | undefined;
  $effect(() => {
    const now = step;
    const answers = [deviceKey, hasTradeIn, tradeInDevice, appleCare];
    const previous = previousAnswers;
    previousAnswers = answers;
    const focusId = !previous
      ? null
      : deviceKey === 'custom' && deviceKey !== previous[0]
        ? 'custom-price'
        : hasTradeIn === 'yes' && hasTradeIn !== previous[1]
          ? 'trade-in-phone'
          : tradeInDevice === 'custom' && tradeInDevice !== previous[2]
            ? 'trade-in-value'
            : appleCare !== null && appleCare !== 'none' && appleCare !== previous[3]
              ? 'care-price'
              : null;
    if (focusId) {
      seen = Math.max(seen, now);
      void tick().then(() => document.getElementById(focusId)?.focus());
      return;
    }
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
    leaseUpgradeChoices,
    carrierOffer: hasTradeIn === 'yes' ? carrierOffer : null,
    upgradeMonths: annualChoices.flatMap((choice, index) =>
      choice === 'upgrade' ? [(index + 1) * 12] : []
    ),
    carrierTerm: 36
  });

  const repairPrice = $derived(screenRepairPrice(inputs));
  const alternativeRepairPrice = $derived(
    screenRepairPrice({
      ...inputs,
      appleCare: appleCare === 'none' ? 'monthly' : 'none'
    })
  );
  const finalAge = $derived((HORIZON - Math.max(0, ...inputs.upgradeMonths!)) / 12);
  const finalSaleOffer = $derived(
    finalSaleEstimate ?? (privateSaleValues ?? upgradeTradeIns)[finalAge - 1]
  );
  function finishScenario(scenario: ReturnType<typeof appleUpgrade>) {
    return closeOut(
      inputs,
      scenario,
      finalEnding === 'own' ? 'buyout' : finalChoices[scenario.key],
      finalEnding === 'walkaway' ? finalSaleOffer : undefined
    );
  }
  const scenarios = $derived(allScenarios(inputs).map(finishScenario));
  const story = $derived(beats(inputs));

  const leaseOptions = $derived(
    annualChoices.map((choice, index) => {
      if (choice !== 'upgrade') return [];
      const month = (index + 1) * 12;
      return ([12, 24] as const).flatMap((term) => {
        const key = `${term}:${month}`;
        const returning = appleUpgrade({
          ...inputs,
          term,
          leaseUpgradeChoices: { ...leaseUpgradeChoices, [key]: 'return' }
        });
        const exit = returning.rows[month].leaseReturn;
        if (!exit) return [];
        const buying = appleUpgrade({
          ...inputs,
          term,
          leaseUpgradeChoices: { ...leaseUpgradeChoices, [key]: 'buyout' }
        });
        const next = leaseTerms(listPrice, term, exit.privateSale ? 0 : exit.value);
        return [
          {
            key,
            term,
            ...exit,
            payment: next.payment,
            refund: next.refund,
            saving: finishScenario(returning).summary.npv - finishScenario(buying).summary.npv
          }
        ];
      });
    })
  );

  /** How far down the ledger the reader is allowed before answering. */
  const unansweredYear = $derived(annualChoices.findIndex((choice) => choice === null));
  const ledgerLimit = $derived(unansweredYear < 0 ? HORIZON : (unansweredYear + 1) * 12 - 1);
  const upgradeFrequency = $derived(
    ([1, 2, 3] as const).find((frequency) =>
      annualChoices.every(
        (choice, index) => choice === ((index + 1) % frequency === 0 ? 'upgrade' : 'keep')
      )
    ) ?? null
  );
  const frequencyOptions = $derived(
    ([1, 2, 3] as const).map((frequency) => {
      const estimate = bestUpgradeEstimate(
        inputs,
        frequency,
        finalEnding,
        finalSaleEstimate ?? undefined
      );
      return {
        value: frequency,
        label: frequency === 1 ? 'Every year' : `Every ${frequency} years`,
        sub: `${money0(estimate.annualCost)}/year`,
        note: `Best case · ${estimate.plan}`
      };
    })
  );

  function chooseFrequency(frequency: number | null) {
    if (frequency === null) return;
    for (let index = 0; index < annualChoices.length; index++) {
      chooseYear(index, (index + 1) % frequency === 0 ? 'upgrade' : 'keep');
    }
  }

  function chooseYear(index: number, choice: 'upgrade' | 'keep') {
    if (annualChoices[index] === choice) return;
    finalChoices = {};
    annualChoices = annualChoices.map((old, i) => (i < index ? old : i === index ? choice : null));
    leaseUpgradeChoices = Object.fromEntries(
      Object.entries(leaseUpgradeChoices).filter(
        ([key]) => Number(key.split(':')[1]) < (index + 1) * 12
      )
    );
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
  <title>Apple Upgrade Broken Down - Martin Emde</title>
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
    <div class="eyebrow">// an interactive cost comparison</div>
    <h1 bind:this={pageTitle} tabindex="-1">Apple Upgrade Broken Down</h1>
    <p class="lede">
      Pick the device, pick your trade in, and then scroll and make the choices you would make.
      Watch the costs accumulate on the floating bar graph and notice which graph has the highest
      spend at any given moment. Pay attention to how they jump around and click on the months with
      big charges to see why.
    </p>
  </header>

  <div id="step-1"></div>
  <Step n={1} title="What are you buying?" answer={deviceKey ? money0(listPrice) : undefined}>
    <Tiles options={deviceOptions} bind:value={deviceKey} name="device" min="168px" />

    {#if deviceKey === 'custom'}
      <div class="fields one">
        <Field
          id="custom-price"
          label="Sticker price"
          bind:value={listPrice}
          step={50}
          hint="Before tax."
        />
      </div>
    {/if}
  </Step>

  <div id="step-2"></div>
  <Step
    n={2}
    title="Do you have something to trade in?"
    locked={step < 2}
    answer={hasTradeIn === 'yes' && tradeInAnswered
      ? money0(tradeIn)
      : hasTradeIn === 'no'
        ? 'none'
        : undefined}
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
      <label class="trade-in-picker">
        <span>Pick the phone you want to trade in</span>
        <select
          id="trade-in-phone"
          value={selectedTradeIn}
          onchange={(event) => {
            tradeInDevice = event.currentTarget.value;
            const device = TRADE_IN_DEVICES.find(([name]) => name === tradeInDevice);
            if (device) tradeIn = device[1];
          }}
        >
          <option value="" disabled>Choose your trade-in</option>
          <option value="custom">Enter your own value</option>
          {#each TRADE_IN_DEVICES as [name, value] (name)}
            <option value={name}>{name} — up to {money0(value)}</option>
          {/each}
        </select>
      </label>
      {#if selectedTradeIn !== ''}
        <div class="fields">
          <Field
            id="trade-in-value"
            label="Apple Trade-in offer"
            bind:value={tradeIn}
            step={25}
            hint="Edit this if Apple quotes a different amount. Maximum offers depend on condition."
          />
          <Field
            label="Carrier Trade-in offer"
            bind:value={carrierOffer}
            step={50}
            hint="The whole offer, including your trade-in. Capped at the phone price; paid over 36 months."
          />
        </div>
      {/if}
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
        <Field id="care-price" label="Monthly price" bind:value={appleCareMonthly} step={1} />
      {/if}
      {#if appleCare === 'one'}
        <Field
          id="care-price"
          label="Monthly price"
          bind:value={appleCareOneMonthly}
          step={1}
          hint="Already subscribed? Adding this device costs nothing — set it to 0."
        />
      {/if}
      {#if appleCare === 'annual'}
        <Field id="care-price" label="Yearly price" bind:value={appleCareAnnual} step={10} />
      {/if}
    </div>
  </Step>

  <div id="step-4"></div>
  <Step
    n={4}
    title="How often do you upgrade?"
    locked={step < 4}
    answer={upgradeFrequency === 1
      ? 'every year'
      : upgradeFrequency
        ? `every ${upgradeFrequency} years`
        : undefined}
    lede="Compare plans for the phone you’re buying today based on when you’ll want the next one. This fills in the yearly choices below; you can still change them and decide whether to buy out a lease or hand the phone back."
  >
    <Tiles
      options={frequencyOptions}
      bind:value={() => upgradeFrequency, chooseFrequency}
      name="Upgrade frequency"
      min="170px"
    />
    <p class="frequency-note">
      Best-case net cost in today’s dollars, averaged over four years. Updates with your inputs and
      includes final debt and estimated phone value. Your lease choices below may cost more.
    </p>
  </Step>
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
      <h3>Screen repair costs</h3>
      <div class="fields">
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
        finalLabel={finalEnding === 'own'
          ? 'Cost to finish owning the phone'
          : 'Cost to sell/return and walk away'}
        beats={story}
        limit={ledgerLimit}
        questions={screenChoice !== null
          ? {
              11: yearOne,
              23: yearTwo,
              35: yearThree,
              [SCREEN_CRACK_MONTH]: screenCard,
              [HORIZON]: finalCard
            }
          : { 11: yearOne, 23: yearTwo, 35: yearThree, [HORIZON]: finalCard }}
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

    {#snippet finalCard()}
      <section class="decide" aria-labelledby="closeout-title">
        <div class="decide-head">
          <span class="eyebrow">// month {HORIZON} · the final closeout</span>
          <h3 id="closeout-title">Where did you end up?</h3>
          <p>
            A leased phone isn’t yours until you buy it out. Settle any remaining debt here and
            choose the same ending for every path.
          </p>
        </div>
        <div class="screen-actions">
          <button
            type="button"
            aria-pressed={finalEnding === 'own'}
            onclick={() => (finalEnding = 'own')}
          >
            Finish owning the phone
          </button>
          <button
            type="button"
            aria-pressed={finalEnding === 'walkaway'}
            onclick={() => (finalEnding = 'walkaway')}
          >
            Sell/return and walk away
          </button>
        </div>
        {#if finalEnding === 'own'}
          <p>
            Every path finishes with a fully paid phone of the same age. The graph includes final
            buyouts and loan payoffs; retained phone value appears separately in the totals.
          </p>
        {:else}
          <p>
            Every path finishes with no phone and no debt. Return eligible leases or sell owned
            phones using the estimate below.
          </p>
          <Field
            label="Final phone resale estimate"
            step={25}
            bind:value={() => finalSaleOffer, (value) => (finalSaleEstimate = value)}
            hint="Net proceeds after selling fees and shipping. Starts from your age-based phone estimate; edit it for a realistic private sale. Unrepaired damage is deducted separately."
          />
        {/if}
        {#each scenarios as scenario (scenario.key)}
          {@const ending = scenario.closeout!}
          <fieldset class="lease-choice">
            <legend>{scenario.name}</legend>
            <p class="ending-status">
              {#if scenario.rows[HORIZON].hasPhone}<Smartphone size={20} aria-hidden="true" />
                You own the phone
              {:else}<PhoneOff size={20} aria-hidden="true" />No phone left{/if}
            </p>
            {#if ending.canReturn && finalEnding === 'walkaway'}
              <div class="screen-actions">
                <button
                  type="button"
                  aria-pressed={ending.choice === 'return'}
                  onclick={() => (finalChoices = { ...finalChoices, [scenario.key]: 'return' })}
                >
                  Return it — no phone left
                </button>
                <button
                  type="button"
                  aria-pressed={ending.choice === 'buyout'}
                  onclick={() => (finalChoices = { ...finalChoices, [scenario.key]: 'buyout' })}
                >
                  Buy it out for {money(ending.payoff)}, then sell it
                </button>
              </div>
            {/if}
            {#if ending.choice === 'return'}
              <p>
                Return the leased phone to settle the lease. No trade-in credit, no phone asset. Any
                required repair is included in the final month.
              </p>
            {:else}
              <p>
                {ending.payoff > 0
                  ? `Pay ${money(ending.payoff)} to settle the remaining ${scenario.key.startsWith('upgrade-') ? 'buyout, including tax' : 'installments'} in month ${HORIZON}.`
                  : 'Your phone is already paid off.'}
                {#if finalEnding === 'own'}You finish owning the phone. Its estimated value is
                  {money(ending.phoneValue)}, shown separately in the totals.
                {:else}Sell it for an estimated {money(ending.saleProceeds)}. No phone or debt
                  remains.{/if}
              </p>
            {/if}
            {#if ending.creditsForfeited > 0}
              <p>
                Paying off now forfeits {money(ending.creditsForfeited)} in future carrier credits. Those
                credits are not earned by this endpoint.
              </p>
            {/if}
            <p>
              <strong
                >{money0(scenario.summary.npv - scenario.summary.tradeInRefund)} in today’s dollars.</strong
              >
              {finalEnding === 'own'
                ? 'You own the phone; nothing still owed.'
                : 'No phone left; nothing still owed.'}
            </p>
          </fieldset>
        {/each}
      </section>
    {/snippet}

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
        {#each leaseOptions[index] as option (option.key)}
          <fieldset class="lease-choice">
            <legend>{option.term}-month lease: what happens to the old phone?</legend>
            <div class="screen-actions">
              <button
                type="button"
                aria-pressed={leaseUpgradeChoices[option.key] !== 'buyout'}
                onclick={() =>
                  (leaseUpgradeChoices = { ...leaseUpgradeChoices, [option.key]: 'return' })}
              >
                Hand it back
              </button>
              <button
                type="button"
                aria-pressed={leaseUpgradeChoices[option.key] === 'buyout'}
                onclick={() =>
                  (leaseUpgradeChoices = { ...leaseUpgradeChoices, [option.key]: 'buyout' })}
              >
                Buy it for {money(option.buyout)}, then {option.privateSale
                  ? 'sell it'
                  : 'trade it in'}
              </button>
            </div>
            <p>
              Hand it back to settle the lease: no trade-in credit. The new lease starts at
              {money(leasePayment(listPrice, option.term))}/mo before tax.
              {screenChoice === 'defer' &&
              appleCare === 'none' &&
              index === annualChoices.indexOf('upgrade')
                ? ' A deferred screen repair is charged before return.'
                : ''}
            </p>
            <p>
              Buy it out: put up {money(option.buyout)} including tax to own the phone.
              {#if option.privateSale}
                Then sell it for an estimated {money(option.value)}; the new lease stays at full
                price.
              {:else}
                Then trade it in for an estimated {money(option.value)} credit, reducing the next
                {option.term} months of the new lease to {money(option.payment)}/mo before tax while
                you keep that lease.
                {#if option.refund > 0}
                  Another {money(option.refund)} comes back as Apple credit beyond the lease payments.
                {/if}
              {/if}
            </p>
            <p>
              <strong>
                {#if Math.abs(option.saving) < 0.5}
                  The two choices cost about the same over 48 months.
                {:else}
                  Buying out is {money0(Math.abs(option.saving))}
                  {option.saving > 0 ? 'cheaper' : 'more expensive'}
                  over 48 months in today’s dollars.
                {/if}
              </strong>
              Includes taxes, card rewards, and the final closeout. Both paths finish
              {finalEnding === 'own' ? 'owning the phone' : 'with no phone or debt'}. Future upgrade
              answers stay the same; unanswered years assume you keep the phone.
            </p>
          </fieldset>
        {/each}
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
          <div class="eyebrow">// break it down</div>
          <h2>The Totals</h2>
        </div>

        <Compare
          {scenarios}
          privateSale={privateSaleValues !== null}
          repairPrices={screenChoice === 'repair' || screenChoice === 'defer'
            ? {
                withCare: screenRepairPrice({ ...inputs, appleCare: 'monthly' }),
                withoutCare: screenRepairPrice({ ...inputs, appleCare: 'none' })
              }
            : undefined}
        />
      </section>

      <details class="assumptions">
        <summary>Assumptions and lease terms</summary>
        <p>
          Estimates, not a quote. Tax treatment varies by state. Private-sale proceeds are your own
          estimates after fees and shipping.
        </p>
        <p>
          Lease payments use 50% of the sticker for 12 months or 70% for 24, rounded to x.99.
          Payments and trade-in credit reduce the buyout. Future phones keep the same price. At
          eligible upgrades, choose to return the lease or buy it out first. Returning a leased
          phone settles the lease without a trade-in credit; owned phones use Apple’s age-based
          trade-in values unless you choose a private sale.
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
    One of the big risks with a leased phone is breaking it. You have to return it in good condition
    or buy it outright. What would you do if you broke your screen a few months before the new
    iphone? If you want to trade it in, you will be forced to repair it and it's much more expensive
    without AppleCare. Fine for people with liquid cash, maybe not for everyone.
  </p>
  <div class="screen-actions">
    <button
      type="button"
      aria-pressed={screenChoice === 'repair'}
      onclick={() => chooseScreen('repair')}
      >Pay {money0(repairPrice)} to fix it {appleCare === 'none'
        ? 'without AppleCare'
        : 'with AppleCare'}</button
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
  <p>
    This would cost {money0(alternativeRepairPrice)}
    {appleCare === 'none' ? 'with' : 'without'} AppleCare.
  </p>
{/snippet}

<style>
  .trade-in-picker {
    display: grid;
    gap: 6px;
    margin-top: 16px;
    font-size: 13.5px;
    font-weight: 520;
  }
  .trade-in-picker select {
    width: 100%;
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--bg);
    padding: 9px 12px;
    color: var(--text);
    font: inherit;
  }

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
    text-wrap: balance;
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
  .lease-choice {
    min-width: 0;
    margin: 20px 0;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  .ending-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }
  .frequency-note {
    margin: 12px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.6;
  }
  .lease-choice legend {
    padding: 0 6px;
    font-weight: 600;
  }
  .lease-choice p {
    margin: 12px 0 0;
    font-size: 14px;
    line-height: 1.6;
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
