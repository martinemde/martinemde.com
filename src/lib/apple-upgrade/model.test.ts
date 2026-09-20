import { describe, it, expect } from 'vitest';
import {
  allScenarios,
  appleCardFinancing,
  appleUpgrade,
  buyoutAfter,
  carrierFinancing,
  carrierTradeInDeal,
  leaseTermForUpgrade,
  leaseTerms,
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
    screenChoice: null,
    screenRepairCost: 250,
    appleCareRepairCost: 29,
    taxRate: 0,
    activationFee: 0,
    caseCost: 0,
    appleCardBack: 0,
    klarnaCardBack: 0,
    carrierCardBack: 0,
    discountRate: 4,
    resaleAtTerm: 500,
    resaleAtHorizon: 380,
    upgradeTradeIns: [744, 540, 396, 288],
    carrierOffer: null,
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
  it('iPhone 18 Pro 256GB at $1199', () => {
    expect(leasePayment(1199, 12)).toBeCloseTo(49.99, 2);
    expect(leasePayment(1199, 24)).toBeCloseTo(34.99, 2);
  });

  it('iPhone Duo at $1999', () => {
    expect(leasePayment(1999, 24)).toBeCloseTo(57.99, 2);
  });

  it.each([
    [899, 36.99, 25.99],
    [1099, 45.99, 31.99],
    [1299, 53.99, 37.99],
    [1999, 82.99, 57.99]
  ])('derives both payments for a $%d iPhone', (price, annual, biennial) => {
    expect(leasePayment(price, 12)).toBeCloseTo(annual, 2);
    expect(leasePayment(price, 24)).toBeCloseTo(biennial, 2);
  });
});

describe('trade-in credit', () => {
  // A $375 trade-in against a $1,199 iPhone.
  it('is spread evenly across the initial term', () => {
    expect(leasePayment(1199, 12) - 375 / 12).toBeCloseTo(18.74, 2);
    expect(leasePayment(1199, 24) - 375 / 24).toBeCloseTo(19.37, 2);
  });

  it('bills the payment Apple quotes', () => {
    expect(leaseTerms(1199, 12, 375).payment).toBeCloseTo(18.74, 2);
    expect(leaseTerms(1199, 24, 375).payment).toBeCloseTo(19.37, 2);
  });

  it('comes straight off the buyout on day one', () => {
    const { credit } = leaseTerms(1199, 24, 375);
    expect(buyoutAfter(1199, credit, 0)).toBeCloseTo(1199 - 375, 2);
  });

  it('is fully consumed by the end of the term', () => {
    const withTrade = leaseTerms(1199, 24, 375);
    const without = leaseTerms(1199, 24, 0);
    expect(withTrade.buyoutAtTerm).toBeCloseTo(without.buyoutAtTerm, 1);
  });

  /**
   * A lease only ever collects half or seventy percent of the sticker, so a
   * trade-in can run out of payments to reduce. What happens then is what the
   * first cut of this model got wrong: it quietly swallowed the surplus, so a
   * big enough trade-in had you paying more than the phone ever cost.
   */
  describe('when it covers the whole lease', () => {
    it('drops the payment to nothing rather than to loose change', () => {
      // A 12-month lease on a $999 phone collects $499.50. Trade in $500 and
      // there is nothing left to bill, x.99 rounding notwithstanding.
      expect(leaseTerms(999, 12, 500).payment).toBe(0);
    });

    it('leaves the sticker less the trade-in to buy out', () => {
      const { credit, payment, buyoutAtTerm } = leaseTerms(999, 12, 500);
      expect(credit).toBeCloseTo(499.5, 2);
      expect(payment).toBe(0);
      expect(buyoutAtTerm).toBeCloseTo(999 - 499.5, 2);
    });

    it('hands the surplus back as Apple credit', () => {
      // $800 against a $999 phone: the same $0 payment, and a gift card for
      // the $300.50 the lease had no room for.
      const { payment, refund } = leaseTerms(999, 12, 800);
      expect(payment).toBe(0);
      expect(refund).toBeCloseTo(300.5, 2);
    });

    it('never lets you pay more than the phone, trade-in included', () => {
      for (const tradeIn of [0, 250, 500, 800, 1500]) {
        for (const endChoice of ['buyout', 'nothing'] as const) {
          const scenario = appleUpgrade(inputs({ listPrice: 999, term: 12, tradeIn, endChoice }));
          const { credit, refund } = leaseTerms(999, 12, tradeIn);
          expect(scenario.summary.cash + credit).toBeCloseTo(999, 2);
          expect(scenario.summary.tradeInRefund).toBeCloseTo(refund, 2);
          // Cash out, plus what you traded in, less what came back as credit.
          expect(scenario.summary.cash + tradeIn - refund).toBeCloseTo(999, 2);
        }
      }
    });

    it('runs the extension at the full rate, then settles the remainder', () => {
      const scenario = appleUpgrade(
        inputs({ listPrice: 999, term: 12, tradeIn: 500, endChoice: 'nothing' })
      );
      const gross = leasePayment(999, 12);
      for (let m = 1; m <= 12; m++) expect(scenario.rows[m].outflow).toBe(0);
      for (let m = 13; m <= 17; m++) expect(scenario.rows[m].outflow).toBeCloseTo(gross, 2);
      // The month the window closes is one line, not a payment and a balloon.
      expect(scenario.rows[18].items).toHaveLength(1);
      expect(scenario.rows[18].outflow).toBeCloseTo(999 - 499.5 - 5 * gross, 2);
      expect(scenario.summary.cash).toBeCloseTo(999 - 499.5, 2);
    });

    it('hands surplus back on the purchase paths too', () => {
      const input = inputs({ listPrice: 999, tradeIn: 1500, taxRate: 0 });
      expect(outright(input).summary.tradeInRefund).toBeCloseTo(501, 2);
      expect(carrierFinancing(input).summary.tradeInRefund).toBeCloseTo(501, 2);
      expect(outright(input).rows[0].outflow).toBe(0);
    });

    /**
     * Apple's promise, read with a trade-in in it: you never pay more than the
     * price of the phone after trade-in. Which means a lease you see through to
     * owning the phone can never cost more than just buying it — the credit the
     * lease could not use comes back, and what is left is taxed only on what
     * you actually paid.
     */
    it('never costs more than buying outright when you keep the phone', () => {
      for (const listPrice of [799, 999, 1199]) {
        for (const term of [12, 24] as const) {
          for (const tradeIn of [0, 200, 500, 800, 1500]) {
            for (const endChoice of ['buyout', 'nothing'] as const) {
              const input = inputs({ listPrice, term, tradeIn, endChoice, taxRate: 8.5 });
              const lease = appleUpgrade(input).summary;
              const cash = outright(input).summary;
              expect(lease.cash - lease.tradeInRefund).toBeLessThanOrEqual(
                cash.cash - cash.tradeInRefund + 0.01
              );
            }
          }
        }
      }
    });

    it('lets a purchase absorb more of a trade-in than a lease can', () => {
      const input = inputs({ listPrice: 999, term: 12, tradeIn: 800, taxRate: 0 });
      // The whole point: buying uses all $800, the lease can only use $499.50.
      expect(outright(input).summary.tradeInRefund).toBe(0);
      expect(appleUpgrade(input).summary.tradeInRefund).toBeCloseTo(300.5, 2);
    });
  });
});

