/**
 * Cost model for Apple Upgrade (the Klarna-provided lease) versus paying cash
 * and versus a carrier installment plan.
 *
 * Everything here is a pure function over `Assumptions` so the page can stay a
 * thin layer of inputs and the math can be tested against the payment examples
 * Apple publishes.
 *
 * Sign convention for `Flow.amount`: positive is money leaving your pocket,
 * negative is money coming back (resale proceeds, Daily Cash, bill credits).
 */

import { LEASE_RATIOS, type Category, type Term } from '$lib/data/apple-upgrade';

export type CareChoice = 'none' | 'monthly' | 'annual' | 'one';

export const CARE_CHOICES: CareChoice[] = ['none', 'monthly', 'annual', 'one'];

/** What you do when the initial lease term ends. */
export type Fork = 'upgrade' | 'buy' | 'extend' | 'walk';

export type ScenarioKey = 'lease' | 'finance' | 'cash' | 'carrier';

export type BilledBy = 'klarna' | 'apple' | 'carrier' | 'other';

export interface Flow {
  /** Months from today. 0 is checkout day. */
  month: number;
  label: string;
  amount: number;
  billedBy: BilledBy;
  /**
   * Set false for Apple-billed amounts that shouldn't generate their own Daily
   * Cash line — installments, where the rebate lands once at purchase instead.
   */
  earnsRebate?: boolean;
}

export interface Assumptions {
  category: Category;
  price: number;
  term: Term;
  /** A payment the user was quoted, before trade-in. Overrides everything below. */
  paymentOverride: number | null;
  /** Apple's published payment for this exact configuration and term, if known. */
  quotedPayment: number | null;
  tradeIn: number;
  fork: Fork;

  care: CareChoice;
  careMonthly: number;
  careAnnual: number;
  careOneMonthly: number;
  careDeductible: number;

  taxRate: number;
  /** Most states tax each lease payment rather than the full price up front. */
  taxLeasePayments: boolean;
  discountRate: number;
  /** Apple Card Daily Cash on Apple-billed amounts. Klarna payments don't earn it. */
  cashBackPct: number;

  activationFee: number;
  caseCost: number;
  /** A lease requires a postpaid line; extra $/mo over the plan you'd otherwise pick. */
  postpaidPremium: number;

  /** Resale value at the end of the initial term, as a fraction of list price. */
  resalePct: number;
  damageFee: number;
  damageLikelihood: number;

  /** Does buying at term's end credit back the trade-in already applied to payments? */
  purchaseCreditHonored: boolean;

  /** Apple's own interest-free installment plan. */
  financeMonths: number;
  financeTaxUpfront: boolean;

  carrierMonths: number;
  carrierDownPayment: number;
  carrierBillCredit: number;
  carrierTaxUpfront: boolean;
}

export interface MonthRow {
  month: number;
  flows: Flow[];
  /** Money out this month, net of anything coming back. */
  net: number;
  /** Cumulative net, undiscounted. */
  cumulative: number;
  /** Cumulative net in today's dollars. */
  cumulativeNpv: number;
}

