import { describe, it, expect } from 'vitest';
import {
  basePayment,
  buildCarrierFlows,
  buildCashFlows,
  buildLeaseFlows,
  compare,
  expectedDamageCost,
  horizonMonths,
  leasePayment,
  npvOf,
  purchaseOptionFee,
  remainingLeaseObligation,
  resaleValue,
  roundTo99,
  toMonthRows,
  withCashBack,
  type Assumptions,
  type Flow
} from './apple-upgrade';
import type { Category, Term } from '$lib/data/apple-upgrade';

function assume(overrides: Partial<Assumptions> = {}): Assumptions {
  return {
    category: 'iphone',
    price: 1199,
    term: 24,
    paymentOverride: null,
    tradeIn: 0,
    fork: 'upgrade',

    care: 'none',
    careMonthly: 13.49,
    carePrepaid24: 269,
    careOneMonthly: 19.99,
    careDeductible: 99,

    taxRate: 0,
    taxLeasePayments: true,
    discountRate: 0,
    cashBackPct: 0,

    activationFee: 0,
    caseCost: 0,
    postpaidPremium: 0,

    resalePct: 0.5,
    damageFee: 0,
    damageLikelihood: 0,

    purchaseCreditHonored: false,

    carrierMonths: 36,
    carrierDownPayment: 0,
    carrierBillCredit: 0,
    carrierTaxUpfront: true,
    ...overrides
  };
}

describe('roundTo99', () => {
  it('snaps to the nearest $X.99', () => {
    expect(roundTo99(45.79)).toBeCloseTo(45.99, 2);
    expect(roundTo99(32.05)).toBeCloseTo(31.99, 2);
    expect(roundTo99(54.14)).toBeCloseTo(53.99, 2);
  });
});

describe('basePayment reproduces Apple footnote ∆', () => {
  // Every example Apple publishes, as [category, price, term, published payment].
  const examples: Array<[Category, number, Term, number]> = [
    ['iphone', 1099, 24, 31.99],
    ['iphone', 1099, 12, 45.99],
    ['watch', 399, 24, 11.99],
    ['watch', 399, 12, 21.99],
    ['ipad', 1099, 36, 24.99],
    ['ipad', 1099, 24, 31.99],
    ['mac', 1999, 36, 38.99],
    ['mac', 1999, 24, 53.99]
  ];

  for (const [category, price, term, expected] of examples) {
    it(`${category} $${price} over ${term}mo is $${expected}/mo`, () => {
      expect(basePayment(price, category, term)).toBeCloseTo(expected, 2);
    });
  }

  it('reproduces the iPhone 17 Pro Max examples the program advertises', () => {
    expect(basePayment(1199, 'iphone', 12)).toBeCloseTo(49.99, 2);
    expect(basePayment(1199, 'iphone', 24)).toBeCloseTo(34.99, 2);
  });

  it('returns zero for a term the family does not offer', () => {
    expect(basePayment(1199, 'iphone', 36)).toBe(0);
    expect(basePayment(1999, 'mac', 12)).toBe(0);
  });
});

describe('trade-in credit', () => {
  it('spreads a $375 trade-in across the term', () => {
    // The worked example: $1199 iPhone 17 Pro Max with $375 traded in.
    expect(leasePayment(assume({ term: 12 }))).toBeCloseTo(49.99, 2);
    expect(leasePayment(assume({ term: 12, tradeIn: 375 }))).toBeCloseTo(18.74, 2);
    expect(leasePayment(assume({ term: 24, tradeIn: 375 }))).toBeCloseTo(19.37, 2);
  });

  it('never drives the payment below zero', () => {
    expect(leasePayment(assume({ tradeIn: 5000 }))).toBe(0);
  });

  it('honors an explicit payment quote over the derived one', () => {
    expect(leasePayment(assume({ paymentOverride: 29.99, tradeIn: 240 }))).toBeCloseTo(19.99, 2);
  });
});

