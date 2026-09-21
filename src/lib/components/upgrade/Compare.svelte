<script lang="ts">
  import { PhoneOff, Smartphone } from 'lucide-svelte';
  import { HORIZON, money0, type Scenario } from '$lib/apple-upgrade/model';
  import { careAndRepairPaid } from '$lib/apple-upgrade/presentation';

  interface Props {
    scenarios: Scenario[];
    /** Key of the path the reader has been configuring, so it reads as "theirs". */
    highlight?: string;
    privateSale?: boolean;
    repairPrices?: { withCare: number; withoutCare: number };
  }

  let { scenarios, highlight, privateSale = false, repairPrices }: Props = $props();
  const paid = $derived(new Map(scenarios.map((s) => [s.key, careAndRepairPaid(s.rows)])));

  type Row = {
    label: string;
    hint?: string;
    value: (s: Scenario) => string;
    /** Lower is better on money rows; marks the winning cell. */
    rank?: (s: Scenario) => number;
    lead?: boolean;
    ownership?: boolean;
  };

  const rows: Row[] = $derived([
    ...(scenarios.some((s) => s.closeout)
      ? [
          {
            label: 'Phone at the end',
            ownership: true,
            value: (s: Scenario) => (s.rows[HORIZON].hasPhone ? 'You own it' : 'No phone')
          }
        ]
      : []),
    {
      label: 'Due today',
      value: (s) => money0(s.summary.today),
      rank: (s) => s.summary.today
    },
    {
      label: 'Biggest single month',
      value: (s) => money0(s.summary.biggestMonth)
    },
    {
      label: 'Months you pay',
      value: (s) => String(s.summary.monthsPaying)
    },
    {
      label: 'Total paid',
      hint: `Nominal dollars over ${HORIZON} months, net of card rewards and excess trade-in credit`,
      value: (s) => money0(s.summary.cash - s.summary.tradeInRefund)
    },
    {
      label: 'AppleCare premiums paid',
      hint: `${HORIZON} months of coverage, including tax, before card rewards`,
      value: (s) => money0(paid.get(s.key)!.care)
    },
    {
      label: 'Repairs paid',
      hint: 'Actual repair charges including tax, before rewards. Unrepaired damage reduces phone value instead.',
      value: (s) => money0(paid.get(s.key)!.repair)
    },
    ...(repairPrices
      ? [
          {
            label: 'One screen repair with AppleCare',
            hint: 'Estimated service fee including tax; premiums are separate',
            value: () => money0(repairPrices!.withCare)
          },
          {
            label: 'One screen repair without AppleCare',
            hint: 'Estimated full repair price including tax; for comparison, not an additional charge',
            value: () => money0(repairPrices!.withoutCare)
          }
        ]
      : []),
    {
      label: 'Cost in today’s dollars',
      hint: 'The same stream discounted back to now, net of excess trade-in credit',
      value: (s) => money0(s.summary.npv - s.summary.tradeInRefund),
      rank: (s) => s.summary.npv - s.summary.tradeInRefund,
      lead: true
    },
    {
      label: `What you hold at month ${HORIZON}`,
      hint: privateSale
        ? 'Estimated private-sale proceeds, less anything still owed'
        : 'Apple trade-in value, less anything still owed',
      value: (s) =>
        s.summary.equityAtHorizon !== 0 ? money0(s.summary.equityAtHorizon) : 'nothing'
    },
    {
      label: 'Installments still owed',
      value: (s) => money0(s.summary.remainingBalance)
    },
    {
      label: 'Carrier credits forfeited',
      value: (s) => (s.key === 'carrier' ? money0(s.summary.carrierCreditsLost ?? 0) : '—')
    },
    {
      label: 'Months with a phone',
      value: (s) => String(s.summary.monthsWithPhone)
    },
    {
      label: 'Net cost',
      hint: privateSale
        ? 'Today’s dollars, minus the final phone’s estimated private-sale value'
        : 'After subtracting the estimated value of any phone kept; that value is not cash received',
      value: (s) => money0(s.summary.netCost),
      rank: (s) => s.summary.netCost,
      lead: true
    },
    {
      label: 'Per month of phone',
      hint: 'Net cost spread over the months you actually had one',
      value: (s) => money0(s.summary.perMonth),
      rank: (s) => s.summary.perMonth
    }
  ]);

  function winner(row: Row): number {
    if (!row.rank) return -1;
    let best = -1;
    let bestVal = Infinity;
    scenarios.forEach((s, i) => {
      const v = row.rank!(s);
      if (v < bestVal) {
        bestVal = v;
        best = i;
      }
    });
    return best;
  }
</script>

<div class="scroller">
  <table>
    <thead>
      <tr>
        <th class="stub"></th>
        {#each scenarios as s (s.key)}
          <th class:mine={s.key === highlight}>
            <span class="name">{s.name}</span>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.label)}
        {@const best = winner(row)}
        <tr class:lead={row.lead}>
          <th class="stub" scope="row">
            {row.label}
            {#if row.hint}<span class="hint">{row.hint}</span>{/if}
          </th>
          {#each scenarios as s, i (s.key)}
            <td class:best={i === best} class:mine={s.key === highlight}>
              {#if row.ownership}
                <span class="ownership">
                  {#if s.rows[HORIZON].hasPhone}<Smartphone size={18} aria-hidden="true" />
                  {:else}<PhoneOff size={18} aria-hidden="true" />{/if}
                  {row.value(s)}
                </span>
              {:else}{row.value(s)}{/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .ownership {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .scroller {
    overflow-x: auto;
    padding-bottom: 4px;
  }

  table {
    width: 100%;
    min-width: 620px;
    border-collapse: collapse;
    font-size: 13px;
  }

  th,
  td {
    padding: 11px 12px;
    text-align: right;
    vertical-align: baseline;
  }

  .stub {
    position: sticky;
    left: 0;
    z-index: 1;
    min-width: 190px;
    background: var(--bg);
    text-align: left;
    font-family: var(--font-body);
    font-weight: 520;
  }
  .stub .hint {
    display: block;
    padding-top: 2px;
    font-weight: 400;
    font-size: 11px;
    line-height: 1.45;
    color: var(--faint);
    text-wrap: pretty;
  }

  thead th {
    border-bottom: 1px solid var(--border);
    vertical-align: bottom;
  }
  thead th.mine {
    background: color-mix(in oklch, var(--accent) 8%, transparent);
    border-bottom-color: var(--accent);
  }
  .name {
    display: block;
    font-family: var(--font-body);
    font-weight: 580;
    font-size: 13.5px;
    letter-spacing: -0.01em;
  }

  tbody tr {
    border-bottom: 1px solid color-mix(in oklch, var(--border) 45%, transparent);
  }
  tbody td {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
  tbody td.mine {
    background: color-mix(in oklch, var(--accent) 6%, transparent);
  }
  tbody td.best {
    color: var(--accent);
    font-weight: 560;
  }

  tr.lead {
    background: color-mix(in oklch, var(--surface) 70%, transparent);
  }
  tr.lead .stub {
    background: color-mix(in oklch, var(--surface) 70%, var(--bg));
  }
  tr.lead td {
    font-size: 14.5px;
    color: var(--text);
  }
  tr.lead td.best {
    color: var(--accent);
  }
</style>
