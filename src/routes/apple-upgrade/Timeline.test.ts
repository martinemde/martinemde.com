import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Timeline from './Timeline.svelte';
import { buildLeaseFlows, buildOutrightFlows, type UpgradeInputs } from './upgrade';

/** All extras zeroed out so the timeline renders bare lease math. */
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
    decision12: 'return',
    decision24: 'return',
    ...overrides
  };
}

function renderTimeline(decision: UpgradeInputs['decision12'], term: 12 | 24 = 12) {
  const inputs = bare({ decision12: decision });
  return render(Timeline, {
    props: {
      lease: buildLeaseFlows(term, decision, inputs),
      outright: buildOutrightFlows(inputs),
      term,
      decision,
      ondecision: () => {},
      inputs,
      onMonthChange: () => {}
    }
  });
}

beforeAll(() => {
  // jsdom has no IntersectionObserver; the scroll tracker is inert in tests
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

describe('Timeline phone-free months', () => {
  it('fills every month after a returned 12-month lease with phone-free living', () => {
    renderTimeline('return', 12);
    const messages = screen.getAllByText(/You don't have a phone:/);
    expect(messages).toHaveLength(24); // months 13–36
  });

  it('starts the list at the month after the lease ends and never repeats', () => {
    const { container } = renderTimeline('return', 12);
    const at = (m: number) => container.querySelector(`[data-month="${m}"]`)?.textContent ?? '';
    expect(at(13)).toContain('Spend time looking at the trees.');
    expect(at(14)).toContain('Visit your in-laws and listen to their stories.');
    expect(at(36)).toContain('Wave at boats.');
  });

  it('shows the messages on a returned 24-month lease too', () => {
    renderTimeline('return', 24);
    const messages = screen.getAllByText(/You don't have a phone:/);
    expect(messages).toHaveLength(12); // months 25–36
  });

  it('says "Nothing due." for empty months on other decisions', () => {
    renderTimeline('buyout', 12);
    expect(screen.queryByText(/You don't have a phone:/)).toBeNull();
    expect(screen.getAllByText('Nothing due.').length).toBeGreaterThan(0);
  });
});