describe('purchaseOptionFee', () => {
  it('brings total spend to exactly list price with no trade-in', () => {
    const a = assume();
    const paid = leasePayment(a) * a.term;
    const fee = purchaseOptionFee(a, a.term);
    expect(paid + fee).toBeCloseTo(a.price, 2);
  });

  it('adds the applied trade-in credit back into the buyout', () => {
    // Read literally, the credit only pays off if you hand the device back.
    const a = assume({ tradeIn: 375 });
    const paid = leasePayment(a) * a.term;
    expect(purchaseOptionFee(a, a.term)).toBeCloseTo(a.price - paid, 2);
    expect(paid + purchaseOptionFee(a, a.term)).toBeCloseTo(a.price, 2);
  });

  it('keeps the credit when the generous reading is selected', () => {
    const a = assume({ tradeIn: 375, purchaseCreditHonored: true });
    const paid = leasePayment(a) * a.term;
    expect(paid + purchaseOptionFee(a, a.term)).toBeCloseTo(a.price - a.tradeIn, 2);
  });

  it('declines month over month and never goes negative', () => {
    const a = assume();
    const fees = Array.from({ length: a.term + 1 }, (_, m) => purchaseOptionFee(a, m));
    expect(fees[0]).toBeCloseTo(a.price, 2);
    for (let m = 1; m < fees.length; m++) {
      expect(fees[m]).toBeLessThan(fees[m - 1]);
      expect(fees[m]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('resaleValue', () => {
  it('hits the stated percentage at the end of the term', () => {
    const a = assume({ resalePct: 0.5 });
    expect(resaleValue(a, 24)).toBeCloseTo(599.5, 2);
  });

  it('decays geometrically past the term', () => {
    const a = assume({ resalePct: 0.5 });
    expect(resaleValue(a, 48)).toBeCloseTo(299.75, 2);
  });
});

describe('expectedDamageCost', () => {
  it('is the full fee times likelihood without AppleCare', () => {
    expect(expectedDamageCost(assume({ damageFee: 400, damageLikelihood: 25 }))).toBeCloseTo(
      100,
      2
    );
  });

  it('falls back to the deductible when AppleCare is carried', () => {
    const a = assume({ care: 'monthly', damageFee: 400, damageLikelihood: 25, careDeductible: 99 });
    expect(expectedDamageCost(a)).toBeCloseTo(24.75, 2);
  });
});

describe('lease flows', () => {
  it('charges the term in monthly payments and returns the device on walk-away', () => {
    const a = assume({ fork: 'walk' });
    const flows = buildLeaseFlows(a);
    const payments = flows.filter((f) => f.label === 'Lease payment');
    expect(payments).toHaveLength(24);
    expect(payments.every((f) => f.amount === 34.99)).toBe(true);
    // 70% of the phone, and nothing to show for it.
    expect(payments.reduce((s, f) => s + f.amount, 0)).toBeCloseTo(839.76, 2);
    expect(flows.some((f) => f.amount < 0)).toBe(false);
  });

  it('signs a second full-price lease on the upgrade path', () => {
    const a = assume({ fork: 'upgrade', tradeIn: 375 });
    const flows = buildLeaseFlows(a);
    const payments = flows.filter((f) => f.label === 'Lease payment');
    expect(payments).toHaveLength(48);
    // First term is discounted by the trade-in, second term is not.
    expect(payments.filter((f) => f.month <= 24).every((f) => f.amount === 19.37)).toBe(true);
    expect(payments.filter((f) => f.month > 24).every((f) => f.amount === 34.99)).toBe(true);
  });

  it('totals exactly list price when you buy at the end of the term', () => {
    const a = assume({ fork: 'buy', resalePct: 0.5 });
    const flows = buildLeaseFlows(a).filter((f) => f.amount > 0);
    expect(flows.reduce((s, f) => s + f.amount, 0)).toBeCloseTo(a.price, 2);
  });

  it('runs six month-to-month payments then charges the buyout', () => {
    const a = assume({ fork: 'extend', tradeIn: 375 });
    const flows = buildLeaseFlows(a);
    const extra = flows.filter((f) => f.label.startsWith('Month-to-month'));
    expect(extra).toHaveLength(6);
    // The trade-in credit is gone during the extension, so payments jump back up.
    expect(extra.every((f) => f.amount === 34.99)).toBe(true);
    expect(flows.some((f) => f.label.startsWith('Purchase option fee charged'))).toBe(true);
  });

  it('applies sales tax to each payment when the state taxes leases that way', () => {
    const a = assume({ fork: 'walk', taxRate: 10 });
    const payments = buildLeaseFlows(a).filter((f) => f.label === 'Lease payment');
    expect(payments[0].amount).toBeCloseTo(38.49, 2);
  });

  it('charges tax up front when lease payments are not taxed monthly', () => {
    const a = assume({ fork: 'walk', taxRate: 10, taxLeasePayments: false });
    const flows = buildLeaseFlows(a);
    const upfront = flows.find((f) => f.label.startsWith('Sales tax'));
    expect(upfront?.month).toBe(0);
    expect(upfront?.amount).toBeCloseTo(119.9, 2);
    expect(flows.find((f) => f.label === 'Lease payment')?.amount).toBeCloseTo(34.99, 2);
  });
});

describe('cash flows', () => {
  it('nets the trade-in off the purchase price', () => {
    const a = assume({ fork: 'walk', tradeIn: 375 });
    const purchase = buildCashFlows(a).find((f) => f.label === 'Device purchase');
    expect(purchase?.amount).toBeCloseTo(824, 2);
  });

  it('mirrors the lease device cadence when the fork is upgrade', () => {
    const a = assume({ fork: 'upgrade' });
    const flows = buildCashFlows(a);
    expect(flows.filter((f) => f.label.startsWith('Buy the replacement'))).toHaveLength(1);
    expect(flows.some((f) => f.label === 'Sell the old device')).toBe(true);
  });

  it('credits resale value at the horizon when you keep the device', () => {
    const a = assume({ fork: 'walk' });
    const resale = buildCashFlows(a).find((f) => f.label.startsWith('Resale value'));
    expect(resale?.month).toBe(48);
    expect(resale?.amount).toBeLessThan(0);
  });
});

describe('carrier flows', () => {
  it('spreads the price over the chosen installment count', () => {
    const a = assume({ carrierMonths: 36 });
    const installments = buildCarrierFlows(a).filter((f) => f.label === 'Installment');
    // The horizon is 48 months, so all 36 installments land inside it.
    expect(installments).toHaveLength(36);
    expect(installments[0].amount).toBeCloseTo(33.31, 2);
  });

  it('subtracts monthly bill credits', () => {
    const a = assume({ carrierMonths: 36, carrierBillCredit: 20 });
    const installments = buildCarrierFlows(a).filter((f) => f.label.startsWith('Installment less'));
    expect(installments[0].amount).toBeCloseTo(13.31, 2);
  });

  it('stops installments at the horizon when the plan runs longer', () => {
    const a = assume({ term: 12, carrierMonths: 36 });
    const installments = buildCarrierFlows(a).filter((f) => f.label === 'Installment');
    expect(installments).toHaveLength(horizonMonths(a));
  });
});

describe('withCashBack', () => {
  it('rebates Apple-billed charges only', () => {
    const flows: Flow[] = [
      { month: 0, label: 'Device purchase', amount: 1000, billedBy: 'apple' },
      { month: 1, label: 'Lease payment', amount: 35, billedBy: 'klarna' }
    ];
    const rebates = withCashBack(flows, 3).filter((f) => f.amount < 0);
    expect(rebates).toHaveLength(1);
    expect(rebates[0].amount).toBeCloseTo(-30, 2);
  });
});

describe('npv', () => {
  it('discounts later money less than money spent today', () => {
    const flows: Flow[] = [{ month: 12, label: 'x', amount: 1200, billedBy: 'other' }];
    expect(npvOf(flows, 7)).toBeLessThan(1200);
    expect(npvOf(flows, 0)).toBeCloseTo(1200, 2);
  });

  it('makes spreading payments cheaper than paying up front', () => {
    const upfront: Flow[] = [{ month: 0, label: 'x', amount: 1200, billedBy: 'other' }];
    const spread: Flow[] = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: 'x',
      amount: 100,
      billedBy: 'other' as const
    }));
    expect(npvOf(spread, 7)).toBeLessThan(npvOf(upfront, 7));
  });
});

describe('toMonthRows', () => {
  it('produces one row per month through the horizon with running totals', () => {
    const flows: Flow[] = [
      { month: 0, label: 'a', amount: 100, billedBy: 'apple' },
      { month: 2, label: 'b', amount: 50, billedBy: 'apple' }
    ];
    const rows = toMonthRows(flows, 3, 0);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.cumulative)).toEqual([100, 100, 150, 150]);
  });
});

describe('remainingLeaseObligation', () => {
  it('counts the payments left in the initial term', () => {
    const a = assume();
    expect(remainingLeaseObligation(a, 0)).toBeCloseTo(839.76, 2);
    expect(remainingLeaseObligation(a, 12)).toBeCloseTo(419.88, 2);
    expect(remainingLeaseObligation(a, 24)).toBe(0);
    expect(remainingLeaseObligation(a, 30)).toBe(0);
  });
});

describe('compare', () => {
  it('costs less per month of phone to buy than to lease and return', () => {
    const a = assume({ fork: 'walk', resalePct: 0.5, discountRate: 7 });
    const { lease, cash, carrier, bestKey, bestValueKey } = compare(a);
    expect(lease.ownsDevice).toBe(false);
    // Returning at month 24 leaves you phoneless for the back half of the
    // horizon, so its raw total is the lowest of the three...
    expect(lease.deviceMonths).toBe(24);
    expect(cash.deviceMonths).toBe(48);
    expect(bestKey).toBe('lease');
    // ...but per month of actually having a phone, owning wins by a wide margin.
    expect(cash.npvPerDeviceMonth).toBeLessThan(lease.npvPerDeviceMonth);
    // Carrier installments edge out cash: same price, paid later, at 0%.
    expect(bestValueKey).toBe('carrier');
    expect(carrier.npvPerDeviceMonth).toBeLessThan(cash.npvPerDeviceMonth);
    expect(carrier.npvPerDeviceMonth).toBeLessThan(lease.npvPerDeviceMonth * 0.75);
  });

  it('treats a lease you buy out as roughly interest-free financing', () => {
    // Same money either way, but the lease pays later, so its NPV is lower.
    const a = assume({ fork: 'buy', discountRate: 7, resalePct: 0.5 });
    const { lease, cash } = compare(a);
    expect(lease.ownsDevice).toBe(true);
    expect(lease.total).toBeCloseTo(cash.total, 0);
    expect(lease.npv).toBeLessThan(cash.npv);
  });

  it('compares every scenario over the same two-term horizon', () => {
    const a = assume({ term: 12 });
    const { lease, cash, carrier, horizon } = compare(a);
    expect(horizon).toBe(24);
    for (const s of [lease, cash, carrier]) {
      expect(s.months.at(-1)?.month).toBe(24);
    }
  });
});
