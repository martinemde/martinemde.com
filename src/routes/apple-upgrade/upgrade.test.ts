import { describe, it, expect } from 'vitest';
import {
  buildAppleCardFlows,
  buildCarrierFlows,
  buildLeaseFlows,
  buildOutrightFlows,
  buildScenarios,
  leasePayment,
  nominal,
  npv,
  purchaseOptionFee,
  round2,
  summarize,
  HORIZON,
  type UpgradeInputs
} from './upgrade';

/** All extras zeroed out so tests can isolate the device math. */
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

describe('leasePayment', () => {
  it('matches the advertised iPhone 17 Pro Max examples with a $375 trade-in', () => {
    // 49.99 - 375/12 = 18.74 and 34.99 - 375/24 = 19.37
    expect(leasePayment(49.99, 375, 12)).toBe(18.74);
    expect(leasePayment(34.99, 375, 24)).toBe(19.37);
  });

  it('returns the base payment with no trade-in', () => {
    expect(leasePayment(45.99, 0, 12)).toBe(45.99);
    expect(leasePayment(31.99, 0, 24)).toBe(31.99);
  });

  it('never goes below zero', () => {
    expect(leasePayment(49.99, 5000, 12)).toBe(0);
  });
});

describe('purchaseOptionFee', () => {
  it('is the list price minus payments made', () => {
    expect(purchaseOptionFee(1199, 599.88)).toBe(599.12);
  });

  it('floors at zero', () => {
    expect(purchaseOptionFee(1199, 2000)).toBe(0);
  });
});

describe('12-month lease', () => {
  it('lease-then-buyout totals exactly the list price (per the FAQ)', () => {
    const result = buildLeaseFlows(12, 'buyout', bare());
    expect(nominal(result.flows)).toBe(1199);
    expect(result.ownsDevice).toBe(true);
  });

  it('counts the trade-in toward the phone when you buy out', () => {
    // You pay 12 x 18.74 = 224.88 cash; the trade-in covered the rest of the
    // fixed 12 x 49.99 schedule. Fee = 1199 - 599.88 = 599.12.
    const result = buildLeaseFlows(12, 'buyout', bare({ tradeIn: 375 }));
    const fee = result.flows.find((f) => f.label === 'Purchase option fee');
    expect(fee?.amount).toBe(599.12);
    expect(nominal(result.flows)).toBe(round2(1199 - 375));
  });

  it('always owes ~50% (12-mo) or ~30% (24-mo) of list at term end', () => {
    for (const tradeIn of [0, 300, 625]) {
      const r12 = buildLeaseFlows(12, 'buyout', bare({ tradeIn }));
      expect(r12.flows.find((f) => f.label === 'Purchase option fee')?.amount).toBe(599.12);
      const r24 = buildLeaseFlows(24, 'buyout', bare({ tradeIn }));
      expect(r24.flows.find((f) => f.label === 'Purchase option fee')?.amount).toBe(359.24);
    }
  });

  it('returns trade-in overage as a gift card with $0 payments', () => {
    // $625 trade-in vs a 12 x 49.99 = 599.88 schedule: payments floor at $0
    // and the 25.12 difference comes back as a gift card.
    const result = buildLeaseFlows(12, 'buyout', bare({ tradeIn: 625 }));
    const giftCard = result.flows.find((f) => f.label === 'Trade-in overage (Apple gift card)');
    expect(giftCard?.amount).toBeCloseTo(-25.12);
    expect(result.flows.some((f) => f.label.includes('Lease payment'))).toBe(false);
    expect(nominal(result.flows)).toBe(round2(1199 - 625));
  });

  it('returning the device costs less than the list price (per the FAQ)', () => {
    const result = buildLeaseFlows(12, 'return', bare());
    expect(nominal(result.flows)).toBe(599.88); // 12 x 49.99
    expect(nominal(result.flows)).toBeLessThan(1199);
    expect(result.ownsDevice).toBe(false);
  });

  it('extension payments lose the trade-in credit, then the fee is charged', () => {
    const result = buildLeaseFlows(12, 'extend', bare({ tradeIn: 375 }));
    const month13 = result.flows.find((f) => f.month === 13 && f.kind === 'cost');
    expect(month13?.label).toContain('Extension');
    expect(month13?.amount).toBe(49.99); // not 18.74 — credit expired
    // 6 more payments discharge 6 x 49.99 of the fee: 599.12 - 299.94 = 299.18
    const fee = result.flows.find((f) => f.label === 'Purchase option fee');
    expect(fee?.amount).toBe(299.18);
    expect(nominal(result.flows)).toBe(round2(1199 - 375));
    expect(result.ownsDevice).toBe(true);
  });

  it('upgrade chains into new leases with no trade-in credit after the first', () => {
    const result = buildLeaseFlows(12, 'upgrade', bare({ tradeIn: 375 }));
    const paymentAt = (m: number) =>
      result.flows.find((f) => f.month === m && f.label.includes('Lease payment'))?.amount;
    expect(paymentAt(1)).toBe(18.74); // trade-in applied
    expect(paymentAt(13)).toBe(49.99); // second lease: full price
    expect(paymentAt(25)).toBe(49.99); // third lease: full price
    expect(nominal(result.flows)).toBe(round2(12 * 18.74 + 24 * 49.99));
    expect(result.ownsDevice).toBe(false);
  });

  it('scales the next lease payment to the next phone price', () => {
    const result = buildLeaseFlows(12, 'upgrade', bare({ nextPrice: 2398 }));
    const month13 = result.flows.find((f) => f.month === 13 && f.kind === 'cost');
    expect(month13?.amount).toBe(99.98); // 49.99 x 2
  });

  it('bills annual AppleCare at months 1, 13, and 25 while leasing', () => {
    const result = buildLeaseFlows(12, 'upgrade', bare({ appleCare: 'annual' }));
    const charges = result.flows.filter((f) => f.label.startsWith('AppleCare annual'));
    expect(charges.map((f) => f.month)).toEqual([1, 13, 25]);
  });

  it('stops monthly AppleCare after a buyout', () => {
    const result = buildLeaseFlows(12, 'buyout', bare({ appleCare: 'monthly' }));
    const charges = result.flows.filter((f) => f.label.startsWith('AppleCare ('));
    expect(charges).toHaveLength(12);
  });

  it('adds a damage fee on return only without AppleCare', () => {
    const noCare = buildLeaseFlows(12, 'return', bare({ damageFee: 379 }));
    expect(noCare.flows.some((f) => f.label.startsWith('Damage fee'))).toBe(true);
    const withCare = buildLeaseFlows(12, 'return', bare({ damageFee: 379, appleCare: 'monthly' }));
    expect(withCare.flows.some((f) => f.label.startsWith('Damage fee'))).toBe(false);
  });
});

