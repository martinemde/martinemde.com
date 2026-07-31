import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MobileSummaryBar from './MobileSummaryBar.svelte';
import { buildScenarios, type UpgradeInputs } from './upgrade';

/** All extras zeroed out so the bar renders bare scenario math. */
function bare(overrides: Partial<UpgradeInputs> = {}): UpgradeInputs {
  return {
    price: 1199,
    payment12: 49.99,
    payment24: 34.99,
    tradeIn: 0,
    appleCare: 'none',
    acOneMonthly: 19.99,
    acPlusMonthly: 13.99,
    acPlusAnnual: 139.99,
    taxRate: 0,
    activationFee: 0,
    caseCost: 0,
    cashBackPct: 0,
    discountRatePct: 7,
    damageFee: 0,
    nextPrice: 1199,
    carrierMode: 'bill-credit',
    carrierPromoMonthly: 0,
    residualPct: 0,
    decision12: 'upgrade',
    decision24: 'upgrade',
    ...overrides
  };
}

function renderBar(throughMonth: number | null = null) {
  return render(MobileSummaryBar, {
    props: { scenarios: buildScenarios(bare()), discountRatePct: 7, throughMonth }
  });
}

describe('MobileSummaryBar', () => {
  it('pins itself to the bottom and hides on large screens', () => {
    const { container } = renderBar();
    const bar = container.querySelector('aside')!;
    expect(bar.className).toContain('fixed');
    expect(bar.className).toContain('bottom-0');
    expect(bar.className).toContain('lg:hidden');
  });

  it('shows every scenario name with the full-horizon label', () => {
    renderBar();
    for (const name of [
      'Apple Lease · 12 mo',
      'Apple Lease · 24 mo',
      'Buy outright',
      'Apple Card 0% · 24 mo',
      'Carrier · 36 mo'
    ]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.getByText(/36-month cost/)).toBeTruthy();
  });

  it('follows the scrolled month like the full panel', () => {
    renderBar(14);
    expect(screen.getByText(/Spent by month 14/)).toBeTruthy();
  });
});