describe('buyout', () => {
  it('drops by exactly what you paid that month', () => {
    const { credit, payment } = leaseTerms(1199, 24, 375);
    for (let m = 1; m <= 24; m++) {
      const drop =
        buyoutAfter(1199, credit, payment * (m - 1)) - buyoutAfter(1199, credit, payment * m);
      expect(drop).toBeCloseTo(payment, 6);
    }
  });

  it('keeps falling through the six-month extension', () => {
    const gross = leasePayment(1199, 24);
    expect(buyoutAfter(1199, 0, gross * 30)).toBeCloseTo(1199 - 30 * gross, 2);
  });

  it('leaves 30% of sticker on the table at the end of a 24-month term', () => {
    expect(leaseTerms(1199, 24, 0).buyoutAtTerm / 1199).toBeCloseTo(0.3, 2);
  });

  it('leaves 50% on the table at the end of a 12-month term', () => {
    expect(leaseTerms(1199, 12, 0).buyoutAtTerm / 1199).toBeCloseTo(0.5, 2);
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
    // Apple's quoted number right through the term, then the full rate.
    expect(scenario.rows[24].outflow).toBeCloseTo(19.37, 2);
    expect(scenario.rows[25].outflow).toBeCloseTo(34.99, 2);
  });

  it('drops the balloon at the end of the extension, not the term', () => {
    const scenario = appleUpgrade(inputs({ endChoice: 'nothing' }));
    const balloon = 24 + EXTENSION_MONTHS;
    expect(scenario.rows[balloon].outflow).toBeGreaterThan(scenario.rows[balloon - 1].outflow);
    expect(scenario.rows[balloon + 1].outflow).toBe(0);
  });

  it('bills the last month of the extension once, as the remainder', () => {
    const scenario = appleUpgrade(inputs({ endChoice: 'nothing' }));
    const close = 24 + EXTENSION_MONTHS;
    // Every month of the window but the last is a payment; the last settles.
    for (let m = 25; m < close; m++) {
      expect(scenario.rows[m].items.map((i) => i.label)).toEqual(['Month-to-month payment']);
    }
    expect(scenario.rows[close].items.map((i) => i.label)).toEqual([
      'Automatic buyout — it\u2019s yours'
    ]);
  });
});

