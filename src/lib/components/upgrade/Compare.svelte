<script lang="ts">
  import { money0, type Scenario } from '$lib/apple-upgrade/model';

  interface Props {
    scenarios: Scenario[];
    /** Key of the path the reader has been configuring, so it reads as "theirs". */
    highlight?: string;
  }

  let { scenarios, highlight }: Props = $props();

  type Row = {
    label: string;
    hint?: string;
    value: (s: Scenario) => string;
    /** Lower is better on money rows; marks the winning cell. */
    rank?: (s: Scenario) => number;
    lead?: boolean;
  };

  const rows: Row[] = [
    {
      label: 'Due today',
      hint: 'Cash you produce at the counter',
      value: (s) => money0(s.summary.today),
      rank: (s) => s.summary.today
    },
    {
      label: 'Biggest single month',
      hint: 'Where the balloon payments hide',
      value: (s) => money0(s.summary.biggestMonth)
    },
    {
      label: 'Months you pay',
      value: (s) => String(s.rows.filter((r) => r.month >= 1 && r.outflow > 0).length)
    },
    {
      label: 'Total paid',
      hint: 'Nominal dollars over 36 months, net of card rewards',
      value: (s) => money0(s.summary.cash)
    },
    {
      label: 'Cost in today’s dollars',
      hint: 'The same stream discounted back to now',
      value: (s) => money0(s.summary.npv),
      rank: (s) => s.summary.npv,
      lead: true
    },
    {
      label: 'What you hold at month 36',
      hint: 'Resale value, less anything still owed on it',
      value: (s) => (s.summary.equityAt36 > 0 ? money0(s.summary.equityAt36) : 'nothing')
    },
    {
      label: 'Months with a phone',
      value: (s) => String(s.summary.monthsWithPhone)
    },
    {
      label: 'Net cost',
      hint: 'Today’s dollars, minus what you can sell it for',
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
  ];

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
            <span class="blurb">{s.blurb}</span>
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
            <td class:best={i === best} class:mine={s.key === highlight}>{row.value(s)}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .scroller {
    overflow-x: auto;
    /* Bleed to the page edges so five columns get room on narrow screens. */
    margin: 0 -4px;
    padding: 0 4px 4px;
  }

  table {
    width: 100%;
    min-width: 720px;
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
  .blurb {
    display: block;
    padding-top: 3px;
    max-width: 21ch;
    margin-left: auto;
    font-weight: 400;
    font-size: 11px;
    line-height: 1.45;
    color: var(--faint);
    text-wrap: pretty;
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
