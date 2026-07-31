<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import ChoiceCard from './ChoiceCard.svelte';
  import {
    EXTENSION_MONTHS,
    HORIZON,
    fmtMoney,
    leasePayment,
    purchaseOptionFee,
    round2,
    type EndDecision,
    type ScenarioResult,
    type UpgradeInputs
  } from './upgrade';

  interface Props {
    lease: ScenarioResult;
    outright: ScenarioResult;
    term: 12 | 24;
    decision: EndDecision;
    ondecision: (decision: EndDecision) => void;
    inputs: UpgradeInputs;
    onMonthChange: (month: number | null) => void;
  }

  let { lease, outright, term, decision, ondecision, inputs, onMonthChange }: Props = $props();

  let container: HTMLElement | undefined = $state();

  // The decision numbers depend on the scheduled payments your lease covers
  const base = $derived(term === 12 ? inputs.payment12 : inputs.payment24);
  const paidAtEnd = $derived(round2(base * term));
  const buyoutFee = $derived(purchaseOptionFee(inputs.price, paidAtEnd));
  const buyoutTotal = $derived(round2(buyoutFee * (1 + inputs.taxRate / 100)));
  const extendTotal = $derived(
    round2(
      purchaseOptionFee(inputs.price, round2(paidAtEnd + base * EXTENSION_MONTHS)) *
        (1 + inputs.taxRate / 100)
    )
  );
  const nextPayment = $derived(
    leasePayment(round2(base * (inputs.nextPrice / inputs.price)), 0, term)
  );

  // One per phone-free month after handing the phone back (24 covers the
  // worst case: a 12-month lease returned at month 12 leaves months 13–36).
  const PHONE_FREE_ACTIVITIES = [
    'Spend time looking at the trees',
    'Visit your in-laws and listen to their stories',
    'Read a book made of paper',
    'Stare at the ceiling and have a thought',
    'Learn which birds live in your neighborhood',
    "Talk to a stranger on the bus (they're scared too)",
    'Memorize a poem',
    'Sit in a café and just... drink the coffee',
    "Learn your neighbor's dog's name, and use it",
    'Take a walk without telling anyone your pace',
    'Write a letter. With a pen',
    'Learn to juggle',
    'Cook a recipe from a cookbook, not a video',
    "People-watch at the airport like it's 1997",
    'Watch the pre-show trivia at a movie. Really watch it',
    "Start a garden — the tomatoes don't need firmware updates",
    'Listen to a whole album, start to finish, doing nothing else',
    'Learn the constellations visible from your porch',
    'Call your mom from a landline like a pioneer',
    'Take up whittling; keep the bandages handy',
    'Sit on a park bench and become a regular',
    'Do a 1000-piece puzzle with no timer',
    'Rediscover the ancient art of being bored',
    'Wave at boats'
  ];

  function phoneFreeActivity(month: number): string {
    return PHONE_FREE_ACTIVITIES[(month - term - 1) % PHONE_FREE_ACTIVITIES.length];
  }

  const months = $derived.by(() => {
    const byMonth: (typeof lease.flows)[] = Array.from({ length: HORIZON + 1 }, () => []);
    for (const f of lease.flows) byMonth[f.month].push(f);
    return Array.from({ length: HORIZON + 1 }, (_, m) => ({
      month: m,
      flows: byMonth[m],
      leaseNumber: m >= 1 && decision === 'upgrade' ? Math.ceil(m / term) : 1,
      isExtension: decision === 'extend' && m > term && m <= term + EXTENSION_MONTHS
    }));
  });

  function cumulativeByMonth(scenario: ScenarioResult): number[] {
    const arr = new Array<number>(HORIZON + 1).fill(0);
    for (const f of scenario.flows) arr[f.month] += f.amount;
    for (let m = 1; m <= HORIZON; m++) arr[m] += arr[m - 1];
    return arr;
  }

  const leaseCumulative = $derived(cumulativeByMonth(lease));
  const outrightCumulative = $derived(cumulativeByMonth(outright));

  // Report the month nearest the middle of the viewport while scrolling
  onMount(() => {
    if (!container) return;
    const visible = new SvelteSet<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const month = Number((entry.target as HTMLElement).dataset.month);
          if (entry.isIntersecting) visible.add(month);
          else visible.delete(month);
        }
        onMonthChange(visible.size > 0 ? Math.max(...visible) : null);
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );
    for (const el of container.querySelectorAll('[data-month]')) observer.observe(el);
    return () => observer.disconnect();
  });

  const decisionOptions = $derived.by(() => [
    {
      id: 'upgrade' as const,
      title: 'Upgrade to the next one',
      price: `≈ ${fmtMoney(nextPayment)}/mo`,
      description: `Hand back the phone and start a fresh ${term}-month lease on the next one (assumed ${fmtMoney(inputs.nextPrice)}). No trade-in allowed this time.`
    },
    {
      id: 'buyout' as const,
      title: 'Buy it and keep it',
      price: `${fmtMoney(buyoutTotal)} once`,
      description: `Pay the purchase option fee — list price minus the ${fmtMoney(paidAtEnd)} of scheduled lease payments, plus tax — and the phone is yours.`
    },
    {
      id: 'extend' as const,
      title: 'Do nothing for 6 months',
      price: `${fmtMoney(base)}/mo × 6, then ${fmtMoney(extendTotal)}`,
      description:
        'Payments continue at the full amount (your trade-in credit expired), then Klarna charges the purchase option fee automatically.'
    },
    {
      id: 'return' as const,
      title: 'Hand it back and walk away',
      price:
        inputs.appleCare === 'none' && inputs.damageFee > 0
          ? `${fmtMoney(inputs.damageFee)} damage fee`
          : 'No further payments',
      description:
        'Return the phone in good condition and leave the program. You own nothing and owe nothing more.'
    }
  ]);
