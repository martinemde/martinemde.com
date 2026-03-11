<script lang="ts">
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

  interface Loan {
    name: string;
    totalPrice: number;
    downPayment: number;
    apr: number;
    termMonths: number;
    taxRate: number;
    deliveryFees: number;
  }

  function createLoan(name: string = ''): Loan {
    return {
      name,
      totalPrice: 0,
      downPayment: 0,
      apr: 0,
      termMonths: 60,
      taxRate: 0,
      deliveryFees: 0
    };
  }

  let loans = $state<Loan[]>([createLoan('Loan A'), createLoan('Loan B')]);

  function addLoan() {
    const letter = String.fromCharCode(65 + loans.length);
    loans.push(createLoan(`Loan ${letter}`));
  }

  function removeLoan(index: number) {
    loans.splice(index, 1);
  }

  // Calculations
  function principal(loan: Loan): number {
    return Math.max(0, loan.totalPrice - loan.downPayment);
  }

  function taxAmount(loan: Loan): number {
    return loan.totalPrice * (loan.taxRate / 100);
  }

  function monthlyPayment(loan: Loan): number {
    const p = principal(loan);
    if (p <= 0 || loan.termMonths <= 0) return 0;
    const r = loan.apr / 100 / 12;
    if (r === 0) return p / loan.termMonths;
    return (p * r * Math.pow(1 + r, loan.termMonths)) / (Math.pow(1 + r, loan.termMonths) - 1);
  }

  function totalInterest(loan: Loan): number {
    const mp = monthlyPayment(loan);
    return Math.max(0, mp * loan.termMonths - principal(loan));
  }

  function upfrontCost(loan: Loan): number {
    return loan.downPayment + taxAmount(loan) + loan.deliveryFees;
  }

  function grandTotal(loan: Loan): number {
    return (
      loan.downPayment + taxAmount(loan) + loan.deliveryFees + totalInterest(loan) + principal(loan)
    );
  }

  function fmt(n: number): string {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  function fmtPct(n: number): string {
    return n.toFixed(2) + '%';
  }

  // Row definitions for the comparison grid
  const inputRows = [
    { label: 'Total Price', key: 'totalPrice' as const, type: 'currency' },
    { label: 'Down Payment', key: 'downPayment' as const, type: 'currency' },
    { label: 'APR', key: 'apr' as const, type: 'percent' },
    { label: 'Term (months)', key: 'termMonths' as const, type: 'number' },
    { label: 'Tax Rate', key: 'taxRate' as const, type: 'percent' },
    { label: 'Delivery Fees', key: 'deliveryFees' as const, type: 'currency' }
  ] as const;
</script>

<svelte:head>
  <title>Loan Calculator - Martin Emde</title>
  <meta
    name="description"
    content="Compare loans side by side. Calculate monthly payments, total interest, and grand totals."
  />
</svelte:head>

<div class="container mx-auto max-w-7xl space-y-8 p-4">
  <Breadcrumbs crumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Loan Calculator' }]} />

  <header class="space-y-4">
    <h1 class="h1 text-surface-950-50">Loan Calculator</h1>
    <p class="text-surface-700-300">
      Compare loans side by side. Enter the details for each loan and see monthly payments, total
      interest, and grand totals.
    </p>
  </header>

  <div class="flex gap-2">
    <button
      type="button"
      onclick={addLoan}
      class="btn rounded-md preset-filled-primary-500 px-4 py-2 text-sm font-medium"
    >
      + Add Loan
    </button>
  </div>

  <div class="overflow-x-auto card preset-filled-surface-100-900 p-6">
    <table class="w-full table-auto">
      <thead>
        <tr class="border-b border-surface-300-700">
          <th class="min-w-40 px-4 py-3 text-left text-sm font-semibold text-surface-900-100"></th>
          {#each loans as loan, i (i)}
            <th class="min-w-48 px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-2">
                <input
                  type="text"
                  bind:value={loan.name}
                  class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 px-2 py-1 text-center text-sm font-semibold text-surface-950-50"
                />
                {#if loans.length > 1}
                  <button
                    type="button"
                    onclick={() => removeLoan(i)}
                    class="text-xs font-bold text-error-500 hover:text-error-400"
                    aria-label="Remove {loan.name}"
                  >
                    &times;
                  </button>
                {/if}
              </div>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        <!-- Input rows -->
        {#each inputRows as row (row.key)}
          <tr class="border-b border-surface-200-800">
            <td class="px-4 py-3 text-sm font-medium text-surface-950-50">{row.label}</td>
            {#each loans as loan, i (i)}
              <td class="px-4 py-3">
                <div class="relative">
                  {#if row.type === 'currency'}
                    <span
                      class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-surface-600-400"
                      >$</span
                    >
                    <input
                      type="number"
                      bind:value={loan[row.key]}
                      min="0"
                      step="100"
                      class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 py-2 pr-3 pl-7 text-right text-sm text-surface-950-50 tabular-nums"
                    />
                  {:else if row.type === 'percent'}
                    <input
                      type="number"
                      bind:value={loan[row.key]}
                      min="0"
                      step="0.1"
                      class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 px-3 py-2 text-right text-sm text-surface-950-50 tabular-nums"
                    />
                    <span
                      class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-surface-600-400"
                      >%</span
                    >
                  {:else}
                    <input
                      type="number"
                      bind:value={loan[row.key]}
                      min="1"
                      step="1"
                      class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 px-3 py-2 text-right text-sm text-surface-950-50 tabular-nums"
                    />
                  {/if}
                </div>
              </td>
            {/each}
          </tr>
        {/each}

        <!-- Separator -->
        <tr>
          <td colspan={loans.length + 1} class="py-2">
            <hr class="border-surface-300-700" />
          </td>
        </tr>

        <!-- Calculated rows -->
        <tr class="border-b border-surface-200-800">
          <td class="px-4 py-3 text-sm font-medium text-surface-950-50">Principal</td>
          {#each loans as loan, i (i)}
            <td class="px-4 py-3 text-right text-sm font-medium text-surface-950-50 tabular-nums">
              {fmt(principal(loan))}
            </td>
          {/each}
        </tr>

        <tr class="bg-primary-100-800/30 border-b border-surface-200-800">
          <td class="px-4 py-3 text-sm font-bold text-surface-950-50">Monthly Payment</td>
          {#each loans as loan, i (i)}
            <td class="px-4 py-3 text-right text-sm font-bold text-primary-600-400 tabular-nums">
              {fmt(monthlyPayment(loan))}
            </td>
          {/each}
        </tr>

        <tr class="border-b border-surface-200-800">
          <td class="px-4 py-3 text-sm font-medium text-surface-950-50">Tax Amount</td>
          {#each loans as loan, i (i)}
            <td class="px-4 py-3 text-right text-sm text-surface-950-50 tabular-nums">
              {fmt(taxAmount(loan))}
              <span class="text-xs text-surface-600-400">({fmtPct(loan.taxRate)})</span>
            </td>
          {/each}
        </tr>

        <tr class="border-b border-surface-200-800">
          <td class="px-4 py-3 text-sm font-medium text-surface-950-50">Upfront Cost</td>
          {#each loans as loan, i (i)}
            <td class="px-4 py-3 text-right text-sm text-surface-950-50 tabular-nums">
              {fmt(upfrontCost(loan))}
            </td>
          {/each}
        </tr>

        <tr class="border-b border-surface-200-800">
          <td class="px-4 py-3 text-sm font-medium text-surface-950-50">Total Interest</td>
          {#each loans as loan, i (i)}
            <td class="px-4 py-3 text-right text-sm text-surface-950-50 tabular-nums">
              {fmt(totalInterest(loan))}
            </td>
          {/each}
        </tr>

        <tr class="bg-tertiary-100-800/30">
          <td class="px-4 py-3 text-sm font-bold text-surface-950-50">Grand Total</td>
          {#each loans as loan, i (i)}
            <td class="px-4 py-3 text-right text-sm font-bold text-tertiary-600-400 tabular-nums">
              {fmt(grandTotal(loan))}
            </td>
          {/each}
        </tr>
      </tbody>
    </table>
  </div>

  <div class="card preset-filled-surface-100-900 p-6 text-sm text-surface-600-400">
    <p>
      <strong class="text-surface-950-50">How it works:</strong> Monthly payment is calculated using the
      standard amortization formula. Principal = Total Price &minus; Down Payment. Upfront Cost = Down
      Payment + Tax + Delivery Fees. Grand Total = Principal + Total Interest + Upfront Cost.
    </p>
  </div>
</div>