describe('tax', () => {
  it.each(['buyout', 'nothing'] as const)(
    'collects equal device tax across ownership paths with %s',
    (endChoice) => {
      for (const scenario of allScenarios(inputs({ endChoice, taxRate: 8.5 }))) {
        expect(scenario.rows[HORIZON].runningByCategory.tax).toBeCloseTo(1199 * 0.085, 8);
        expect(scenario.rows[HORIZON].runningByCategory.fees).toBe(0);
      }
    }
  );

  it.each(['monthly', 'annual', 'one'] as const)(
    'separates tax on every taxable charge with %s coverage',
    (appleCare) => {
      const input = inputs({
        appleCare,
        taxRate: 10,
        caseCost: 50,
        activationFee: 35,
        screenChoice: 'repair',
        endChoice: 'nothing'
      });
      for (const scenario of allScenarios(input)) {
        for (const row of scenario.rows) {
          for (const charge of row.items.filter((item) => item.category !== 'tax')) {
            const tax = row.items.find((item) => item.taxFor === charge.label);
            if (
              charge.label === 'Carrier activation' ||
              charge.label === 'Device installment' ||
              charge.label === 'Installment'
            ) {
              expect(tax).toBeUndefined();
            } else {
              expect(tax?.amount).toBeCloseTo(charge.amount * 0.1, 8);
              expect(tax?.biller).toBe(charge.biller);
            }
          }
        }
      }
    }
  );

  it('shows no tax charges when the tax rate is zero', () => {
    for (const scenario of allScenarios(
      inputs({ taxRate: 0, appleCare: 'monthly', screenChoice: 'repair', caseCost: 50 })
    )) {
      expect(
        scenario.rows
          .flatMap((row) => row.items)
          .filter((item) => item.category === 'tax' && item.amount > 0)
      ).toEqual([]);
    }
  });

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

  it.each([0, 375, 1199, 1250, 1500])(
    'keeps cash totals and rewards unchanged with a $%s trade-in',
    (tradeIn) => {
      const scenario = outright(inputs({ taxRate: 8.5, tradeIn, appleCardBack: 3 }));
      const owed = Math.max(0, 1199 * 1.085 - tradeIn);
      const dayOne = scenario.rows[0];
      expect(dayOne.outflow).toBeCloseTo(owed, 8);
      expect(dayOne.rewards).toBeCloseTo(owed * 0.03, 8);
      expect(scenario.summary.cash).toBeCloseTo(owed * 0.97, 8);
      expect(scenario.summary.tradeInRefund).toBeCloseTo(Math.max(0, tradeIn - 1199 * 1.085), 8);
      expect(dayOne.runningByCategory.tax).toBeCloseTo(
        Math.max(0, 1199 * 0.085 - Math.max(0, tradeIn - 1199)) * 0.97,
        8
      );
      expect(scenario.rows.slice(1).every((row) => row.outflow === 0)).toBe(true);
    }
  );
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
    expect(scenario.rows[48].outflow).toBe(0);
    expect(scenario.summary.cash).toBeCloseTo(1199 + 4 * 149, 2);
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
      carrierOffer: 300
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
      expect(last.phone).toBeCloseTo(1199, 1);
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
      leaseTerms(1199, 24, 0).payment * 24,
      2
    );
  });

  it('separates the cash purchase from its upfront tax', () => {
    const scenario = outright(inputs({ taxRate: 8.5 }));
    expect(scenario.rows[0].runningByCategory.phone).toBeCloseTo(1199, 2);
    expect(scenario.rows[0].runningByCategory.tax).toBeCloseTo(1199 * 0.085, 2);
  });

  it('books the carrier’s up-front tax separately from fees and phone', () => {
    const scenario = carrierFinancing(inputs({ taxRate: 8.5 }));
    expect(scenario.rows[0].runningByCategory.tax).toBeCloseTo(1199 * 0.085, 2);
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

  it('gives a replacement lease no trade-in credit to work with', () => {
    const gross = leasePayment(1199, 24);
    const scenario = appleUpgrade(inputs({ tradeIn: 375, endChoice: 'upgrade' }));
    // Month 36 is twelve payments into the second lease, all at the full rate.
    expect(scenario.rows[36].buyout).toBeCloseTo(buyoutAfter(1199, 0, gross * 12), 2);
  });

  describe('one cracked screen at month nine', () => {
    for (const appleCare of ['none', 'monthly', 'annual', 'one'] as const) {
      const price = appleCare === 'none' ? 250 : 29;
      it(`charges all four paths once for an immediate repair with ${appleCare} coverage`, () => {
        for (const scenario of allScenarios(
          inputs({ appleCare, screenChoice: 'repair', endChoice: 'upgrade' })
        )) {
          const repairs = scenario.rows.flatMap((r) =>
            r.items
              .filter((i) => i.category === 'repair')
              .map((i) => ({ month: r.month, amount: i.amount }))
          );
          expect(repairs).toEqual([{ month: 9, amount: price }]);
          expect(scenario.rows[48].runningByCategory.repair).toBe(price);
        }
      });
      for (const term of [12, 24] as const) {
        for (const endChoice of ['return', 'upgrade', 'buyout', 'nothing'] as const) {
          it(`defers a repair with ${appleCare} coverage on ${term}-month ${endChoice}`, () => {
            for (const scenario of allScenarios(
              inputs({ appleCare, term, upgradeEvery: term, endChoice, screenChoice: 'defer' })
            )) {
              const repairs = scenario.rows.flatMap((r) =>
                r.items
                  .filter((i) => i.label === 'Screen repair before return')
                  .map((i) => ({ month: r.month, amount: i.amount }))
              );
              expect(repairs).toEqual(
                scenario.key.startsWith('upgrade') && ['return', 'upgrade'].includes(endChoice)
                  ? [{ month: term + 1, amount: price }]
                  : []
              );
            }
          });
        }
      }
    }
    it('charges nothing when the crack is dismissed or unanswered', () => {
      for (const screenChoice of [null, 'dismiss'] as const) {
        for (const scenario of allScenarios(inputs({ screenChoice, endChoice: 'upgrade' }))) {
          expect(
            scenario.rows.flatMap((r) => r.items.filter((i) => i.category === 'repair'))
          ).toEqual([]);
        }
      }
    });
    it('separates repair and tax while preserving rewards and discounting', () => {
      const scenario = appleUpgrade(
        inputs({ screenChoice: 'repair', taxRate: 10, appleCardBack: 3, discountRate: 6 })
      );
      const row = scenario.rows[9];
      expect(row.items.find((i) => i.category === 'repair')?.amount).toBeCloseTo(250);
      expect(row.runningByCategory.repair).toBeCloseTo(250 * 0.97);
      expect(row.runningNpvByCategory.repair).toBeCloseTo((250 * 0.97) / 1.005 ** 9);
    });
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
  it('suggests upgrading at month 35 only when there were no earlier upgrades', () => {
    for (const upgradeMonths of [[], [36]]) {
      expect(beats(inputs({ upgradeMonths })).get(35)?.title).toBe(
        'Carrier financing maxed. Consider upgrading.'
      );
    }
    for (const upgradeMonths of [[12], [24], [12, 24, 36]]) {
      expect(beats(inputs({ upgradeMonths })).has(35)).toBe(false);
    }
  });

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

describe('upgrade preferences and carrier offers', () => {
  const deviceItems = (scenario: Scenario, month: number) =>
    scenario.rows[month].items.filter((item) => item.category === 'phone');

  it.each([
    [12, 12],
    [24, 24],
    [36, 24]
  ] as const)('compares a %s-month preference with a %s-month lease', (months, term) => {
    expect(leaseTermForUpgrade(months)).toBe(term);
  });

  it('keeps old Apple Card payments running and discounts only the new phone', () => {
    const scenario = appleCardFinancing(
      inputs({
        listPrice: 1200,
        upgradeEvery: 12,
        upgradeTradeIn: 600,
        upgradeTradeIns: undefined,
        taxRate: 10
      })
    );
    expect(scenario.rows[0].outflow).toBe(120);
    expect(scenario.rows[1].outflow).toBe(50);
    expect(scenario.rows[12].outflow).toBe(170); // final old-year payment plus new phone tax
    expect(deviceItems(scenario, 13).map((item) => [item.label, item.amount])).toEqual([
      ['Installment on traded-in phone', 50],
      ['Installment', 25]
    ]);
    expect(scenario.rows[24].outflow).toBe(195); // 75 of installments plus tax on third phone
    expect(scenario.rows[25].outflow).toBe(50);
    expect(scenario.summary.remainingBalance).toBe(300);
    expect(scenario.rows[48].items.some((item) => item.label === 'Sales tax, up front')).toBe(
      false
    );
  });

  it.each([24, 36] as const)(
    'does not overlap Apple Card loans when replacing every %s months',
    (upgradeEvery) => {
      const scenario = appleCardFinancing(
        inputs({ listPrice: 1200, upgradeEvery, upgradeTradeIn: 600 })
      );
      expect(
        scenario.rows.some((row) =>
          row.items.some((item) => item.label === 'Installment on traded-in phone')
        )
      ).toBe(false);
      expect(scenario.rows[upgradeEvery + 1].outflow).toBe(25);
    }
  );

  it.each([
    [12, 400, 800],
    [24, 800, 400],
    [36, 1200, 0]
  ] as const)(
    'earns $%s months of credits and forfeits the remainder at upgrade',
    (upgradeEvery, earned, lost) => {
      const input = inputs({
        listPrice: 1200,
        tradeIn: 400,
        carrierOffer: 1200,
        upgradeEvery,
        upgradeTradeIn: 600
      });
      const deal = carrierTradeInDeal(input);
      expect(deal.financed).toBe(1200); // do not also subtract Apple's $400 trade-in
      expect(deal.earned).toBeCloseTo(earned);
      expect(deal.forfeited).toBeCloseTo(lost);
      const scenario = carrierFinancing(input);
      const payoff = scenario.rows[upgradeEvery].items.find(
        (item) => item.label === 'Pay off phone before upgrading'
      );
      expect(payoff?.amount ?? 0).toBeCloseTo(lost);
      expect(scenario.rows[upgradeEvery].forfeitedCredits ?? 0).toBeCloseTo(lost);
      // Forfeited credits are not a second charge on top of the payoff.
      expect(scenario.rows[upgradeEvery].outflow).toBeCloseTo(lost);
      expect(scenario.rows[upgradeEvery + 1].outflow).toBeCloseTo(0);
    }
  );

  it('pays cash again, using the replacement trade-in but not forgiving any debt', () => {
    const scenario = outright(
      inputs({
        listPrice: 1200,
        tradeIn: 400,
        upgradeEvery: 12,
        upgradeTradeIn: 600,
        upgradeTradeIns: undefined,
        taxRate: 10
      })
    );
    expect([0, 12, 24, 36].map((m) => scenario.rows[m].outflow)).toEqual([920, 720, 720, 720]);
    expect(scenario.rows[48].outflow).toBe(0);
    expect(scenario.summary.remainingBalance).toBe(0);
  });

  it('subtracts all remaining carrier debt from closing equity', () => {
    const input = inputs({
      listPrice: 1200,
      carrierOffer: 1200,
      upgradeEvery: 36,
      resaleAtHorizon: 288
    });
    const scenario = carrierFinancing(input);
    expect(scenario.summary.remainingBalance).toBeCloseTo(800);
    expect(scenario.summary.equityAtHorizon).toBeCloseTo(1200 * 0.62 - 800);
    expect(scenario.summary.carrierCreditsLost).toBe(0);
  });

  it('reconciles every category through repeated upgrades, repairs and credit forfeitures', () => {
    for (const upgradeEvery of [12, 24, 36] as const) {
      for (const scenario of allScenarios(
        inputs({
          upgradeEvery,
          carrierOffer: 1000,
          tradeIn: 375,
          upgradeTradeIn: 500,
          taxRate: 8.5,
          appleCare: 'monthly',
          screenChoice: 'defer',
          caseCost: 59,
          activationFee: 35,
          appleCardBack: 3,
          carrierCardBack: 2
        })
      )) {
        for (const row of scenario.rows) {
          expect(Object.values(row.runningByCategory).reduce((a, b) => a + b, 0)).toBeCloseTo(
            row.runningCash,
            7
          );
          expect(Object.values(row.runningNpvByCategory).reduce((a, b) => a + b, 0)).toBeCloseTo(
            row.runningNpv,
            7
          );
          expect(row.items.filter((item) => item.category === 'repair').length).toBeLessThanOrEqual(
            1
          );
        }
      }
    }
  });
});

describe('shared yearly upgrade decisions', () => {
  const scheduled = (upgradeMonths: number[], overrides: Partial<Inputs> = {}) =>
    inputs({ listPrice: 1200, resaleAtHorizon: 288, upgradeMonths, ...overrides });

  it('keeps the original phone on all five paths when every answer is keep', () => {
    const scenarios = allScenarios(scheduled([]));
    expect(scenarios.map((s) => s.key)).toEqual([
      'outright',
      'applecard',
      'upgrade-12',
      'upgrade-24',
      'carrier'
    ]);
    for (const s of scenarios) {
      expect(s.summary.cash).toBeCloseTo(1200, 6);
      expect(s.summary.equityAtHorizon).toBeCloseTo(288, 6);
      expect(s.summary.remainingBalance).toBe(0);
      expect(s.rows.every((row) => row.hasPhone)).toBe(true);
    }
    expect(
      scenarios[2].rows[18].items.some((item) => item.label.startsWith('Automatic buyout'))
    ).toBe(true);
    expect(
      scenarios[3].rows[30].items.some((item) => item.label.startsWith('Automatic buyout'))
    ).toBe(true);
  });

  it('replaces every path only in the selected years, with age-based trade-ins', () => {
    const input = scheduled([12, 36], { activationFee: 35 });
    for (const scenario of allScenarios(input)) {
      expect(
        scenario.rows
          .filter((row) => row.items.some((item) => item.label === 'Carrier activation'))
          .map((row) => row.month)
      ).toEqual([0, 12, 36]);
    }
    const cash = outright(input);
    expect(
      cash.rows[12].items.find((item) => item.label === 'New phone after trade-in')?.amount
    ).toBeCloseTo(1200 * (1 - 0.62));
    expect(
      cash.rows[36].items.find((item) => item.label === 'New phone after trade-in')?.amount
    ).toBeCloseTo(1200 * (1 - 0.45));
    expect(cash.rows[24].outflow).toBe(0);
    expect(cash.summary.equityAtHorizon).toBeCloseTo(744);
  });

  it('returns a 12-month lease at yearly upgrades without inventing another trade-in', () => {
    const lease = appleUpgrade(scheduled([12, 24, 36], { term: 12, tradeIn: 375 }));
    expect(lease.rows[1].outflow).toBeCloseTo(49.99 - 375 / 12);
    expect(lease.rows[13].outflow).toBeCloseTo(49.99);
    expect(lease.summary.cash).toBeCloseTo(49.99 * 48 - 375);
    expect(lease.rows.some((row) => row.items.some((item) => item.label.includes('buyout')))).toBe(
      false
    );
  });

  it.each([0, 825])('explains return equity independently of the initial $%s credit', (tradeIn) => {
    const input = scheduled([12, 24, 36], {
      listPrice: 1999,
      term: 12,
      tradeIn,
      taxRate: 8.5,
      upgradeTradeIns: [1480, 1000, 700, 500]
    });
    const lease = appleUpgrade(input);
    for (const month of [12, 24, 36]) {
      expect(lease.rows[month].leaseReturn).toEqual({
        value: 1480,
        buyout: expect.closeTo((1999 - 82.99 * 12) * 1.085, 6),
        privateSale: false
      });
    }
    // Changing the phone's estimated value changes the explanation, not lease bills.
    const low = appleUpgrade({ ...input, upgradeTradeIns: [500, 400, 300, 200] });
    expect(low.rows.map((row) => row.outflow)).toEqual(lease.rows.map((row) => row.outflow));
    expect(low.rows[12].leaseReturn?.value).toBe(500);
    expect(low.rows[12].leaseReturn!.value).toBeLessThan(low.rows[12].leaseReturn!.buyout);
    expect(lease.rows[48].leaseReturn).toBeUndefined();
  });

  it('uses the damaged private-sale estimate when explaining return equity', () => {
    const lease = appleUpgrade(
      scheduled([12], {
        term: 12,
        privateSaleValues: [800, 600, 400, 200],
        screenChoice: 'defer',
        screenRepairCost: 250
      })
    );
    expect(lease.rows[12].leaseReturn).toEqual({
      value: 550,
      buyout: expect.closeTo(600.12, 6),
      privateSale: true
    });
  });

  it('settles a 24-month lease before an early upgrade, then trades the owned phone', () => {
    const lease = appleUpgrade(scheduled([12], { term: 24 }));
    expect(lease.rows[12].leaseReturn).toBeUndefined();
    expect(
      lease.rows[12].items.find((item) => item.label === 'Buy out phone before upgrading')?.amount
    ).toBeCloseTo(1200 - 34.99 * 12);
    expect(lease.rows[13].outflow).toBeCloseTo(34.99 - 744 / 24);
    expect(lease.summary.cash).toBeCloseTo(1200 + (1200 - 744));
  });

  it('loses the initial trade-in subsidy in the extension and buys out at six months', () => {
    const lease = appleUpgrade(scheduled([], { term: 12, tradeIn: 375 }));
    expect(lease.rows[12].outflow).toBeCloseTo(49.99 - 375 / 12);
    expect(lease.rows[13].outflow).toBeCloseTo(49.99);
    expect(lease.rows[18].outflow).toBeCloseTo(1200 - 375 - (49.99 - 375 / 12) * 12 - 49.99 * 5);
    expect(lease.rows[18].owns).toBe(true);
    expect(lease.rows[19].outflow).toBe(0);
    expect(lease.summary.cash).toBeCloseTo(825);
  });

  it('trades an automatically bought-out phone at its current age', () => {
    const lease = appleUpgrade(scheduled([24], { term: 12 }));
    expect(lease.rows[18].owns).toBe(true);
    expect(lease.rows[25].outflow).toBeCloseTo(49.99 - 540 / 12);
    expect(lease.summary.cash).toBeCloseTo(1200 + 660);
  });

  it('calculates carrier credit losses per actual interval, not the initial interval', () => {
    const carrier = carrierFinancing(scheduled([12, 36], { carrierOffer: 1200 }));
    expect(carrier.rows[12].forfeitedCredits).toBeCloseTo(800);
    expect(carrier.rows[36].forfeitedCredits).toBeCloseTo(400);
    expect(carrier.summary.carrierCreditsLost).toBeCloseTo(1200);
    expect(carrier.rows[12].outflow).toBeCloseTo(800);
    expect(carrier.rows[36].outflow).toBeCloseTo(400);
  });

  it('repairs a deferred cracked screen only when returning the original leased phone', () => {
    for (const term of [12, 24] as const) {
      const lease = appleUpgrade(scheduled([24, 36], { term, screenChoice: 'defer' }));
      const repairs = lease.rows.filter((row) =>
        row.items.some((item) => item.label === 'Screen repair before return')
      );
      expect(repairs.map((row) => row.month)).toEqual(term === 24 ? [24] : []);
    }
  });

  it('reconciles cash, NPV and categories across every possible three-year decision sequence', () => {
    for (let mask = 0; mask < 8; mask++) {
      const months = [12, 24, 36].filter((_, index) => mask & (1 << index));
      for (const s of allScenarios(
        scheduled(months, {
          tradeIn: 375,
          carrierOffer: 1000,
          appleCardBack: 3,
          klarnaCardBack: 3,
          carrierCardBack: 2,
          taxRate: 8.5,
          caseCost: 59,
          activationFee: 35
        })
      )) {
        let total = 0;
        let npv = 0;
        for (const row of s.rows) {
          total += row.items.reduce((sum, item) => sum + item.amount - (item.reward ?? 0), 0);
          npv += row.net / (1 + 0.04 / 12) ** row.month;
          expect(row.runningCash).toBeCloseTo(total, 7);
          expect(row.runningNpv).toBeCloseTo(npv, 7);
          expect(Object.values(row.runningByCategory).reduce((a, b) => a + b, 0)).toBeCloseTo(
            total,
            7
          );
          expect(Object.values(row.runningNpvByCategory).reduce((a, b) => a + b, 0)).toBeCloseTo(
            npv,
            7
          );
        }
        expect(s.summary.cash).toBeCloseTo(total, 7);
      }
    }
  });
});

describe('unrepaired glass reduces trade-in value', () => {
  const damaged = (overrides: Partial<Inputs> = {}) =>
    inputs({
      listPrice: 1200,
      resaleAtHorizon: 288,
      upgradeMonths: [12, 24, 36],
      screenChoice: 'defer',
      screenRepairCost: 250,
      ...overrides
    });

  it('deducts the full damage estimate once from cash and Apple Card trade-ins', () => {
    for (const path of [outright, appleCardFinancing]) {
      const broken = path(damaged());
      const intact = path(damaged({ screenChoice: 'dismiss' }));
      const month = path === outright ? 12 : 13;
      expect(broken.rows[month].outflow - intact.rows[month].outflow).toBeCloseTo(
        path === outright ? 250 : 250 / 24
      );
      expect(
        broken.summary.cash +
          broken.summary.remainingBalance -
          intact.summary.cash -
          intact.summary.remainingBalance
      ).toBeCloseTo(250);
      expect(broken.rows[0].outflow).toBe(intact.rows[0].outflow);
      expect(broken.rows[37].outflow).toBeCloseTo(intact.rows[37].outflow);
    }
  });

  it.each([null, 1000])(
    'reduces the carrier trade-in, including a promotional offer of %s',
    (carrierOffer) => {
      const broken = carrierFinancing(damaged({ carrierOffer }));
      const intact = carrierFinancing(damaged({ screenChoice: 'dismiss', carrierOffer }));
      if (carrierOffer === null) {
        expect(broken.rows[13].outflow - intact.rows[13].outflow).toBeCloseTo(250 / 36);
      } else {
        expect(
          broken.rows[13].items
            .filter((item) =>
              ['Carrier trade-in credit', 'Screen damage at trade-in'].includes(item.label)
            )
            .reduce((sum, item) => sum + item.amount, 0)
        ).toBeCloseTo(-750 / 36);
        expect(
          broken.rows[25].items.find((item) => item.label === 'Carrier trade-in credit')?.amount
        ).toBeCloseTo(-1000 / 36);
      }
    }
  );

  it('reduces lease trade-ins after early or automatic buyout, without adding a repair bill', () => {
    for (const [term, upgradeMonths] of [
      [24, [12]],
      [12, [24]]
    ] as const) {
      const input = damaged({ term, upgradeMonths: [...upgradeMonths] });
      const broken = appleUpgrade(input);
      const intact = appleUpgrade({ ...input, screenChoice: 'dismiss' });
      expect(broken.summary.cash - intact.summary.cash).toBeCloseTo(250);
      expect(
        broken.rows.some((row) =>
          row.items.some((item) => item.label === 'Screen repair before return')
        )
      ).toBe(false);
    }
  });

  it('charges the repair on an eligible lease return without also reducing a trade-in', () => {
    const broken = appleUpgrade(damaged({ term: 12 }));
    const intact = appleUpgrade(damaged({ term: 12, screenChoice: 'dismiss' }));
    expect(broken.summary.cash - intact.summary.cash).toBeCloseTo(250);
    expect(broken.rows[13].outflow).toBe(intact.rows[13].outflow);
  });

  it.each(['monthly', 'annual', 'one'] as const)(
    'uses %s AppleCare once before trading, selling or returning the original phone',
    (appleCare) => {
      for (const upgradeMonths of [[12, 24, 36], [24, 36], [36], []]) {
        for (const privateSaleValues of [undefined, [900, 700, 500, 300]]) {
          const base = damaged({
            appleCare,
            upgradeMonths,
            privateSaleValues,
            carrierOffer: 1000,
            taxRate: 8.5,
            appleCardBack: 3
          });
          const intact = allScenarios({ ...base, screenChoice: 'dismiss' });
          allScenarios(base).forEach((scenario, index) => {
            const repairs = scenario.rows.flatMap((row) =>
              row.items
                .filter((item) => item.category === 'repair')
                .map((item) => ({ month: row.month, amount: item.amount }))
            );
            expect(repairs).toEqual([{ month: upgradeMonths[0] ?? HORIZON, amount: 29 }]);
            expect(scenario.summary.cash - intact[index].summary.cash).toBeCloseTo(
              29 * 1.085 * 0.97
            );
            expect(scenario.summary.remainingBalance).toBeCloseTo(
              intact[index].summary.remainingBalance
            );
            expect(scenario.summary.equityAtHorizon).toBeCloseTo(
              intact[index].summary.equityAtHorizon
            );
            expect(
              scenario.rows
                .flatMap((row) => row.items)
                .some((item) => item.label.startsWith('Screen damage'))
            ).toBe(false);
          });
          const fixed = outright({ ...base, screenChoice: 'repair' });
          expect(
            fixed.rows.flatMap((row) => row.items.filter((item) => item.category === 'repair'))
          ).toHaveLength(1);
          expect(fixed.rows[9].items.some((item) => item.category === 'repair')).toBe(true);
        }
      }
    }
  );

  it('floors ordinary and promotional trade-ins at zero', () => {
    const base = damaged({ screenRepairCost: 2000, carrierOffer: 1000 });
    expect(outright(base).rows[12].outflow).toBeCloseTo(1200);
    expect(
      carrierFinancing(base)
        .rows[13].items.filter((item) =>
          ['Carrier trade-in credit', 'Screen damage at trade-in'].includes(item.label)
        )
        .reduce((sum, item) => sum + item.amount, 0)
    ).toBeCloseTo(0);
    for (const scenario of allScenarios(base)) {
      const capped = allScenarios({ ...base, screenRepairCost: 10000 }).find(
        (s) => s.key === scenario.key
      )!;
      // Actual lease-return repairs remain uncapped; trade-in deductions cannot exceed value.
      if (scenario.key !== 'upgrade-12')
        expect(capped.summary.cash).toBeCloseTo(scenario.summary.cash);
    }
  });
});

describe('annual upgrades through early lease buyout', () => {
  it.each([480, 600, 744])('accounts for every dollar with a $%s annual trade-in', (value) => {
    const base = inputs({
      listPrice: 1200,
      resaleAtHorizon: (value * 0.24) / 0.62,
      upgradeTradeIns: [value, 400, 300],
      upgradeMonths: [12, 24, 36],
      discountRate: 0
    });
    const long = appleUpgrade({ ...base, term: 24 });
    const short = appleUpgrade({ ...base, term: 12 });
    for (const month of [12, 24, 36]) {
      const start = month - 12;
      const paid = long.rows
        .slice(start + 1, month + 1)
        .flatMap((r) => r.items)
        .reduce((sum, item) => sum + item.amount, 0);
      expect(paid).toBeCloseTo(1200 - (start === 0 ? 0 : value));
      expect(long.rows[month].items.some((i) => i.label === 'Buy out phone before upgrading')).toBe(
        true
      );
    }
    // Include final buyout and resale: four owned-phone years cost four depreciations.
    expect(long.summary.netCost).toBeCloseTo(4 * (1200 - value));
    if (value === 744) expect(long.summary.netCost).toBeLessThan(short.summary.netCost);
    if (value === 480) expect(long.summary.netCost).toBeGreaterThan(short.summary.netCost);
  });

  it('keeps damage attribution reconciled across all annual decisions and taxes/rewards', () => {
    for (let mask = 0; mask < 8; mask++) {
      for (const cost of [250, 2000]) {
        for (const s of allScenarios(
          inputs({
            upgradeMonths: [12, 24, 36].filter((_, i) => mask & (1 << i)),
            screenChoice: 'defer',
            screenRepairCost: cost,
            carrierOffer: 1000,
            taxRate: 8.5,
            appleCardBack: 3,
            klarnaCardBack: 2,
            carrierCardBack: 1
          })
        )) {
          for (const row of s.rows) {
            expect(row.items.reduce((sum, i) => sum + i.amount, 0)).toBeCloseTo(row.outflow, 7);
            expect(row.items.reduce((sum, i) => sum + (i.reward ?? 0), 0)).toBeCloseTo(
              row.rewards,
              7
            );
            expect(Object.values(row.runningByCategory).reduce((a, b) => a + b, 0)).toBeCloseTo(
              row.runningCash,
              7
            );
            expect(Object.values(row.runningNpvByCategory).reduce((a, b) => a + b, 0)).toBeCloseTo(
              row.runningNpv,
              7
            );
          }
        }
      }
    }
  });
});

describe('quoted trade-in credits are separate from private resale', () => {
  it('does not change any payment when private resale changes', () => {
    for (const upgradeMonths of [[12, 24, 36], [24], [36]]) {
      const base = inputs({ upgradeMonths, upgradeTradeIns: [550, 400, 250] });
      const low = allScenarios({ ...base, resaleAtHorizon: 0 });
      const high = allScenarios({ ...base, resaleAtHorizon: 1000 });
      low.forEach((scenario, index) => {
        expect(scenario.rows.map((r) => r.outflow)).toEqual(high[index].rows.map((r) => r.outflow));
      });
    }
  });
  it('assumes no replacement credit without a quote', () => {
    const base = inputs({ upgradeMonths: [12], upgradeTradeIns: undefined, resaleAtHorizon: 1000 });
    expect(outright(base).rows[12].outflow).toBe(1199);
  });
});

describe('private sale is a separate action', () => {
  const base = (overrides: Partial<Inputs> = {}) =>
    inputs({
      listPrice: 1200,
      upgradeMonths: [12, 24, 36],
      upgradeTradeIns: [600, 400, 300, 200],
      privateSaleValues: [700, 500, 350, 250],
      ...overrides
    });
  it('collects sale proceeds separately and finances the whole new phone', () => {
    const cash = outright(base());
    expect(cash.rows[12].items.find((i) => i.label === 'Private sale proceeds')?.amount).toBe(-700);
    expect(cash.rows[12].outflow).toBe(500);
    const card = appleCardFinancing(base());
    expect(card.rows[12].items.find((i) => i.label === 'Private sale proceeds')?.reward).toBe(0);
    expect(card.rows[13].outflow).toBe(100);
    expect(card.summary.remainingBalance).toBe(600);
  });
  it('does not sell a returned lease, and pays off an early lease before selling', () => {
    const short = appleUpgrade(base({ term: 12 }));
    expect(short.rows.some((r) => r.items.some((i) => i.label === 'Private sale proceeds'))).toBe(
      false
    );
    const long = appleUpgrade(base({ term: 24 }));
    expect(
      long.rows[12].items.find((i) => i.label === 'Buy out phone before upgrading')?.amount
    ).toBeCloseTo(780.12);
    expect(long.rows[12].items.find((i) => i.label === 'Private sale proceeds')?.amount).toBe(-700);
    expect(long.rows[13].outflow).toBeCloseTo(34.99);
  });
  it('does not also earn carrier trade-in credits for a privately sold phone', () => {
    const carrier = carrierFinancing(base({ carrierOffer: 1000 }));
    expect(carrier.rows[1].items.some((i) => i.label === 'Carrier trade-in credit')).toBe(true);
    expect(carrier.rows[13].items.some((i) => i.label === 'Carrier trade-in credit')).toBe(false);
    expect(carrier.rows[12].items.find((i) => i.label === 'Private sale proceeds')?.amount).toBe(
      -700
    );
  });
  it('caps deferred damage at sale proceeds and keeps taxes, rewards and NPV reconciled', () => {
    for (const cost of [250, 2000]) {
      for (const scenario of allScenarios(
        base({
          screenChoice: 'defer',
          screenRepairCost: cost,
          taxRate: 8.5,
          appleCardBack: 3,
          klarnaCardBack: 3,
          carrierCardBack: 2
        })
      )) {
        for (const row of scenario.rows) {
          expect(row.items.reduce((sum, i) => sum + i.amount - (i.reward ?? 0), 0)).toBeCloseTo(
            row.net,
            7
          );
          expect(Object.values(row.runningByCategory).reduce((a, b) => a + b, 0)).toBeCloseTo(
            row.runningCash,
            7
          );
          expect(Object.values(row.runningNpvByCategory).reduce((a, b) => a + b, 0)).toBeCloseTo(
            row.runningNpv,
            7
          );
        }
        if (scenario.key !== 'upgrade-12') {
          const disposition = scenario.rows[12].items.filter((i) =>
            ['Private sale proceeds', 'Screen damage at private sale'].includes(i.label)
          );
          expect(disposition.reduce((sum, i) => sum + i.amount, 0)).toBeCloseTo(
            -Math.max(0, 700 - cost)
          );
        }
      }
    }
  });
  it('uses Apple quotes for closing value by default, private estimates only when selected', () => {
    const trade = outright(base({ privateSaleValues: undefined, upgradeMonths: [] }));
    const sold = outright(base({ upgradeMonths: [] }));
    expect(trade.summary.equityAtHorizon).toBe(200);
    expect(sold.summary.equityAtHorizon).toBe(250);
  });
});
