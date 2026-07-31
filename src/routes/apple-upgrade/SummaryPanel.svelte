<script lang="ts">
  import { fmtMoney, nominal, npv, SCENARIO_META, type ScenarioResult } from './upgrade';

  interface Props {
    scenarios: ScenarioResult[];
    discountRatePct: number;
    /** When scrolling the timeline, the month reached; null = whole 36 months */
    throughMonth: number | null;
  }

  let { scenarios, discountRatePct, throughMonth }: Props = $props();

  const at = $derived(throughMonth ?? 36);

  interface Row {
    scenario: ScenarioResult;
    name: string;
    pv: number;
    total: number;
  }

  const rows = $derived.by<Row[]>(() =>
    scenarios.map((scenario) => ({
      scenario,
      name: SCENARIO_META[scenario.id].name,
      pv: npv(scenario.flows, discountRatePct, at),
      total: nominal(scenario.flows, at)
    }))
  );

  const cheapest = $derived(rows.reduce((min, r) => (r.pv < min ? r.pv : min), Infinity));
</script>

<div class="rounded-xl border border-surface-300-700 bg-surface-100-900/40 p-4">
  <h2 class="text-sm font-semibold text-surface-950-50">
    {#if throughMonth === null}
      36-month cost, in today's dollars
    {:else}
      Spent by month {at}, in today's dollars
    {/if}
  </h2>
  <p class="mt-0.5 text-xs text-surface-600-400">
    Net present value at a {discountRatePct}% discount rate
  </p>

  <ul class="mt-3 space-y-2.5">
    {#each rows as row (row.scenario.id)}
      <li
        class="rounded-lg border px-3 py-2 {row.pv === cheapest
          ? 'border-success-500/60 bg-success-100-900/30'
          : 'border-surface-200-800'}"
      >
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-xs font-medium text-surface-800-200">{row.name}</span>
          <span
            class="text-sm font-bold tabular-nums {row.pv === cheapest
              ? 'text-success-600-400'
              : 'text-surface-950-50'}"
          >
            {fmtMoney(row.pv)}
          </span>
        </div>
        <div
          class="mt-0.5 flex items-baseline justify-between gap-2 text-[11px] text-surface-600-400"
        >
          <span>
            {#if row.scenario.ownsDevice}you own the phone{:else}you don't own it{/if}
            {#if row.pv === cheapest && rows.length > 1}
              · <span class="text-success-600-400">lowest</span>{/if}
          </span>
          <span class="tabular-nums">{fmtMoney(row.total)} nominal</span>
        </div>
      </li>
    {/each}
  </ul>

  {#if throughMonth !== null}
    <p class="mt-3 text-[11px] leading-relaxed text-surface-600-400">
      Keep scrolling the timeline to walk through time.
    </p>
  {/if}
</div>