describe('24-month lease', () => {
  it('upgrade leaves you mid-lease at the horizon with a note', () => {
    const result = buildLeaseFlows(24, 'upgrade', bare());
    expect(result.note).toContain('12 payments left');
    expect(result.ownsDevice).toBe(false);
  });

  it('buyout at month 24 totals list price', () => {
    const result = buildLeaseFlows(24, 'buyout', bare());
    expect(nominal(result.flows)).toBe(1199); // 24 x 34.99 = 839.76, fee = 359.24
  });
});

describe('buy outright', () => {
  it('is all up front, so NPV equals nominal', () => {
    const result = buildOutrightFlows(bare({ residualPct: 0 }));
    expect(nominal(result.flows)).toBe(1199);
    expect(npv(result.flows, 7)).toBe(1199);
  });

  it('subtracts the residual value of the phone you still own', () => {
    const result = buildOutrightFlows(bare({ residualPct: 20 }));
    expect(nominal(result.flows)).toBe(959.2); // 1199 - 239.80
  });

  it('applies card rewards to the purchase', () => {
    const result = buildOutrightFlows(bare({ cashBackPct: 2 }));
    expect(nominal(result.flows)).toBe(round2(1199 * 0.98));
  });
});

describe('Apple Card financing', () => {
  it('spreads the price over 24 installments and pays 3% Daily Cash', () => {
    const result = buildAppleCardFlows(bare());
    expect(nominal(result.flows)).toBe(round2(1199 * 0.97));
    expect(result.ownsDevice).toBe(true);
  });

  it('costs less in NPV than nominal because payments are deferred', () => {
    const result = buildAppleCardFlows(bare());
    expect(npv(result.flows, 7)).toBeLessThan(nominal(result.flows));
  });
});

