import { describe, it, expect } from 'vitest';
import {
  allScenarios,
  appleUpgrade,
  buyoutAfter,
  EXTENSION_MONTHS,
  leasePayment,
  outright,
  PASTIMES,
  roundTo99,
  usedFraction,
  type Inputs
} from './model';

function inputs(overrides: Partial<Inputs> = {}): Inputs {
  return {
    listPrice: 1199,
    tradeIn: 0,
    term: 24,
    endChoice: 'nothing',
    appleCare: 'none',
    appleCareMonthly: 13.49,
    appleCareOneMonthly: 19.99,
    appleCareAnnual: 149,
    damageFee: 0,
    damageOdds: 0,
    taxRate: 0,
    activationFee: 0,
    caseCost: 0,
    appleCardBack: 0,
    klarnaCardBack: 0,
    carrierCardBack: 0,
    discountRate: 4,
    resaleAtTerm: 500,
    resaleAt36: 380,
    carrierCredits: 0,
    carrierTerm: 36,
    ...overrides
  };
}

describe('roundTo99', () => {
  it('lands on the nearest x.99', () => {
    expect(roundTo99(32.05)).toBeCloseTo(31.99, 2);
    expect(roundTo99(34.97)).toBeCloseTo(34.99, 2);
    expect(roundTo99(45.79)).toBeCloseTo(45.99, 2);
    expect(roundTo99(49.96)).toBeCloseTo(49.99, 2);
  });

  it('never goes below a single payment', () => {
    expect(roundTo99(0.2)).toBeCloseTo(0.99, 2);
    expect(roundTo99(0)).toBe(0);
  });
});

// The only hard data Apple publishes is in the Apple Upgrade footnotes. If the
// 50% / 70% shares are right, these fall out exactly.
describe('leasePayment matches Apple’s published iPhone examples', () => {
  it('iPhone 17 Pro 256GB at $1099', () => {
    expect(leasePayment(1099, 12)).toBeCloseTo(45.99, 2);
    expect(leasePayment(1099, 24)).toBeCloseTo(31.99, 2);
  });

  it('iPhone 17 Pro Max at $1199', () => {
    expect(leasePayment(1199, 12)).toBeCloseTo(49.99, 2);
    expect(leasePayment(1199, 24)).toBeCloseTo(34.99, 2);
  });
});

describe('trade-in credit', () => {
  // Apple quotes $18.74 and $19.37 for a $375 trade-in against a 17 Pro Max.
  it('is spread evenly across the initial term', () => {
    expect(leasePayment(1199, 12) - 375 / 12).toBeCloseTo(18.74, 2);
    expect(leasePayment(1199, 24) - 375 / 24).toBeCloseTo(19.37, 2);
  });

  it('comes straight off the buyout on day one', () => {
    expect(buyoutAfter(0, 1199, 34.99, 375, 24)).toBeCloseTo(1199 - 375, 2);
  });

  it('is fully consumed by the end of the term', () => {
    expect(buyoutAfter(24, 1199, 34.99, 375, 24)).toBeCloseTo(
      buyoutAfter(24, 1199, 34.99, 0, 24),
      2
    );
  });
});

describe('buyout', () => {
  it('drops by exactly what you paid that month', () => {
    const gross = leasePayment(1199, 24);
    const net = gross - 375 / 24;
    for (let m = 1; m <= 24; m++) {
      const drop = buyoutAfter(m - 1, 1199, gross, 375, 24) - buyoutAfter(m, 1199, gross, 375, 24);
      expect(drop).toBeCloseTo(net, 6);
    }
  });

  it('keeps falling through the six-month extension', () => {
    const gross = leasePayment(1199, 24);
    expect(buyoutAfter(30, 1199, gross, 0, 24)).toBeCloseTo(1199 - 30 * gross, 2);
  });

  it('leaves 30% of sticker on the table at the end of a 24-month term', () => {
    const gross = leasePayment(1199, 24);
    expect(buyoutAfter(24, 1199, gross, 0, 24) / 1199).toBeCloseTo(0.3, 2);
  });

  it('leaves 50% on the table at the end of a 12-month term', () => {
    const gross = leasePayment(1199, 12);
    expect(buyoutAfter(12, 1199, gross, 0, 12) / 1199).toBeCloseTo(0.5, 2);
  });
});

describe('Apple’s promise that you never pay more than list', () => {
  it('holds when you take no action and Klarna buys it for you', () => {
    const scenario = appleUpgrade(inputs({ endChoice: 'nothing' }));
    expect(scenario.summary.cash).toBeCloseTo(1199, 2);
  });

  it('holds on the 12-month lease too', () => {
    const scenario = appleUpgrade(inputs({ term: 12, endChoice: 'nothing' }));
    expect(scenario.summary.cash).toBeCloseTo(1199, 2);
  });

  it('holds when you buy out at the end of the term', () => {
    const scenario = appleUpgrade(inputs({ endChoice: 'buyout' }));
    expect(scenario.summary.cash).toBeCloseTo(1199, 2);
  });

  it('counts the trade-in as money paid, not a bonus', () => {
    const scenario = appleUpgrade(inputs({ tradeIn: 375, endChoice: 'buyout' }));
    expect(scenario.summary.cash + 375).toBeCloseTo(1199, 2);
  });

  it('collects only the lease share if you hand it back', () => {
    const scenario = appleUpgrade(inputs({ endChoice: 'return' }));
    expect(scenario.summary.cash).toBeCloseTo(1199 * 0.7, 0);
  });
});

