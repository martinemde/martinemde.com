<script lang="ts">
  import { generateVoteGrid, fractionCalculation, type ThresholdConfig } from './vote';

  // State for committee configuration
  let committeeSize = $state(9);
  let quorum = $state(6);

  // Ensure quorum doesn't exceed committee size
  let effectiveQuorum = $derived(Math.min(quorum, committeeSize));

  const colorClasses = [
    'bg-primary-100-800 text-primary-950-50',
    'bg-tertiary-100-800 text-tertiary-950-50',
    'bg-success-100-800 text-success-950-50',
    'bg-warning-100-800 text-warning-950-50',
    'bg-secondary-100-800 text-secondary-950-50',
    'bg-error-100-800 text-error-950-50'
  ];

  // Get color classes for a given vote count
  function getCellColor(votes: number): string {
    const index = (votes - 1) % colorClasses.length;
    return colorClasses[index];
  }

  // Threshold configurations - define what thresholds to display
  const thresholds: ThresholdConfig[] = [
    {
      key: 'unanimous',
      label: 'Unanimous',
      description: '(100%)',
      calculate: fractionCalculation(1, 1)
    },
    {
      key: 'threeFourths',
      label: '3/4ths',
      description: '(75%)',
      calculate: fractionCalculation(3, 4)
    },
    {
      key: 'twoThirds',
      label: '2/3rds',
      description: '(≥66.67%)',
      calculate: fractionCalculation(2, 3)
    },
    {
      key: 'threeFifths',
      label: '3/5ths',
      description: '(60%)',
      calculate: fractionCalculation(3, 5)
    },
    {
      key: 'majority',
      label: 'Majority',
      description: '(>50%)',
      calculate: fractionCalculation(1, 2)
    }
  ];

  // Derived grid data
  let gridData = $derived(generateVoteGrid(committeeSize, quorum, thresholds));
</script>

<svelte:head>
  <title>Governance Vote Calculator - Martin Emde</title>
  <meta
    name="description"
    content="Interactive tool for calculating voting thresholds based on committee size and quorum requirements."
  />
</svelte:head>

<div class="container mx-auto max-w-5xl space-y-8 p-4">
  <header class="space-y-4">
    <h1 class="h1 text-surface-950-50">Governance Vote Calculator</h1>
    <p class="text-surface-700-300">
      Calculate how many votes are needed to pass resolutions based on committee size, attendance,
      and voting thresholds.
    </p>
  </header>

  <div class="space-y-6 card preset-filled-surface-100-900 p-6">
    <div class="grid gap-6 md:grid-cols-2">
      <label class="space-y-2">
        <span class="text-sm font-medium text-surface-900-100">Committee Size</span>
        <input
          type="number"
          bind:value={committeeSize}
          min="1"
          max="100"
          class="input rounded-md border border-surface-300-700 bg-surface-50-950 px-4 py-2 text-surface-950-50"
        />
        <span class="text-xs text-surface-600-400">Total number of committee members</span>
      </label>

      <label class="space-y-2">
        <span class="text-sm font-medium text-surface-900-100">Minimum Quorum</span>
        <input
          type="number"
          bind:value={quorum}
          min="1"
          max={committeeSize}
          class="input rounded-md border border-surface-300-700 bg-surface-50-950 px-4 py-2 text-surface-950-50"
        />
        <span class="text-xs text-surface-600-400">Minimum members required to hold a vote</span>
      </label>
    </div>
  </div>

  <div class="overflow-x-auto card preset-filled-surface-100-900 p-6">
    <h2 class="mb-4 h3 text-surface-950-50">Votes Required to Pass</h2>

    <div class="overflow-x-auto">
      <table class="w-full table-auto">
        <thead>
          <tr class="border-b border-surface-300-700">
            <th class="px-4 py-3 text-left text-sm font-semibold text-surface-900-100">
              Members Present
            </th>
            {#each thresholds as threshold (threshold.key)}
              <th class="px-4 py-3 text-center text-sm font-semibold text-surface-900-100">
                {threshold.label}<br />
                <span class="text-xs font-normal text-surface-600-400">{threshold.description}</span
                >
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each gridData as row (row.attendance)}
            <tr class="border-b border-surface-200-800">
              <td class="px-4 py-3 font-medium text-surface-950-50">
                {row.attendance}
                {#if row.attendance === committeeSize}
                  <span class="text-xs text-surface-600-400">(full)</span>
                {:else if row.attendance === effectiveQuorum}
                  <span class="text-xs text-surface-600-400">(quorum)</span>
                {/if}
              </td>
              {#each thresholds as threshold (threshold.key)}
                <td class="px-4 py-3 text-center tabular-nums {getCellColor(row[threshold.key])}">
                  {row[threshold.key]}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
