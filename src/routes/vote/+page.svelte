<script lang="ts">
  // State for committee configuration
  let committeeSize = $state(9);
  let quorum = $state(6);

  // Ensure quorum doesn't exceed committee size
  let effectiveQuorum = $derived(Math.min(quorum, committeeSize));

  // Derived grid data
  let gridData = $derived.by(() => {
    const rows: Array<{
      attendance: number;
      majority: number;
      threeFifths: number;
      twoThirds: number;
      threeFourths: number;
      unanimous: number;
    }> = [];

    // Generate rows from full committee down to quorum
    for (let attendance = committeeSize; attendance >= effectiveQuorum; attendance--) {
      rows.push({
        attendance,
        majority: Math.floor(attendance / 2) + 1,
        threeFifths: Math.ceil((attendance * 3) / 5),
        twoThirds: Math.ceil((attendance * 2) / 3),
        threeFourths: Math.ceil((attendance * 3) / 4),
        unanimous: attendance
      });
    }

    return rows;
  });
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
            <th class="px-4 py-3 text-center text-sm font-semibold text-surface-900-100">
              Majority<br />
              <span class="text-xs font-normal text-surface-600-400">(&gt;50%)</span>
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-surface-900-100">
              3/5ths<br />
              <span class="text-xs font-normal text-surface-600-400">(60%)</span>
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-surface-900-100">
              2/3rds<br />
              <span class="text-xs font-normal text-surface-600-400">(≥66.67%)</span>
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-surface-900-100">
              3/4ths<br />
              <span class="text-xs font-normal text-surface-600-400">(75%)</span>
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-surface-900-100">
              Unanimous<br />
              <span class="text-xs font-normal text-surface-600-400">(100%)</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each gridData as row (row.attendance)}
            <tr class="border-b border-surface-200-800 hover:bg-surface-100-900/50">
              <td class="px-4 py-3 font-medium text-surface-950-50">
                {row.attendance}
                {#if row.attendance === committeeSize}
                  <span class="text-xs text-surface-600-400">(full)</span>
                {:else if row.attendance === effectiveQuorum}
                  <span class="text-xs text-surface-600-400">(quorum)</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-center text-surface-950-50 tabular-nums">
                {row.majority}
              </td>
              <td class="px-4 py-3 text-center text-surface-950-50 tabular-nums">
                {row.threeFifths}
              </td>
              <td class="px-4 py-3 text-center text-surface-950-50 tabular-nums">
                {row.twoThirds}
              </td>
              <td class="px-4 py-3 text-center text-surface-950-50 tabular-nums">
                {row.threeFourths}
              </td>
              <td class="px-4 py-3 text-center text-surface-950-50 tabular-nums">
                {row.unanimous}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="card preset-filled-surface-100-900 p-4">
    <h3 class="mb-2 text-sm font-semibold text-surface-900-100">Understanding the Thresholds</h3>
    <ul class="space-y-1 text-sm text-surface-700-300">
      <li><strong>Majority:</strong> More than 50% of those present must vote in favor</li>
      <li><strong>3/5ths:</strong> At least 60% of those present must vote in favor</li>
      <li><strong>2/3rds:</strong> At least 66.67% of those present must vote in favor</li>
      <li><strong>3/4ths:</strong> At least 75% of those present must vote in favor</li>
      <li><strong>Unanimous:</strong> All members present must vote in favor (100%)</li>
    </ul>
  </div>
</div>