describe('timing', () => {
  it('asks for nothing on the day you pick it up', () => {
    const scenario = appleUpgrade(inputs());
    expect(scenario.summary.today).toBe(0);
  });

  it('starts the trade-in-reduced payment in month 1', () => {
    const scenario = appleUpgrade(inputs({ tradeIn: 375 }));
    expect(scenario.rows[1].outflow).toBeCloseTo(19.37, 2);
  });

  it('raises the payment once the trade-in credit runs out', () => {
    const scenario = appleUpgrade(inputs({ tradeIn: 375, endChoice: 'nothing' }));
    expect(scenario.rows[24].outflow).toBeCloseTo(19.37, 2);
    expect(scenario.rows[25].outflow).toBeCloseTo(34.99, 2);
  });

  it('drops the balloon at the end of the extension, not the term', () => {
    const scenario = appleUpgrade(inputs({ endChoice: 'nothing' }));
    const balloon = 24 + EXTENSION_MONTHS;
    expect(scenario.rows[balloon].outflow).toBeGreaterThan(scenario.rows[balloon - 1].outflow);
    expect(scenario.rows[balloon + 1].outflow).toBe(0);
  });
});

describe('tax', () => {
  it('is collected per payment, and totals the same as paying cash', () => {
    const withTax = appleUpgrade(inputs({ taxRate: 8.5, endChoice: 'nothing' }));
    expect(withTax.summary.cash).toBeCloseTo(1199 * 1.085, 2);
  });

  it('is only owed on what you actually pay when you hand it back', () => {
    const withTax = appleUpgrade(inputs({ taxRate: 8.5, endChoice: 'return' }));
    expect(withTax.summary.cash).toBeCloseTo(1199 * 0.7 * 1.085, 0);
  });

  it('is due in full on day one when you pay cash', () => {
    const scenario = outright(inputs({ taxRate: 8.5 }));
    expect(scenario.summary.today).toBeCloseTo(1199 * 1.085, 2);
  });
});

describe('NPV', () => {
  it('is lower for the lease than for cash when the totals are identical', () => {
    const base = inputs({ taxRate: 8.5, endChoice: 'nothing' });
    const lease = appleUpgrade(base);
    const cash = outright(base);
    expect(lease.summary.cash).toBeCloseTo(cash.summary.cash, 2);
    expect(lease.summary.npv).toBeLessThan(cash.summary.npv);
  });

  it('collapses to the nominal total at a 0% discount rate', () => {
    const scenario = appleUpgrade(inputs({ discountRate: 0, endChoice: 'nothing' }));
    expect(scenario.summary.npv).toBeCloseTo(scenario.summary.cash, 2);
  });

  // Klarna pays Apple Card's 3% on lease payments, so rewards come out a wash
  // across every path and timing is the only thing left separating them.
  it('earns rewards on Klarna lease payments too', () => {
    const base = inputs({ taxRate: 8.5, endChoice: 'nothing', appleCardBack: 3 });
    const withBack = appleUpgrade({ ...base, klarnaCardBack: 3 });
    const without = appleUpgrade(base);
    expect(without.summary.cash - withBack.summary.cash).toBeCloseTo(1199 * 1.085 * 0.03, 2);
  });

  it('leaves the lease strictly cheaper than cash once rewards match', () => {
    const base = inputs({ taxRate: 8.5, appleCardBack: 3, klarnaCardBack: 3 });
    const lease = appleUpgrade({ ...base, endChoice: 'nothing' });
    const cash = outright(base);

    // Identical nominal totals, so the only difference is when it gets paid.
    expect(lease.summary.cash).toBeCloseTo(cash.summary.cash, 2);
    expect(lease.summary.npv).toBeLessThan(cash.summary.npv);
  });

  it('gives 3% Apple Card rewards back on a cash purchase', () => {
    const withBack = outright(inputs({ taxRate: 8.5, appleCardBack: 3 }));
    const without = outright(inputs({ taxRate: 8.5 }));
    expect(without.summary.cash - withBack.summary.cash).toBeCloseTo(1199 * 1.085 * 0.03, 2);
  });
});

describe('AppleCare', () => {
  it('bills AppleCare+ monthly, starting the month after pickup', () => {
    const scenario = outright(inputs({ appleCare: 'monthly' }));
    expect(scenario.rows[0].outflow).toBeCloseTo(1199, 2); // device only
    expect(scenario.rows[1].outflow).toBeCloseTo(13.49, 2);
  });

  it('charges AppleCare One at its own flat rate, not the AppleCare+ price', () => {
    const scenario = outright(inputs({ appleCare: 'one' }));
    expect(scenario.rows[1].outflow).toBeCloseTo(19.99, 2);
  });

  it('bills the annual plan once a year, up front', () => {
    const scenario = outright(inputs({ appleCare: 'annual' }));
    expect(scenario.rows[12].outflow).toBeCloseTo(149, 2);
    expect(scenario.rows[13].outflow).toBe(0);
  });

  it('stops billing when you hand the phone back', () => {
    const scenario = appleUpgrade(inputs({ appleCare: 'monthly', endChoice: 'return' }));
    expect(scenario.rows[24].outflow).toBeGreaterThan(0);
    expect(scenario.rows[25].outflow).toBe(0);
  });
});

