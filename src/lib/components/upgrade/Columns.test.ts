import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Columns from './Columns.svelte';
import { allScenarios, CATEGORIES, HORIZON, money0, type Inputs } from '$lib/apple-upgrade/model';

function inputs(overrides: Partial<Inputs> = {}): Inputs {
  return {
    listPrice: 1199,
    tradeIn: 0,
    term: 24,
    endChoice: 'nothing',
    appleCare: 'monthly',
    appleCareMonthly: 13.49,
    appleCareOneMonthly: 19.99,
    appleCareAnnual: 149,
    damageFee: 0,
    damageOdds: 0,
    taxRate: 8.5,
    activationFee: 35,
    caseCost: 59,
    appleCardBack: 3,
    klarnaCardBack: 3,
    carrierCardBack: 2,
    discountRate: 4,
    resaleAtTerm: 500,
    resaleAtHorizon: 288,
    carrierCredits: 0,
    carrierTerm: 36,
    ...overrides
  };
}

function mount(month: number, basis: 'cash' | 'npv' = 'cash') {
  const scenarios = allScenarios(inputs());
  const ceiling = Math.max(
    ...scenarios.map((s) => {
      const last = s.rows[s.rows.length - 1];
      return basis === 'npv' ? last.runningNpv : last.runningCash;
    })
  );
  const { container } = render(Columns, { scenarios, month, ceiling, basis, height: 240 });
  return { container, scenarios, ceiling };
}

function pct(style: string | null): number {
  return Number(style?.match(/flex:\s*0\s*1\s*([\d.]+)%/)?.[1] ?? NaN);
}

describe('Columns', () => {
  it('draws one bar per way of paying', () => {
    const { container, scenarios } = mount(24);
    expect(container.querySelectorAll('.track')).toHaveLength(scenarios.length);
    expect([...container.querySelectorAll('.name')].map((n) => n.textContent?.trim())).toEqual(
      scenarios.map((s) => s.shortName)
    );
  });

  /**
   * A percentage flex-basis resolves against the bar, not the plot. Sizing the
   * bands against the plot's ceiling instead would square the scale and leave
   * every bar short of its own total — which looks plausible and is wrong.
   */
  it('sizes each bar’s bands as shares of that bar, not of the plot', () => {
    const { container } = mount(24);
    for (const track of container.querySelectorAll('.track')) {
      const bands = [...track.querySelectorAll('.band')].map((b) => pct(b.getAttribute('style')));
      expect(bands.length).toBeGreaterThan(0);
      expect(bands.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 4);
    }
  });

  it('scales each bar against the shared ceiling', () => {
    const month = 24;
    const { container, scenarios, ceiling } = mount(month);
    const stacks = [...container.querySelectorAll('.stack')].map((s) =>
      Number(s.getAttribute('style')?.match(/height:\s*([\d.]+)%/)?.[1] ?? NaN)
    );
    scenarios.forEach((s, i) => {
      expect(stacks[i]).toBeCloseTo((s.rows[month].runningCash / ceiling) * 100, 4);
    });
  });

  it('holds the band order steady no matter which bands are present', () => {
    for (const month of [0, 1, 24, HORIZON]) {
      const { container } = mount(month);
      for (const track of container.querySelectorAll('.track')) {
        const order = [...track.querySelectorAll('.band')].map((b) => b.getAttribute('data-cat'));
        const expected = CATEGORIES.filter((c) => order.includes(c));
        expect(order).toEqual(expected);
      }
    }
  });

  /**
   * The reader has to see the first month land, so the panel opens with four
   * empty columns rather than with day one already counted.
   */
  it('starts empty, before any month has been scrolled past', () => {
    const { container } = mount(-1);
    expect(container.querySelectorAll('.band')).toHaveLength(0);
    expect([...container.querySelectorAll('.total')].map((t) => t.textContent)).toEqual([
      '$0',
      '$0',
      '$0',
      '$0'
    ]);
  });

  it('counts day one as soon as month zero goes past', () => {
    const { container, scenarios } = mount(0);
    expect(container.querySelectorAll('.band').length).toBeGreaterThan(0);
    const totals = [...container.querySelectorAll('.total')].map((t) => t.textContent);
    expect(totals[0]).toBe(money0(scenarios[0].rows[0].runningCash));
  });

  it('carries no legend — the ledger below names every charge in its own colour', () => {
    const { container } = mount(24);
    expect(container.querySelector('.legend')).toBeNull();
  });

  /**
   * A trade-in bigger than a path can absorb comes back as store credit. It is
   * money in, so it hangs below the axis in outline — without it the columns
   * never net out and the lease looks dearer than buying, which is backwards.
   */
  describe('a trade-in the path cannot absorb', () => {
    it('draws no below-axis region when every path used the whole trade-in', () => {
      const { container } = mount(24);
      expect(container.querySelector('.down')).toBeNull();
      expect(container.querySelector('.credit')).toBeNull();
    });

    it('hangs the credit below the axis and nets it out of the headline', () => {
      const scenarios = allScenarios(inputs({ listPrice: 999, term: 12, tradeIn: 800 }));
      const ceiling = Math.max(...scenarios.map((s) => s.rows[s.rows.length - 1].runningCash));
      const { container } = render(Columns, {
        scenarios,
        month: HORIZON,
        ceiling,
        basis: 'cash' as const,
        height: 240
      });

      const lease = scenarios.findIndex((s) => s.key.startsWith('upgrade'));
      expect(scenarios[lease].summary.tradeInRefund).toBeGreaterThan(0);

      // Only the paths that could not use it all get a bar below the line.
      const credits = [...container.querySelectorAll('.track')].map(
        (t) => t.querySelector('.credit') !== null
      );
      expect(credits[lease]).toBe(true);

      // And the number on top is what the column really cost, net of it.
      const totals = [...container.querySelectorAll('.total')].map((t) => t.textContent);
      const s = scenarios[lease].summary;
      expect(totals[lease]).toBe(money0(s.cash - s.tradeInRefund));
    });

    it('keeps the lease no dearer than paying cash once the credit is counted', () => {
      const scenarios = allScenarios(
        inputs({ listPrice: 999, term: 12, tradeIn: 800, endChoice: 'nothing' })
      );
      const net = (key: string) => {
        const s = scenarios.find((x) => x.key.startsWith(key))!.summary;
        return s.cash - s.tradeInRefund;
      };
      expect(net('upgrade')).toBeLessThanOrEqual(net('outright') + 0.01);
    });
  });

  it('marks the cheapest column so far without recolouring it', () => {
    const { container } = mount(1);
    // Month one: the lease has asked for the least of anyone.
    expect(container.querySelector('.name.low')?.textContent?.trim()).toBe('Lease');
  });
});