export interface Scenario {
  key: ScenarioKey;
  name: string;
  flows: Flow[];
  months: MonthRow[];
  total: number;
  npv: number;
  /** True if you own the device at the end of the horizon. */
  ownsDevice: boolean;
  /**
   * Months of the horizon you actually have a device in hand. Returning at the
   * end of the initial term is cheap precisely because you spend the rest of the
   * horizon with nothing, so totals alone can't be compared across forks.
   */
  deviceMonths: number;
  /** NPV per month of device access — the fork-proof way to compare. */
  npvPerDeviceMonth: number;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Estimated monthly lease payment before any trade-in credit: list price × the
 * family's ratio, spread over the term.
 *
 * An estimate on purpose. Apple's real quotes don't follow a single percentage —
 * the 512GB and 1TB iPhone 17 Pro Max lease for $40.82 and $46.67, neither of
 * which is reachable from the same ratio that produces the 256GB's $34.99. Prefer
 * `effectiveBasePayment`, which uses a real quote when one is known.
 */
export function basePayment(price: number, category: Category, term: Term): number {
  const ratio = LEASE_RATIOS[category][term];
  if (!ratio || price <= 0) return 0;
  return Math.max(0, round2((price * ratio) / term));
}

/**
 * The payment to actually bill, in order of trust: what the user was quoted, then
 * what Apple publishes for this exact configuration, then the estimate.
 */
export function effectiveBasePayment(a: Assumptions): number {
  return a.paymentOverride ?? a.quotedPayment ?? basePayment(a.price, a.category, a.term);
}

/** Trade-in credit is divided evenly across the payments of the initial term. */
export function tradeInPerMonth(tradeIn: number, term: Term): number {
  if (tradeIn <= 0 || term <= 0) return 0;
  return tradeIn / term;
}

/** What Klarna actually charges each month during the initial term. */
export function leasePayment(a: Assumptions): number {
  const base = effectiveBasePayment(a);
  return Math.max(0, round2(base - tradeInPerMonth(a.tradeIn, a.term)));
}

/**
 * The buyout price after `monthsPaid` payments.
 *
 * Apple: "the purchase option fee is the list price minus any lease payments
 * you've made minus any remaining discounts or trade-in credit." Read literally,
 * the portion of trade-in credit already applied to your payments gets added
 * back into the buyout — so the trade-in only pays off if you return the device.
 * `purchaseCreditHonored` flips to the generous reading.
 */
export function purchaseOptionFee(a: Assumptions, monthsPaid: number): number {
  const paid = leasePayment(a) * monthsPaid;
  const credit = a.purchaseCreditHonored
    ? a.tradeIn
    : Math.max(0, a.tradeIn - tradeInPerMonth(a.tradeIn, a.term) * monthsPaid);
  return Math.max(0, round2(a.price - paid - credit));
}

/**
 * Resale value `months` from now, decayed geometrically so that the stated
 * percentage lands exactly at the end of the initial term. 50% at 24 months
 * implies 25% at 48.
 */
export function resaleValue(a: Assumptions, months: number): number {
  if (a.price <= 0 || months <= 0) return a.price;
  const pct = Math.min(1, Math.max(0.01, a.resalePct));
  return round2(a.price * Math.pow(pct, months / a.term));
}

/** Expected cost of damage at a return or repair moment. */
export function expectedDamageCost(a: Assumptions): number {
  const exposure = a.care === 'none' ? a.damageFee : a.careDeductible;
  return round2(exposure * (a.damageLikelihood / 100));
}

function tax(a: Assumptions, amount: number): number {
  return round2(amount * (a.taxRate / 100));
}

/** The horizon every scenario is compared over: two full lease terms. */
export function horizonMonths(a: Assumptions): number {
  return a.term * 2;
}

function careFlows(a: Assumptions, startMonth: number, months: number): Flow[] {
  const flows: Flow[] = [];
  if (a.care === 'annual') {
    // A year at a time, renewing — not one payment covering the whole lease. A
    // 24-month term means two charges, and a 36-month term means three.
    for (let m = startMonth; m < startMonth + months; m += 12) {
      flows.push({
        month: m,
        label: 'AppleCare+ (one year)',
        amount: a.careAnnual,
        billedBy: 'apple'
      });
    }
  } else if (a.care === 'monthly' || a.care === 'one') {
    const rate = a.care === 'one' ? a.careOneMonthly : a.careMonthly;
    const label = a.care === 'one' ? 'AppleCare One' : 'AppleCare+ monthly';
    for (let m = startMonth + 1; m <= startMonth + months; m++) {
      flows.push({ month: m, label, amount: rate, billedBy: 'apple' });
    }
  }
  return flows;
}

function acquisitionFlows(a: Assumptions, month: number, isFirst: boolean): Flow[] {
  const flows: Flow[] = [];
  if (a.caseCost > 0) {
    flows.push({
      month,
      label: 'Case and accessories',
      amount: a.caseCost + tax(a, a.caseCost),
      billedBy: 'apple'
    });
  }
  if (isFirst && a.activationFee > 0) {
    flows.push({
      month,
      label: 'Carrier activation',
      amount: a.activationFee,
      billedBy: 'carrier'
    });
  }
  return flows;
}

function leaseTermFlows(
  a: Assumptions,
  startMonth: number,
  opts: { withTradeIn: boolean }
): Flow[] {
  const flows: Flow[] = [];
  const payment = opts.withTradeIn ? leasePayment(a) : effectiveBasePayment(a);
  const perPayment = a.taxLeasePayments ? payment + tax(a, payment) : payment;

  if (!a.taxLeasePayments) {
    flows.push({
      month: startMonth,
      label: 'Sales tax on lease (paid up front)',
      amount: tax(a, a.price),
      billedBy: 'other'
    });
  }

  for (let m = startMonth + 1; m <= startMonth + a.term; m++) {
    flows.push({
      month: m,
      label: 'Lease payment',
      amount: round2(perPayment),
      billedBy: 'klarna'
    });
  }
  return flows;
}

function postpaidPremiumFlows(a: Assumptions, months: number): Flow[] {
  if (a.postpaidPremium <= 0) return [];
  const flows: Flow[] = [];
  for (let m = 1; m <= months; m++) {
    flows.push({
      month: m,
      label: 'Postpaid plan premium',
      amount: a.postpaidPremium,
      billedBy: 'carrier'
    });
  }
  return flows;
}

export function buildLeaseFlows(a: Assumptions): Flow[] {
  const horizon = horizonMonths(a);
  const flows: Flow[] = [
    ...acquisitionFlows(a, 0, true),
    ...leaseTermFlows(a, 0, { withTradeIn: true }),
    ...careFlows(a, 0, a.term),
    ...postpaidPremiumFlows(a, horizon)
  ];

  if (a.tradeIn > 0) {
    flows.push({
      month: 0,
      label: 'Trade-in device handed over',
      amount: 0,
      billedBy: 'apple'
    });
  }

  const damage = expectedDamageCost(a);

  if (a.fork === 'upgrade') {
    // Return the device, sign a new lease at today's price. No trade-in allowed
    // on an upgrade, so the second term costs full freight.
    if (damage > 0) {
      flows.push({
        month: a.term,
        label: `Expected damage cost on return (${a.damageLikelihood}%)`,
        amount: damage,
        billedBy: 'apple'
      });
    }
    flows.push(
      ...acquisitionFlows(a, a.term, false),
      ...leaseTermFlows(a, a.term, { withTradeIn: false }),
      ...careFlows(a, a.term, a.term)
    );
    if (damage > 0) {
      flows.push({
        month: horizon,
        label: `Expected damage cost on second return (${a.damageLikelihood}%)`,
        amount: damage,
        billedBy: 'apple'
      });
    }
  } else if (a.fork === 'buy') {
    const fee = purchaseOptionFee(a, a.term);
    flows.push({
      month: a.term,
      label: 'Purchase option fee',
      amount: round2(fee + (a.taxLeasePayments ? tax(a, fee) : 0)),
      billedBy: 'klarna'
    });
    flows.push(...careFlows(a, a.term, a.term));
    flows.push({
      month: horizon,
      label: 'Resale value if you sell it',
      amount: -resaleValue(a, horizon),
      billedBy: 'other'
    });
  } else if (a.fork === 'extend') {
    // Month-to-month for up to six months at the undiscounted payment, then
    // Klarna charges the buyout automatically.
    const base = effectiveBasePayment(a);
    const perPayment = a.taxLeasePayments ? base + tax(a, base) : base;
    for (let m = a.term + 1; m <= a.term + 6; m++) {
      flows.push({
        month: m,
        label: 'Month-to-month payment (trade-in credit gone)',
        amount: round2(perPayment),
        billedBy: 'klarna'
      });
    }
    const fee = Math.max(0, round2(purchaseOptionFee(a, a.term) - base * 6));
    flows.push({
      month: a.term + 6,
      label: 'Purchase option fee charged automatically',
      amount: round2(fee + (a.taxLeasePayments ? tax(a, fee) : 0)),
      billedBy: 'klarna'
    });
    flows.push(...careFlows(a, a.term, a.term));
    flows.push({
      month: horizon,
      label: 'Resale value if you sell it',
      amount: -resaleValue(a, horizon),
      billedBy: 'other'
    });
  } else {
    // Walk away: return the device and own nothing.
    if (damage > 0) {
      flows.push({
        month: a.term,
        label: `Expected damage cost on return (${a.damageLikelihood}%)`,
        amount: damage,
        billedBy: 'apple'
      });
    }
  }

  return flows;
}

export function buildCashFlows(a: Assumptions): Flow[] {
  const horizon = horizonMonths(a);
  const netPrice = Math.max(0, a.price - a.tradeIn);
  const flows: Flow[] = [
    {
      month: 0,
      label: 'Device purchase',
      amount: round2(netPrice + tax(a, netPrice)),
      billedBy: 'apple'
    },
    ...acquisitionFlows(a, 0, true),
    ...careFlows(a, 0, a.fork === 'upgrade' ? a.term : horizon)
  ];

  const damage = expectedDamageCost(a);
  if (damage > 0) {
    flows.push({
      month: a.term,
      label: `Expected damage cost (${a.damageLikelihood}%)`,
      amount: damage,
      billedBy: 'apple'
    });
  }

  if (a.fork === 'upgrade') {
    // Match the lease's device cadence: sell at term's end and buy the new one.
    flows.push({
      month: a.term,
      label: 'Sell the old device',
      amount: -resaleValue(a, a.term),
      billedBy: 'other'
    });
    flows.push({
      month: a.term,
      label: 'Buy the replacement',
      amount: round2(a.price + tax(a, a.price)),
      billedBy: 'apple'
    });
    flows.push(...acquisitionFlows(a, a.term, false), ...careFlows(a, a.term, a.term));
    if (damage > 0) {
      flows.push({
        month: horizon,
        label: `Expected damage cost (${a.damageLikelihood}%)`,
        amount: damage,
        billedBy: 'apple'
      });
    }
    flows.push({
      month: horizon,
      label: 'Resale value of the newer device',
      amount: -resaleValue(a, a.term),
      billedBy: 'other'
    });
  } else {
    flows.push({
      month: horizon,
      label: 'Resale value if you sell it',
      amount: -resaleValue(a, horizon),
      billedBy: 'other'
    });
  }

  return flows;
}

/**
 * Apple divides the total by the term and floors to the cent, so a $1199 iPhone
 * over 24 months is the advertised $49.95/mo. The shortfall rides on the final
 * payment, which is why the installments sum to list price exactly.
 */
export function financeInstallment(amount: number, months: number): number {
  if (amount <= 0 || months <= 0) return 0;
  return Math.floor((amount / months) * 100) / 100;
}

export function financeFinalPayment(amount: number, months: number): number {
  if (amount <= 0 || months <= 0) return 0;
  return round2(amount - financeInstallment(amount, months) * (months - 1));
}

/**
 * Apple's interest-free installments: no residual, no buyout, no return. You own
 * the device from day one and pay exactly list price, which makes this the
 * benchmark the lease is really competing against.
 */
export function buildFinanceFlows(a: Assumptions): Flow[] {
  const horizon = horizonMonths(a);
  const months = Math.max(1, Math.round(a.financeMonths));
  // A trade-in is a credit against the purchase, so it shrinks what's financed.
  const netPrice = Math.max(0, a.price - a.tradeIn);
  const financed = a.financeTaxUpfront ? netPrice : netPrice + tax(a, netPrice);
  const installment = financeInstallment(financed, months);
  const finalPayment = financeFinalPayment(financed, months);

  const flows: Flow[] = [...acquisitionFlows(a, 0, true), ...careFlows(a, 0, horizon)];

  if (a.financeTaxUpfront) {
    flows.push({
      month: 0,
      label: 'Sales tax (due at purchase)',
      amount: tax(a, netPrice),
      billedBy: 'apple'
    });
  }

  for (let m = 1; m <= Math.min(months, horizon); m++) {
    flows.push({
      month: m,
      label: m === months ? 'Final installment' : 'Installment (0% interest)',
      amount: m === months ? finalPayment : installment,
      billedBy: 'apple',
      // Daily Cash on an Apple Card installment purchase pays out at the sale,
      // not month by month.
      earnsRebate: false
    });
  }

  if (a.cashBackPct > 0) {
    flows.push({
      month: 0,
      label: 'Daily Cash on the purchase',
      amount: -round2(financed * (a.cashBackPct / 100)),
      billedBy: 'apple'
    });
  }

  const damage = expectedDamageCost(a);
  if (damage > 0) {
    flows.push({
      month: a.term,
      label: `Expected damage cost (${a.damageLikelihood}%)`,
      amount: damage,
      billedBy: 'apple'
    });
  }

  flows.push({
    month: horizon,
    label: 'Resale value if you sell it',
    amount: -resaleValue(a, horizon),
    billedBy: 'other'
  });

  return flows;
}

export function buildCarrierFlows(a: Assumptions): Flow[] {
  const horizon = horizonMonths(a);
  const months = Math.max(1, Math.round(a.carrierMonths));
  const down = Math.min(a.price, Math.max(0, a.carrierDownPayment));
  const financed = Math.max(0, a.price - down);
  const installment = round2(financed / months);

  const flows: Flow[] = [
    { month: 0, label: 'Down payment', amount: down, billedBy: 'carrier' },
    ...acquisitionFlows(a, 0, true),
    ...careFlows(a, 0, horizon)
  ];

  if (a.carrierTaxUpfront) {
    flows.push({
      month: 0,
      label: 'Sales tax on full price (due at signing)',
      amount: tax(a, a.price),
      billedBy: 'carrier'
    });
  }

  for (let m = 1; m <= Math.min(months, horizon); m++) {
    const net = installment - a.carrierBillCredit;
    flows.push({
      month: m,
      label: a.carrierBillCredit > 0 ? 'Installment less bill credit' : 'Installment',
      amount: round2(a.carrierTaxUpfront ? net : net + tax(a, installment)),
      billedBy: 'carrier'
    });
  }

  if (a.tradeIn > 0) {
    flows.push({
      month: 0,
      label: 'Trade-in handed to the carrier (credited above)',
      amount: 0,
      billedBy: 'carrier'
    });
  }

  const damage = expectedDamageCost(a);
  if (damage > 0) {
    flows.push({
      month: a.term,
      label: `Expected damage cost (${a.damageLikelihood}%)`,
      amount: damage,
      billedBy: 'apple'
    });
  }

  flows.push({
    month: horizon,
    label: 'Resale value if you sell it',
    amount: -resaleValue(a, horizon),
    billedBy: 'other'
  });

  return flows;
}

/**
 * Apple Card Daily Cash, as negative flows in the month the charge lands.
 * Only Apple-billed amounts qualify; the lease itself is billed by Klarna.
 */
export function withCashBack(flows: Flow[], pct: number): Flow[] {
  if (pct <= 0) return flows;
  const rebates: Flow[] = flows
    .filter((f) => f.billedBy === 'apple' && f.amount > 0 && f.earnsRebate !== false)
    .map((f) => ({
      month: f.month,
      label: `Daily Cash on ${f.label.toLowerCase()}`,
      amount: -round2(f.amount * (pct / 100)),
      billedBy: 'apple' as BilledBy
    }));
  return [...flows, ...rebates];
}

export function presentValue(amount: number, month: number, annualRatePct: number): number {
  if (annualRatePct <= 0) return amount;
  return amount / Math.pow(1 + annualRatePct / 100 / 12, month);
}

export function npvOf(flows: Flow[], annualRatePct: number): number {
  return flows.reduce((sum, f) => sum + presentValue(f.amount, f.month, annualRatePct), 0);
}

/** Roll flows up into one row per month, with running totals. */
export function toMonthRows(flows: Flow[], horizon: number, discountRate: number): MonthRow[] {
  const rows: MonthRow[] = [];
  let cumulative = 0;
  let cumulativeNpv = 0;

  for (let month = 0; month <= horizon; month++) {
    const monthFlows = flows.filter((f) => f.month === month);
    const net = round2(monthFlows.reduce((s, f) => s + f.amount, 0));
    cumulative = round2(cumulative + net);
    cumulativeNpv = round2(
      cumulativeNpv +
        monthFlows.reduce((s, f) => s + presentValue(f.amount, f.month, discountRate), 0)
    );
    rows.push({ month, flows: monthFlows, net, cumulative, cumulativeNpv });
  }

  return rows;
}

const SCENARIO_NAMES: Record<ScenarioKey, string> = {
  lease: 'Apple Upgrade lease',
  finance: 'Apple 0% financing',
  cash: 'Buy outright',
  carrier: 'Carrier installments'
};

function buildScenario(key: ScenarioKey, a: Assumptions, raw: Flow[]): Scenario {
  const flows = withCashBack(raw, a.cashBackPct);
  const horizon = horizonMonths(a);
  const months = toMonthRows(flows, horizon, a.discountRate);
  const ownsDevice = key !== 'lease' || a.fork === 'buy' || a.fork === 'extend';
  const deviceMonths = key === 'lease' && a.fork === 'walk' ? a.term : horizon;
  const npv = round2(npvOf(flows, a.discountRate));

  return {
    key,
    name: SCENARIO_NAMES[key],
    flows,
    months,
    total: round2(flows.reduce((s, f) => s + f.amount, 0)),
    npv,
    ownsDevice,
    deviceMonths,
    npvPerDeviceMonth: deviceMonths > 0 ? round2(npv / deviceMonths) : 0
  };
}

export interface Comparison {
  lease: Scenario;
  finance: Scenario;
  cash: Scenario;
  carrier: Scenario;
  /** All four, in presentation order. */
  scenarios: Scenario[];
  horizon: number;
  /** Lowest total in today's dollars, whatever you end up holding. */
  bestKey: ScenarioKey;
  /** Lowest cost per month of device access — the honest ranking. */
  bestValueKey: ScenarioKey;
}

export function compare(a: Assumptions): Comparison {
  const lease = buildScenario('lease', a, buildLeaseFlows(a));
  const finance = buildScenario('finance', a, buildFinanceFlows(a));
  const cash = buildScenario('cash', a, buildCashFlows(a));
  const carrier = buildScenario('carrier', a, buildCarrierFlows(a));

  const scenarios = [lease, finance, cash, carrier];
  const best = scenarios.reduce((lowest, s) => (s.npv < lowest.npv ? s : lowest));
  const bestValue = scenarios.reduce((lowest, s) =>
    s.npvPerDeviceMonth < lowest.npvPerDeviceMonth ? s : lowest
  );

  return {
    lease,
    finance,
    cash,
    carrier,
    scenarios,
    horizon: horizonMonths(a),
    bestKey: best.key,
    bestValueKey: bestValue.key
  };
}

/**
 * Payments still owed on the initial term as of `month`. Apple only says the
 * early termination fee "may be substantial"; the remaining payments are the
 * natural ceiling on it, so this is the number to reason against.
 */
export function remainingLeaseObligation(a: Assumptions, month: number): number {
  const monthsLeft = Math.max(0, a.term - Math.max(0, month));
  return round2(leasePayment(a) * monthsLeft);
}

export function formatUsd(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  });
}

export function formatUsd0(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });
}
