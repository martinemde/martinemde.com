import { describe, it, expect } from 'vitest';
import {
  appleCareVerdict,
  buyoutThreshold,
  cadenceCosts,
  evaluate,
  gotchas,
  rankedScenarios
} from './advice';
import { HORIZON, LEASE_SHARE, type Inputs } from './model';
import { buildInputs, type Answers } from './presets';

function inputs(overrides: Partial<Answers> = {}): Inputs {
  return buildInputs({
    deviceKey: 'iphone-18-pro',
    listPrice: 1199,
    tradeIn: 0,
    carrierOffer: null,
    appleCare: 'none',
    upgradeMonths: [],
    taxRate: 0,
    appleCardBack: 0,
    klarnaCardBack: 0,
    carrierCardBack: 0,
    activationFee: 0,
    caseCost: 0,
    ...overrides
  });
}

describe('the buyout threshold', () => {
  it('leaves the same buyout whatever you trade in', () => {
    // The whole rule rests on this: credit comes off the payments and off the
    // buyout by the same amount, so what is left is a fixed share of list.
    const none = buyoutThreshold(inputs({ tradeIn: 0 }), 24);
    const some = buyoutThreshold(inputs({ tradeIn: 375 }), 24);
    expect(some.buyout).toBeCloseTo(none.buyout, 2);
    expect(some.payment).toBeLessThan(none.payment);
  });

  it('is half of list at twelve months and thirty percent at twenty-four', () => {
    const twelve = buyoutThreshold(inputs(), 12);
    const twentyFour = buyoutThreshold(inputs(), 24);
    // Reported rounded, so 0.30000000000000004 does not reach a JSON reader.
    expect(twelve.buyoutShareOfList).toBe(0.5);
    expect(twentyFour.buyoutShareOfList).toBe(0.3);
    expect(twelve.buyoutShareOfList).toBeCloseTo(1 - LEASE_SHARE[12], 10);
    expect(twentyFour.buyoutShareOfList).toBeCloseTo(1 - LEASE_SHARE[24], 10);
    // Rounding each payment up to x.99 collects a few cents extra, so the
    // buyout lands just under the share rather than exactly on it.
    expect(twelve.buyout).toBeGreaterThan(1199 * 0.5 - 1);
    expect(twelve.buyout).toBeLessThanOrEqual(1199 * 0.5);
  });

  it('says buy it out when the trade-in beats the buyout', () => {
    const rich = buyoutThreshold(inputs({ upgradeTradeIns: [900, 700, 500, 400] }), 12);
    expect(rich.verdict).toBe('buy-it-out');
    expect(rich.buyoutAdvantage).toBeCloseTo(900 - rich.buyoutWithTax, 2);

    const poor = buyoutThreshold(inputs({ upgradeTradeIns: [400, 300, 200, 150] }), 12);
    expect(poor.verdict).toBe('hand-it-back');
    expect(poor.buyoutAdvantage).toBeLessThan(0);
  });

  it('reports the trade-in a lease cannot absorb', () => {
    // A twelve-month lease only collects half the sticker, so a trade-in worth
    // more than that runs out of payments to reduce.
    const overflowing = buyoutThreshold(inputs({ tradeIn: 800 }), 12);
    expect(overflowing.tradeInCreditRefunded).toBeCloseTo(800 - 1199 * LEASE_SHARE[12], 2);
    expect(overflowing.payment).toBe(0);
    expect(buyoutThreshold(inputs({ tradeIn: 800 }), 24).tradeInCreditRefunded).toBe(0);
  });
});

describe('the AppleCare verdict', () => {
  it('turns premiums into a break-even cadence', () => {
    const care = appleCareVerdict(
      inputs({
        appleCare: 'monthly',
        appleCareMonthly: 10,
        screenRepairCost: 250,
        appleCareRepairCost: 30
      })
    );
    expect(care.fourYearCost).toBe(480);
    expect(care.savedPerRepair).toBe(220);
    expect(care.repairsToBreakEven).toBeCloseTo(480 / 220, 2);
    expect(care.monthsBetweenBreaksToBreakEven).toBeCloseTo(HORIZON / (480 / 220), 1);
    expect(care.verdict).toBe('not-worth-it');
  });

  it('is worth it once the break-even is under a year', () => {
    const care = appleCareVerdict(
      inputs({ appleCare: 'monthly', appleCareMonthly: 30, appleCareRepairCost: 0 })
    );
    expect(care.monthsBetweenBreaksToBreakEven!).toBeLessThan(12);
    expect(care.verdict).toBe('worth-it');
  });

  it('costs nothing and promises nothing without coverage', () => {
    const care = appleCareVerdict(inputs({ appleCare: 'none' }));
    expect(care.fourYearCost).toBe(0);
    expect(care.verdict).toBe('no-coverage');
    expect(care.note).toContain('returned working');
  });
});

