import { describe, it, expect } from 'vitest';
import {
  allScenarios,
  appleCardFinancing,
  appleUpgrade,
  buyoutAfter,
  carrierFinancing,
  CATEGORIES,
  beats,
  EXTENSION_MONTHS,
  HORIZON,
  leasePayment,
  outright,
  PASTIMES,
  roundTo99,
  usedFraction,
  type Category,
  type Inputs,
  type Scenario
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
    resaleAtHorizon: 380,
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
    const scenario = appleUpgrade(inputs({ endChoice: 'buyout', resaleAtHorizon: 380 }));
    expect(scenario.summary.equityAtHorizon).toBeCloseTo(380, 2);
  });

  it('is zero when you handed the phone back', () => {
    const scenario = appleUpgrade(inputs({ endChoice: 'return' }));
    expect(scenario.summary.equityAtHorizon).toBe(0);
  });

  it('nets the outstanding buyout out of a device you are still leasing', () => {
    const input = inputs({ endChoice: 'upgrade', resaleAtHorizon: 900 });
    const scenario = appleUpgrade(input);
    const owed = scenario.rows[HORIZON].buyout;
    expect(owed).not.toBeNull();

    // Month 48 falls on a term boundary either way, so the phone in hand is
    // exactly `term` months old, valued off the depreciation curve and scaled
    // to agree with the closing number given above.
    const scale = 900 / (input.listPrice * usedFraction(HORIZON));
    const replacement = input.listPrice * usedFraction(input.term) * scale;
    expect(scenario.summary.equityAtHorizon).toBeCloseTo(replacement - owed!, 2);
  });

  // Halfway through a lease the buyout is still above what the phone fetches —
  // a 24-month lease has only collected 35% of list at month 12, leaving a 65%
  // buyout on a device worth 62%. The option only goes in the money near term,
  // which is why the walk-away ending stops being tempting exactly when Apple
  // offers it to you. Priced on the depreciation curve's own values.
  it('leaves the buyout under water midway through a replacement lease', () => {
    const input = inputs({ endChoice: 'upgrade', resaleAtHorizon: 1199 * 0.24 });
    const scenario = appleUpgrade(input);
    const midLease = input.listPrice * usedFraction(12);

    // Month 36 is twelve months into the second lease.
    expect(scenario.rows[36].buyout!).toBeGreaterThan(midLease);
  });

  it('is zero when the phone is worth less than what is still owed on it', () => {
    const scenario = appleUpgrade(inputs({ endChoice: 'upgrade', resaleAtHorizon: 120 }));
    expect(scenario.summary.equityAtHorizon).toBe(0);
  });
});

describe('usedFraction', () => {
  it('hits its anchor points and decays monotonically', () => {
    expect(usedFraction(0)).toBeCloseTo(1, 3);
    expect(usedFraction(12)).toBeCloseTo(0.62, 3);
    expect(usedFraction(24)).toBeCloseTo(0.45, 3);
    expect(usedFraction(36)).toBeCloseTo(0.33, 3);
    expect(usedFraction(HORIZON)).toBeCloseTo(0.24, 3);
    for (let m = 1; m <= 72; m++) expect(usedFraction(m)).toBeLessThanOrEqual(usedFraction(m - 1));
  });

  it('interpolates between anchors', () => {
    expect(usedFraction(18)).toBeCloseTo((0.62 + 0.45) / 2, 3);
  });
});

