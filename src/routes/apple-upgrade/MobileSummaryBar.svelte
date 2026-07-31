<script lang="ts">
  import { fmtMoney, summarize, type ScenarioResult } from './upgrade';

  interface Props {
    scenarios: ScenarioResult[];
    discountRatePct: number;
    /** When scrolling the timeline, the month reached; null = whole 36 months */
    throughMonth: number | null;
  }

  let { scenarios, discountRatePct, throughMonth }: Props = $props();

  const at = $derived(throughMonth ?? 36);
  const rows = $derived(summarize(scenarios, discountRatePct, at));
  const cheapest = $derived(rows.reduce((min, r) => (r.pv < min ? r.pv : min), Infinity));
</script>

<!-- Compressed counterpart to SummaryPanel: pinned to the bottom on small
     screens so the totals stay visible while scrolling the timeline. -->
<aside
  aria-label="Cost summary"
  class="fixed inset-x-0 bottom-0 z-20 border-t border-surface-300-700 bg-surface-50-950/95 backdrop-blur-sm lg:hidden"
>
  <div class="px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
    <p class="text-[10px] font-medium tracking-wide text-surface-600-400 uppercase">
      {#if throughMonth === null}
        36-month cost · today's dollars
      {:else}
        Spent by month {at} · today's dollars
      {/if}
    </p>
    <ul class="mt-1 flex gap-1.5 overflow-x-auto">
      {#each rows as row (row.scenario.id)}
        <li
          class="shrink-0 rounded-md border px-2 py-1 {row.pv === cheapest
            ? 'border-success-500/60 bg-success-100-900/30'
            : 'border-surface-200-800'}"
        >
          <span class="block text-[10px] whitespace-nowrap text-surface-600-400">{row.name}</span>
          <span
            class="block text-xs font-bold tabular-nums {row.pv === cheapest
              ? 'text-success-600-400'
              : 'text-surface-950-50'}"
          >
            {fmtMoney(row.pv)}
          </span>
        </li>
      {/each}
    </ul>
  </div>
</aside>