describe('ranking the paths', () => {
  const advice = evaluate(inputs({ tradeIn: 375, carrierOffer: 1000, upgradeMonths: [24] }));

  it('costs all five paths, cheapest first', () => {
    expect(advice.plans.map((plan) => plan.key).sort()).toEqual([
      'applecard',
      'carrier',
      'outright',
      'upgrade-12',
      'upgrade-24'
    ]);
    expect(advice.plans.map((plan) => plan.rank)).toEqual([1, 2, 3, 4, 5]);
    const costs = advice.plans.map((plan) => plan.netCost);
    expect([...costs].sort((a, b) => a - b)).toEqual(costs);
  });

  it('measures every plan against the winner', () => {
    expect(advice.plans[0].costAboveBest).toBe(0);
    for (const plan of advice.plans) {
      expect(plan.costAboveBest).toBeCloseTo(plan.netCost - advice.plans[0].netCost, 2);
    }
    expect(advice.recommendation.pick).toBe(advice.plans[0].key);
    expect(advice.recommendation.margin).toBeCloseTo(advice.plans[1].costAboveBest, 2);
  });

  it('says so when the margin is noise rather than a finding', () => {
    expect(['clear', 'close', 'toss-up']).toContain(advice.recommendation.confidence);
    expect(advice.recommendation.reason).not.toContain('undefined');
  });

  it('reports what the lease actually did with the old phone', () => {
    const lease = advice.plans.find((plan) => plan.key === 'upgrade-24')!;
    // The 24-month lease reaches its upgrade exactly at the end of its term,
    // so month 24 is a real choice rather than a phone it already owns.
    expect(lease.leaseExits!['24']).toMatch(/^(returned|bought-out)$/);
    // The 12-month lease is six months past its return window by then.
    expect(advice.plans.find((plan) => plan.key === 'upgrade-12')!.leaseExits!['24']).toBe(
      'already-owned'
    );
  });

  it('never lets a forced exit beat the searched one', () => {
    const answers = { tradeIn: 375, upgradeMonths: [12, 24, 36] };
    const cheapestLease = (leaseExit: 'best' | 'return' | 'buyout') =>
      Math.min(
        ...rankedScenarios(inputs(answers), { leaseExit })
          .filter((path) => path.isLease)
          .map((path) => path.scenario.summary.netCost)
      );
    const best = cheapestLease('best');
    expect(best).toBeLessThanOrEqual(cheapestLease('return') + 0.01);
    expect(best).toBeLessThanOrEqual(cheapestLease('buyout') + 0.01);
  });

  it('prices the cadences against each other', () => {
    const cadence = cadenceCosts(inputs({ tradeIn: 375 }));
    expect(cadence.map((entry) => entry.years)).toEqual([1, 2, 3]);
    expect(cadence.filter((entry) => entry.costAboveBest === 0)).toHaveLength(1);
    for (const entry of cadence) expect(entry.costAboveBest).toBeGreaterThanOrEqual(0);
  });

  it('produces numbers a JSON reader can trust', () => {
    const json = JSON.stringify(advice);
    expect(json).not.toContain('null,null');
    expect(json).not.toMatch(/\bNaN\b/);
    expect(JSON.parse(json)).toEqual(advice);
  });
});

describe('the gotchas', () => {
  function found(overrides: Partial<Answers>) {
    const input = inputs(overrides);
    const paths = rankedScenarios(input);
    const plans = evaluate(input).plans;
    return gotchas(input, paths, plans);
  }

  it('always names the two things nobody expects', () => {
    const ids = found({}).map((gotcha) => gotcha.id);
    expect(ids).toContain('applecare-never-included');
    expect(ids).toContain('no-trade-in-on-a-new-lease');
    expect(ids).toContain('lease-buyout-12');
    expect(ids).toContain('lease-buyout-24');
  });

  it('only warns about overflowing trade-in credit when it overflows', () => {
    expect(found({ tradeIn: 300 }).map((gotcha) => gotcha.id)).not.toContain('trade-in-overflow');
    const overflowing = found({ tradeIn: 900 }).find((gotcha) => gotcha.id === 'trade-in-overflow');
    expect(overflowing?.severity).toBe('critical');
    expect(overflowing?.impact).toBeGreaterThan(0);
  });

  it('only warns about Klarna card acceptance when rewards are being counted', () => {
    expect(found({ klarnaCardBack: 0 }).map((gotcha) => gotcha.id)).not.toContain(
      'klarna-card-acceptance'
    );
    expect(found({ klarnaCardBack: 3 }).map((gotcha) => gotcha.id)).toContain(
      'klarna-card-acceptance'
    );
  });

  it('only warns about carrier credits when there is a promotion to lose', () => {
    expect(found({ carrierOffer: null }).map((gotcha) => gotcha.id)).not.toContain(
      'carrier-credits-are-hostage'
    );
    const hostage = found({ tradeIn: 375, carrierOffer: 1000, upgradeMonths: [24] }).find(
      (gotcha) => gotcha.id === 'carrier-credits-are-hostage'
    );
    expect(hostage?.impact).toBeGreaterThan(0);
  });

  it('flags the payment jump only when a trade-in is hiding it', () => {
    expect(found({ tradeIn: 0 }).map((gotcha) => gotcha.id)).not.toContain(
      'payment-resets-after-term'
    );
    const jump = found({ tradeIn: 375 }).find(
      (gotcha) => gotcha.id === 'payment-resets-after-term'
    );
    expect(jump?.impact).toBeCloseTo(375, 0);
  });

  it('prices every impact it claims to have priced', () => {
    for (const gotcha of found({ tradeIn: 375, carrierOffer: 1000, appleCare: 'monthly' })) {
      expect(gotcha.detail.length).toBeGreaterThan(40);
      if (gotcha.impact !== null) expect(Number.isFinite(gotcha.impact)).toBe(true);
    }
  });
});