describe('pastimes', () => {
  it('has enough to cover the longest phoneless stretch without repeating', () => {
    // A 12-month lease handed back leaves every month after it empty.
    expect(PASTIMES.length).toBeGreaterThanOrEqual(HORIZON - 12);
    expect(new Set(PASTIMES).size).toBe(PASTIMES.length);
  });

  it('suggests something for every month after you hand the phone back', () => {
    const scenario = appleUpgrade(inputs({ term: 12, endChoice: 'return' }));
    const idle = scenario.rows.filter((r) => r.month > 12);

    expect(idle).toHaveLength(HORIZON - 12);
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
  it('counts every month of the horizon when you own it', () => {
    expect(outright(inputs()).summary.monthsWithPhone).toBe(HORIZON);
  });

  it('stops counting the month you walk away', () => {
    expect(appleUpgrade(inputs({ endChoice: 'return' })).summary.monthsWithPhone).toBe(24);
  });
});

describe('allScenarios', () => {
  // Four columns, because four is what fits across a phone. Which lease shows
  // up is the reader's pick; nobody is asked to choose between paying and
  // leasing, since that is the comparison itself.
  it('prices exactly the four columns the visual draws', () => {
    const scenarios = allScenarios(inputs({ taxRate: 8.5 }));
    expect(scenarios.map((s) => s.key)).toEqual(['outright', 'applecard', 'upgrade-24', 'carrier']);
  });

  it('follows the lease term the reader picked', () => {
    const scenarios = allScenarios(inputs({ term: 12 }));
    expect(scenarios.map((s) => s.key)).toContain('upgrade-12');
    expect(scenarios.map((s) => s.key)).not.toContain('upgrade-24');
  });

  it('runs every column to the same horizon', () => {
    for (const scenario of allScenarios(inputs())) {
      expect(scenario.rows).toHaveLength(HORIZON + 1);
      expect(scenario.rows[HORIZON].month).toBe(HORIZON);
    }
  });

  it('asks the least up front on the lease', () => {
    const scenarios = allScenarios(inputs({ taxRate: 8.5, activationFee: 35 }));
    const cheapestToday = Math.min(...scenarios.map((s) => s.summary.today));
    expect(scenarios.find((s) => s.key === 'upgrade-24')!.summary.today).toBe(cheapestToday);
  });

  it('gives every column a name short enough for a column head', () => {
    for (const scenario of allScenarios(inputs())) {
      expect(scenario.shortName.length).toBeLessThanOrEqual(8);
    }
  });
});

// The stacked columns are only honest if the bands add up to the bar.
describe('category split', () => {
  function total(scenario: Scenario, month: number): number {
    return CATEGORIES.reduce((sum, c) => sum + scenario.rows[month].runningByCategory[c], 0);
  }

  it('reconciles with the running total in every column, every month', () => {
    const input = inputs({
      taxRate: 8.5,
      tradeIn: 200,
      caseCost: 59,
      activationFee: 35,
      appleCare: 'monthly',
      appleCardBack: 3,
      klarnaCardBack: 3,
      carrierCardBack: 2,
      carrierCredits: 300
    });
    for (const scenario of allScenarios(input)) {
      for (let m = 0; m <= HORIZON; m++) {
        expect(total(scenario, m)).toBeCloseTo(scenario.rows[m].runningCash, 6);
      }
    }
  });

  it('reconciles in present-value terms too', () => {
    const scenario = appleUpgrade(inputs({ taxRate: 8.5, appleCare: 'annual', appleCardBack: 3 }));
    for (let m = 0; m <= HORIZON; m++) {
      const npv = CATEGORIES.reduce((sum, c) => sum + scenario.rows[m].runningNpvByCategory[c], 0);
      expect(npv).toBeCloseTo(scenario.rows[m].runningNpv, 6);
    }
  });

  // Every lease payment comes off the purchase option fee, so the same dollar
  // is rent or equity depending only on whether you end up owning the phone.
  // This is the one judgement call in the split, and the page says so.
  it('counts lease payments as equity on the endings where you keep it', () => {
    for (const endChoice of ['buyout', 'nothing'] as const) {
      const last = appleUpgrade(inputs({ endChoice })).rows[HORIZON].runningByCategory;
      expect(last.rent).toBe(0);
      expect(last.phone).toBeCloseTo(1199, 2);
    }
  });

  it('counts them as rent on the endings where you do not', () => {
    for (const endChoice of ['return', 'upgrade'] as const) {
      const last = appleUpgrade(inputs({ endChoice })).rows[HORIZON].runningByCategory;
      expect(last.phone).toBe(0);
      expect(last.rent).toBeGreaterThan(0);
    }
  });

  it('splits the hand-back ending into exactly the lease share', () => {
    const scenario = appleUpgrade(inputs({ endChoice: 'return' }));
    expect(scenario.rows[HORIZON].runningByCategory.rent).toBeCloseTo(
      leasePayment(1199, 24) * 24,
      2
    );
  });

  it('books the whole cash purchase as equity on day one', () => {
    const scenario = outright(inputs({ taxRate: 8.5 }));
    expect(scenario.rows[0].runningByCategory.phone).toBeCloseTo(1199 * 1.085, 2);
  });

  it('books the carrier’s up-front tax as a fee, not as the phone', () => {
    const scenario = carrierFinancing(inputs({ taxRate: 8.5 }));
    expect(scenario.rows[0].runningByCategory.fees).toBeCloseTo(1199 * 0.085, 2);
    expect(scenario.rows[0].runningByCategory.phone).toBe(0);
  });

  it('nets card rewards against the category that earned them', () => {
    const base = inputs({ taxRate: 8.5, appleCare: 'monthly' });
    const withBack = appleCardFinancing({ ...base, appleCardBack: 3 });
    const without = appleCardFinancing(base);
    const drop = (c: Category) =>
      without.rows[HORIZON].runningByCategory[c] - withBack.rows[HORIZON].runningByCategory[c];

    expect(drop('phone')).toBeCloseTo(without.rows[HORIZON].runningByCategory.phone * 0.03, 6);
    expect(drop('care')).toBeCloseTo(without.rows[HORIZON].runningByCategory.care * 0.03, 6);
  });
});

// Every path has to keep paying for the same phone across the same 48 months,
// or the columns are not comparing anything.
describe('the treadmill', () => {
  it('signs a new lease every term and never stops paying', () => {
    const scenario = appleUpgrade(inputs({ endChoice: 'upgrade' }));
    for (let m = 1; m <= HORIZON; m++) expect(scenario.rows[m].outflow).toBeGreaterThan(0);
    expect(scenario.rows[HORIZON].owns).toBe(false);
  });

  it('charges the full rate once the trade-in credit is gone', () => {
    const gross = leasePayment(1199, 24);
    const scenario = appleUpgrade(inputs({ tradeIn: 375, endChoice: 'upgrade' }));
    expect(scenario.rows[24].outflow).toBeCloseTo(gross - 375 / 24, 2);
    expect(scenario.rows[25].outflow).toBeCloseTo(gross, 2);
  });

  it('re-runs the damage gamble at every handback', () => {
    const scenario = appleUpgrade(
      inputs({ term: 12, endChoice: 'upgrade', damageFee: 250, damageOdds: 20 })
    );
    const hits = scenario.rows.filter((r) =>
      r.items.some((i) => i.label === 'Expected damage fee')
    );
    expect(hits.map((r) => r.month)).toEqual([12, 24, 36, 48]);
  });

  it('stops the carrier and the Apple Card at their own terms', () => {
    const card = appleCardFinancing(inputs());
    const carrier = carrierFinancing(inputs());
    expect(card.rows[24].outflow).toBeGreaterThan(0);
    expect(card.rows[25].outflow).toBe(0);
    expect(carrier.rows[36].outflow).toBeGreaterThan(0);
    expect(carrier.rows[37].outflow).toBe(0);
  });

  it('bills a case and an activation fee under one name everywhere', () => {
    const input = inputs({ caseCost: 59, activationFee: 35 });
    for (const scenario of allScenarios(input)) {
      const labels = scenario.rows[0].items.map((i) => i.label);
      expect(labels).toContain('Case');
      expect(labels).toContain('Carrier activation');
    }
  });
});

describe('beats', () => {
  it('stops on the month the lease term runs out and on the last month', () => {
    const story = beats(inputs({ term: 24 }));
    expect(story.has(24)).toBe(true);
    expect(story.has(HORIZON)).toBe(true);
  });

  it('calls out the month the trade-in credit runs dry', () => {
    expect(beats(inputs({ tradeIn: 375 })).has(25)).toBe(true);
    expect(beats(inputs({ tradeIn: 0 })).has(25)).toBe(false);
  });

  it('never points past the horizon', () => {
    for (const term of [12, 24] as const) {
      for (const endChoice of ['return', 'upgrade', 'buyout', 'nothing'] as const) {
        for (const month of beats(inputs({ term, endChoice })).keys()) {
          expect(month).toBeGreaterThanOrEqual(0);
          expect(month).toBeLessThanOrEqual(HORIZON);
        }
      }
    }
  });
});