describe('carrier financing', () => {
  it('nets the trade-in either way, but instant credit wins on NPV', () => {
    const billCredit = buildCarrierFlows(bare({ tradeIn: 375, carrierMode: 'bill-credit' }));
    const instant = buildCarrierFlows(bare({ tradeIn: 375, carrierMode: 'instant' }));
    expect(nominal(billCredit.flows)).toBe(round2(1199 - 375));
    expect(nominal(instant.flows)).toBe(round2(1199 - 375));
    expect(npv(instant.flows, 7)).toBeLessThan(npv(billCredit.flows, 7));
  });
});

describe('npv', () => {
  it('equals nominal at a 0% discount rate', () => {
    const result = buildLeaseFlows(12, 'return', bare());
    expect(npv(result.flows, 0)).toBe(nominal(result.flows));
  });

  it('discounts future payments', () => {
    const result = buildLeaseFlows(12, 'return', bare());
    expect(npv(result.flows, 7)).toBeLessThan(nominal(result.flows));
  });

  it('respects the throughMonth cutoff for the running timeline total', () => {
    const result = buildOutrightFlows(bare());
    expect(npv(result.flows, 7, 0)).toBe(1199);
    expect(npv(result.flows, 7, 36)).toBe(1199);
  });
});

describe('lease sales tax', () => {
  it('charges no sales tax up front — tax lands on each monthly payment', () => {
    const result = buildLeaseFlows(12, 'return', bare({ taxRate: 10 }));
    expect(result.flows.filter((f) => f.month === 0)).toHaveLength(0);
    const month1Tax = result.flows.find((f) => f.month === 1 && f.label === 'Sales tax on payment');
    expect(month1Tax?.amount).toBeCloseTo(5.0); // 49.99 x 10%
    expect(nominal(result.flows)).toBe(round2(12 * 49.99 * 1.1));
  });

  it('shrinks the tax when a trade-in shrinks the payment', () => {
    const result = buildLeaseFlows(12, 'return', bare({ taxRate: 10, tradeIn: 375 }));
    const month1Tax = result.flows.find((f) => f.month === 1 && f.label === 'Sales tax on payment');
    expect(month1Tax?.amount).toBeCloseTo(1.87); // 18.74 x 10%
  });

  it('taxes extension payments too', () => {
    const result = buildLeaseFlows(12, 'extend', bare({ taxRate: 10 }));
    const month13Tax = result.flows.find(
      (f) => f.month === 13 && f.label === 'Sales tax on payment'
    );
    expect(month13Tax?.amount).toBeCloseTo(5.0);
  });

  it('lease-then-buyout totals list price plus tax on everything', () => {
    const result = buildLeaseFlows(12, 'buyout', bare({ taxRate: 10 }));
    // 599.88 in payments x 1.1 + 599.12 fee x 1.1 = 1199 x 1.1
    expect(nominal(result.flows)).toBe(round2(1199 * 1.1));
  });

  it('earns card rewards on the tax-inclusive charge', () => {
    const result = buildLeaseFlows(12, 'return', bare({ taxRate: 10, cashBackPct: 2 }));
    const month1Rewards = result.flows.find((f) => f.month === 1 && f.label === 'Card rewards');
    expect(month1Rewards?.amount).toBeCloseTo(-(49.99 * 1.1) * 0.02);
  });
});

describe('buildScenarios', () => {
  it('returns all five approaches', () => {
    const ids = buildScenarios(bare()).map((s) => s.id);
    expect(ids).toEqual(['lease12', 'lease24', 'outright', 'applecard', 'carrier36']);
  });

  it('never exceeds the 36-month horizon', () => {
    for (const s of buildScenarios(bare())) {
      expect(Math.max(...s.flows.map((f) => f.month))).toBeLessThanOrEqual(HORIZON);
    }
  });
});

describe('summarize', () => {
  it('labels each scenario and totals it through the month cutoff', () => {
    const rows = summarize(buildScenarios(bare()), 7, 12);
    expect(rows.map((r) => r.name)).toEqual([
      'Apple Lease · 12 mo',
      'Apple Lease · 24 mo',
      'Buy outright',
      'Apple Card 0% · 24 mo',
      'Carrier · 36 mo'
    ]);
    // Buying outright is all at month 0, so the cutoff changes nothing
    const outright = rows.find((r) => r.scenario.id === 'outright')!;
    expect(outright.pv).toBe(1199);
    expect(outright.total).toBe(1199);
    // The cutoff excludes later flows: only half the installments land by month 12
    const card = rows.find((r) => r.scenario.id === 'applecard')!;
    expect(card.total).toBeLessThan(nominal(card.scenario.flows));
  });
});