describe('equity at the horizon', () => {
  it('is the full resale value once you own it', () => {
    const scenario = appleUpgrade(inputs({ endChoice: 'buyout', resaleAt36: 380 }));
    expect(scenario.summary.equityAt36).toBeCloseTo(380, 2);
  });

  it('is zero when you handed the phone back', () => {
    const scenario = appleUpgrade(inputs({ endChoice: 'return' }));
    expect(scenario.summary.equityAt36).toBe(0);
  });

  it('nets the outstanding buyout out of a device you are still leasing', () => {
    const input = inputs({ endChoice: 'upgrade', resaleAt36: 900 });
    const scenario = appleUpgrade(input);
    const owed = scenario.rows[36].buyout;
    expect(owed).not.toBeNull();

    // At month 36 the replacement is only 12 months old, so it's valued off the
    // depreciation curve, scaled to agree with the month-36 number given above.
    const scale = 900 / (input.listPrice * usedFraction(36));
    const replacement = input.listPrice * usedFraction(12) * scale;
    expect(scenario.summary.equityAt36).toBeCloseTo(replacement - owed!, 2);
  });

  // Halfway through a lease the buyout is still above what the phone fetches —
  // a 24-month lease has only collected 35% of list at month 12, leaving a 65%
  // buyout on a device worth 62%. The option only goes in the money near term.
  it('is zero midway through the replacement lease, because the buyout is under water', () => {
    const input = inputs({ endChoice: 'upgrade', resaleAt36: 396 });
    const scenario = appleUpgrade(input);
    const scale = 396 / (input.listPrice * usedFraction(36));
    const replacement = input.listPrice * usedFraction(12) * scale;

    expect(scenario.rows[36].buyout!).toBeGreaterThan(replacement);
    expect(scenario.summary.equityAt36).toBe(0);
  });
});

describe('usedFraction', () => {
  it('hits its anchor points and decays monotonically', () => {
    expect(usedFraction(0)).toBeCloseTo(1, 3);
    expect(usedFraction(12)).toBeCloseTo(0.62, 3);
    expect(usedFraction(24)).toBeCloseTo(0.45, 3);
    expect(usedFraction(36)).toBeCloseTo(0.33, 3);
    for (let m = 1; m <= 60; m++) expect(usedFraction(m)).toBeLessThanOrEqual(usedFraction(m - 1));
  });

  it('interpolates between anchors', () => {
    expect(usedFraction(18)).toBeCloseTo((0.62 + 0.45) / 2, 3);
  });
});

describe('pastimes', () => {
  it('has enough to cover the longest phoneless stretch without repeating', () => {
    // A 12-month lease handed back leaves months 13-36 empty: 24 of them.
    expect(PASTIMES.length).toBeGreaterThanOrEqual(36 - 12);
    expect(new Set(PASTIMES).size).toBe(PASTIMES.length);
  });

  it('suggests something for every month after you hand the phone back', () => {
    const scenario = appleUpgrade(inputs({ term: 12, endChoice: 'return' }));
    const idle = scenario.rows.filter((r) => r.month > 12);

    expect(idle).toHaveLength(24);
    for (const row of idle) expect(row.idleNote).toMatch(/^You don’t have a phone: \S/);
    expect(new Set(idle.map((r) => r.idleNote)).size).toBe(idle.length);
  });

  it('leaves the other endings alone', () => {
    for (const endChoice of ['buyout', 'nothing', 'upgrade'] as const) {
      const scenario = appleUpgrade(inputs({ endChoice }));
      expect(scenario.rows.every((r) => r.idleNote === undefined)).toBe(true);
    }
  });
});

describe('phone-months', () => {
  it('counts every month of a 36-month horizon when you own it', () => {
    expect(outright(inputs()).summary.monthsWithPhone).toBe(36);
  });

  it('stops counting the month you walk away', () => {
    expect(appleUpgrade(inputs({ endChoice: 'return' })).summary.monthsWithPhone).toBe(24);
  });
});

describe('allScenarios', () => {
  it('prices five distinct paths', () => {
    const scenarios = allScenarios(inputs({ taxRate: 8.5 }));
    expect(scenarios.map((s) => s.key)).toEqual([
      'outright',
      'applecard',
      'upgrade-12',
      'upgrade-24',
      'carrier'
    ]);
  });

  it('asks the least up front on the leases', () => {
    const scenarios = allScenarios(inputs({ taxRate: 8.5, activationFee: 35 }));
    const cheapestToday = Math.min(...scenarios.map((s) => s.summary.today));
    expect(scenarios.find((s) => s.key === 'upgrade-24')!.summary.today).toBe(cheapestToday);
  });
});