</script>

<div bind:this={container} class="space-y-3">
  {#each months as { month, flows, leaseNumber, isExtension } (month)}
    <section
      data-month={month}
      class="rounded-xl border p-4 {isExtension
        ? 'border-warning-500/50 bg-warning-100-900/20'
        : month === term
          ? 'border-primary-500/50 bg-primary-100-900/20'
          : 'border-surface-200-800 bg-surface-100-900/30'}"
    >
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="text-sm font-semibold text-surface-950-50">
          {#if month === 0}
            Today — checkout day
          {:else}
            Month {month}
          {/if}
          {#if leaseNumber >= 2}
            <span
              class="ml-1 rounded-full bg-secondary-200-800/60 px-2 py-0.5 text-[10px] font-medium text-secondary-700-300"
            >
              Lease #{leaseNumber}
            </span>
          {/if}
          {#if month === term}
            <span
              class="ml-1 rounded-full bg-primary-200-800/60 px-2 py-0.5 text-[10px] font-medium text-primary-700-300"
            >
              Last payment of your lease
            </span>
          {/if}
        </h3>
        <span class="text-xs text-surface-600-400 tabular-nums">
          {#if month === 0}First payment lands ~30 days later{/if}
        </span>
      </div>

      {#if flows.length > 0}
        <ul class="mt-2 space-y-1">
          {#each flows as flow, i (i)}
            <li class="flex items-baseline justify-between gap-3 text-sm">
              <span class="text-surface-700-300">{flow.label}</span>
              <span
                class="shrink-0 tabular-nums {flow.kind === 'credit'
                  ? 'text-success-600-400'
                  : 'text-surface-950-50'}"
              >
                {flow.kind === 'credit' ? '−' : ''}{fmtMoney(Math.abs(flow.amount))}
              </span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="mt-2 text-sm text-surface-600-400 italic">
          {#if decision === 'return' && month > term}
            You don't have a phone: {phoneFreeActivity(month)}.
          {:else}
            Nothing due.
          {/if}
        </p>
      {/if}

      <div
        class="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-surface-200-800 pt-2 text-xs text-surface-600-400 tabular-nums"
      >
        <span
          >This path so far: <strong class="text-surface-900-100"
            >{fmtMoney(leaseCumulative[month])}</strong
          ></span
        >
        <span
          >Buy outright so far: <strong class="text-surface-900-100"
            >{fmtMoney(outrightCumulative[month])}</strong
          ></span
        >
      </div>
    </section>

    {#if month === term}
      <div class="rounded-xl border-2 border-dashed border-primary-500/60 p-4">
        <h3 class="text-sm font-bold text-primary-600-400">Decision time — your lease is up</h3>
        <p class="mt-1 text-xs text-surface-600-400">
          Apple gives you six months to choose, but every month you wait costs the full payment.
          Pick one and watch the rest of the timeline (and the totals) change:
        </p>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          {#each decisionOptions as option (option.id)}
            <ChoiceCard
              title={option.title}
              price={option.price}
              description={option.description}
              selected={decision === option.id}
              onclick={() => ondecision(option.id)}
            />
          {/each}
        </div>
      </div>
    {/if}
  {/each}

  {#if lease.note}
    <p
      class="rounded-xl border border-surface-300-700 bg-surface-100-900/40 p-4 text-sm text-surface-700-300"
    >
      {lease.note}
    </p>
  {/if}
</div>
