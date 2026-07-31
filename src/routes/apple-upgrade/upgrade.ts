/**
 * Calculation engine for the Apple Upgrade (Klarna lease) calculator.
 *
 * Models every way to get an iPhone over a 36-month horizon:
 *   - outright: pay everything on day one, own the phone
 *   - applecard: Apple Card 24-month 0% installments + 3% Daily Cash
 *   - lease12 / lease24: Apple Upgrade lease + an end-of-lease decision
 *   - carrier36: 36-month carrier financing with optional bill credits
 *
 * Facts from Apple's Apple Upgrade FAQ that the engine encodes:
 *   - Trade-in credit is spread across the INITIAL lease term only.
 *   - You cannot trade in when you upgrade to a new lease.
 *   - After the term you get a 6-month decision window. Payments continue,
 *     and they go UP because the trade-in credit no longer applies.
 *   - Taking no action for 6 months = you get charged the purchase option fee.
 *   - Purchase option fee = list price - SCHEDULED payments made. A trade-in
 *     pays down that fixed schedule, so the fee is ~50% of list at 12 months
 *     (~30% at 24) no matter the trade-in; overage returns as a gift card.
 *   - AppleCare is billed separately and avoids return damage fees.
 *
 * Tax treatment: purchases and financing charge sales tax on the full price
 * up front; leases are taxed on each monthly payment in most states, so the
 * lease adds tax to every payment (and to the purchase option fee) instead.
 */

export const HORIZON = 36;
export const EXTENSION_MONTHS = 6;

export type ScenarioId = 'outright' | 'applecard' | 'lease12' | 'lease24' | 'carrier36';
export type EndDecision = 'upgrade' | 'buyout' | 'extend' | 'return';
export type AppleCareChoice = 'none' | 'one' | 'monthly' | 'annual';
export type CarrierCreditMode = 'bill-credit' | 'instant';

export interface UpgradeInputs {
  /** List price of the phone, before tax */
  price: number;
  /** Advertised monthly lease payment for a 12-month term (before trade-in) */
  payment12: number;
  /** Advertised monthly lease payment for a 24-month term (before trade-in) */
  payment24: number;
  /** Trade-in credit for the device you hand in at enrollment (0 = none) */
  tradeIn: number;
  appleCare: AppleCareChoice;
  /** Editable AppleCare rates */
  acOneMonthly: number;
  acPlusMonthly: number;
  acPlusAnnual: number;
  /** Sales tax rate, percent. Up front on purchases; monthly on lease payments. */
  taxRate: number;
  /** Carrier activation fee per new device */
  activationFee: number;
  /** Case / accessories bought with the phone */
  caseCost: number;
  /** Your credit card's cash back rate, percent (applied to card-paid flows) */
  cashBackPct: number;
  /** Discount rate for NPV, percent per year */
  discountRatePct: number;
  /** Expected damage fee when returning without AppleCare (0 = pristine) */
  damageFee: number;
  /** Assumed list price of the phone you'd upgrade into next */
  nextPrice: number;
  carrierMode: CarrierCreditMode;
  /** Carrier promo credit per month, on top of any trade-in bill credits */
  carrierPromoMonthly: number;
  /** Resale/trade value of an owned phone at month 36, percent of list */
  residualPct: number;
  decision12: EndDecision;
  decision24: EndDecision;
}

export interface Flow {
  /** 0 = checkout day, 1..36 = monthly */
  month: number;
  label: string;
  /** Dollars out; negative = money back to you */
  amount: number;
  kind: 'cost' | 'credit';
}

export interface ScenarioResult {
  id: ScenarioId;
  flows: Flow[];
  /** Whether you own a phone at the end of the horizon */
  ownsDevice: boolean;
  /** Human note for the summary, e.g. "12 payments remain on your lease" */
  note?: string;
}

export interface DevicePreset {
  name: string;
  price: number;
  payment12: number;
  payment24: number;
}

/** Advertised payments from the Apple Upgrade footnotes + launch examples. */
export const DEVICE_PRESETS: DevicePreset[] = [
  { name: 'iPhone 17 Pro', price: 1099, payment12: 45.99, payment24: 31.99 },
  { name: 'iPhone 17 Pro Max', price: 1199, payment12: 49.99, payment24: 34.99 }
];

export const DEFAULT_INPUTS: UpgradeInputs = {
  price: 1199,
  payment12: 49.99,
  payment24: 34.99,
  tradeIn: 0,
  appleCare: 'none',
  acOneMonthly: 19.99,
  acPlusMonthly: 13.99,
  acPlusAnnual: 139.99,
  taxRate: 8.5,
  activationFee: 35,
  caseCost: 59,
  cashBackPct: 2,
  discountRatePct: 7,
  damageFee: 0,
  nextPrice: 1199,
  carrierMode: 'bill-credit',
  carrierPromoMonthly: 0,
  residualPct: 20,
  decision12: 'upgrade',
  decision24: 'upgrade'
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** Monthly lease payment after the trade-in credit is spread across the term. */
export function leasePayment(base: number, tradeIn: number, term: number): number {
  return round2(Math.max(0, base - tradeIn / term));
}

/**
 * The fee to buy the leased device outright: list price minus the scheduled
 * lease payments made so far. Because a trade-in pays down the same fixed
 * schedule, the fee is always list − base × months — ~50% of list after a
 * 12-month term, ~30% after 24 — no matter how big the trade-in was.
 */
export function purchaseOptionFee(price: number, paymentsMade: number): number {
  return round2(Math.max(0, price - paymentsMade));
}

function monthlyRate(discountRatePct: number): number {
  return discountRatePct / 100 / 12;
}

export function npv(flows: Flow[], discountRatePct: number, throughMonth = HORIZON): number {
  const r = monthlyRate(discountRatePct);
  let total = 0;
  for (const f of flows) {
    if (f.month > throughMonth) continue;
    total += r === 0 ? f.amount : f.amount / Math.pow(1 + r, f.month);
  }
  return round2(total);
}

export function nominal(flows: Flow[], throughMonth = HORIZON): number {
  return round2(flows.filter((f) => f.month <= throughMonth).reduce((s, f) => s + f.amount, 0));
}

function add(flows: Flow[], month: number, label: string, amount: number, kind?: Flow['kind']) {
  // Amounts stay unrounded inside flows (installments like 1199/24 aren't
  // cents-exact); only advertised lease payments and final totals are rounded.
  if (Math.abs(amount) < 0.005) return;
  flows.push({
    month,
    label,
    amount,
    kind: kind ?? (amount < 0 ? 'credit' : 'cost')
  });
}

/** AppleCare monthly charge while coverage is active, per the chosen plan. */
function appleCareMonthly(inputs: UpgradeInputs): number {
  switch (inputs.appleCare) {
    case 'one':
      return inputs.acOneMonthly;
    case 'monthly':
      return inputs.acPlusMonthly;
    default:
      return 0;
  }
}

function addUpfront(
  flows: Flow[],
  month: number,
  price: number,
  inputs: UpgradeInputs,
  opts: { activation?: boolean; case?: boolean } = {}
) {
  add(
    flows,
    month,
    `Sales tax (${inputs.taxRate}% of $${price.toFixed(0)})`,
    price * (inputs.taxRate / 100)
  );
  if (opts.activation !== false) add(flows, month, 'Carrier activation fee', inputs.activationFee);
  if (opts.case) add(flows, month, 'Case & accessories', inputs.caseCost);
}

/** Card rewards earned on a card-paid amount (Klarna takes most US credit/debit cards). */
function addRewards(flows: Flow[], month: number, paidByCard: number, inputs: UpgradeInputs) {
  add(flows, month, 'Card rewards', -paidByCard * (inputs.cashBackPct / 100));
}

interface LeaseContext {
  flows: Flow[];
  paid: number; // total lease payments actually made on the current lease
}

function addLeaseCheckout(
  ctx: LeaseContext,
  month: number,
  inputs: UpgradeInputs,
  firstLease: boolean
) {
  // No sales tax here: most states tax leases on each monthly payment instead
  // of the full device price up front (see addLeaseMonth).
  add(
    ctx.flows,
    month,
    firstLease ? 'Carrier activation fee' : 'New lease: carrier activation',
    inputs.activationFee
  );
  if (firstLease) add(ctx.flows, month, 'Case & accessories', inputs.caseCost);
}

function addLeaseMonth(
  ctx: LeaseContext,
  month: number,
  payment: number,
  scheduled: number,
  inputs: UpgradeInputs,
  label: string,
  coverageActive: boolean
) {
  add(ctx.flows, month, label, payment);
  // The purchase option fee credits the SCHEDULED payment: a trade-in pays
  // down that fixed schedule, so it shrinks your cash, never the fee.
  ctx.paid = round2(ctx.paid + scheduled);
  // Lease payments are taxed monthly in most states. The trade-in credit
  // shrinks the payment, so it shrinks the tax too.
  const tax = payment * (inputs.taxRate / 100);
  add(ctx.flows, month, 'Sales tax on payment', tax);
  addRewards(ctx.flows, month, payment + tax, inputs);
  const ac = appleCareMonthly(inputs);
  if (coverageActive && ac > 0) {
    add(ctx.flows, month, 'AppleCare (billed separately by Apple)', ac);
  }
  // Annual AppleCare is prepaid at months 1, 13, 25 while coverage is active
  if (coverageActive && inputs.appleCare === 'annual' && (month - 1) % 12 === 0) {
    add(ctx.flows, month, 'AppleCare annual (billed by Apple)', inputs.acPlusAnnual);
  }
}

function addDamageFee(ctx: LeaseContext, month: number, inputs: UpgradeInputs) {
  if (inputs.appleCare === 'none' && inputs.damageFee > 0) {
    add(ctx.flows, month, 'Damage fee (no AppleCare coverage)', inputs.damageFee);
  }
}

function addBuyout(ctx: LeaseContext, month: number, price: number, inputs: UpgradeInputs) {
  const fee = purchaseOptionFee(price, ctx.paid);
  add(ctx.flows, month, 'Purchase option fee', fee);
  add(ctx.flows, month, 'Tax on purchase option fee', fee * (inputs.taxRate / 100));
}

function addResidual(ctx: LeaseContext, price: number, inputs: UpgradeInputs) {
  add(ctx.flows, HORIZON, 'Phone resale value (you own it)', -price * (inputs.residualPct / 100));
}

/**
 * Build the cash flows for one lease, following `decision` at the end of
 * every term (upgrade chains into another lease inside the 36-month window).
 */
export function buildLeaseFlows(
  term: 12 | 24,
  decision: EndDecision,
  inputs: UpgradeInputs
): ScenarioResult {
  const flows: Flow[] = [];
  const ctx: LeaseContext = { flows, paid: 0 };
  let price = inputs.price;
  let base = term === 12 ? inputs.payment12 : inputs.payment24;
  let firstLease = true;
  let ownsDevice = false;
  let note: string | undefined;

  // Checkout day: tax/activation/case land at month 0, first payment ~month 1
  addLeaseCheckout(ctx, 0, inputs, true);

  // A trade-in worth more than the whole term of payments comes back as a
  // gift card for the difference — payments can't go below $0.
  const scheduledTotal = base * term;
  if (inputs.tradeIn > scheduledTotal) {
    add(ctx.flows, 0, 'Trade-in overage (Apple gift card)', -(inputs.tradeIn - scheduledTotal));
  }

  let leaseStart = 1;
  // Loop over consecutive leases inside the horizon
  for (;;) {
    const leaseEnd = leaseStart + term - 1;
    for (let m = leaseStart; m <= Math.min(leaseEnd, HORIZON); m++) {
      const credit = firstLease ? inputs.tradeIn : 0; // trade-in: initial term only
      const payment = leasePayment(base, credit, term);
      const label =
        credit > 0 ? `Lease payment ($${base.toFixed(2)} − trade-in credit)` : 'Lease payment';
      addLeaseMonth(ctx, m, payment, base, inputs, label, true);
    }

    if (leaseEnd >= HORIZON) {
      if (leaseEnd > HORIZON) {
        note = `At month ${HORIZON} you're mid-lease with ${leaseEnd - HORIZON} payments left — the phone still isn't yours.`;
      }
      break; // decision point falls outside the window
    }

    // End-of-term decision at month leaseEnd (after the last payment)
    switch (decision) {
      case 'upgrade': {
        addDamageFee(ctx, leaseEnd, inputs);
        // Walk out with the next phone; new lease starts the following month
        price = inputs.nextPrice;
        base = round2(base * (inputs.nextPrice / inputs.price));
        ctx.paid = 0;
        addLeaseCheckout(ctx, leaseEnd, inputs, false);
        leaseStart = leaseEnd + 1;
        firstLease = false;
        break;
      }
      case 'buyout': {
        addBuyout(ctx, leaseEnd, price, inputs);
        addResidual(ctx, price, inputs);
        ownsDevice = true;
        return { id: term === 12 ? 'lease12' : 'lease24', flows, ownsDevice, note };
      }
      case 'extend': {
        // 6-month decision window: full base payment, trade-in credit is gone.
        // Each extension payment still discharges base value against the fee.
        for (let m = leaseEnd + 1; m <= leaseEnd + EXTENSION_MONTHS; m++) {
          addLeaseMonth(ctx, m, base, base, inputs, 'Extension payment (no trade-in credit)', true);
        }
        addBuyout(ctx, leaseEnd + EXTENSION_MONTHS, price, inputs);
        addResidual(ctx, price, inputs);
        ownsDevice = true;
        note = 'Ignoring the decision for 6 months means Klarna charges the purchase option fee.';
        return { id: term === 12 ? 'lease12' : 'lease24', flows, ownsDevice, note };
      }
      case 'return': {
        addDamageFee(ctx, leaseEnd, inputs);
        return { id: term === 12 ? 'lease12' : 'lease24', flows, ownsDevice: false };
      }
    }
  }

  return { id: term === 12 ? 'lease12' : 'lease24', flows, ownsDevice, note };
}

export function buildOutrightFlows(inputs: UpgradeInputs): ScenarioResult {
  const flows: Flow[] = [];
  add(flows, 0, 'iPhone, paid in full', inputs.price);
  addUpfront(flows, 0, inputs.price, inputs, { case: true });
  addRewards(flows, 0, inputs.price * (1 + inputs.taxRate / 100), inputs);
  const ctx: LeaseContext = { flows, paid: 0 };
  addResidual(ctx, inputs.price, inputs);
  return { id: 'outright', flows, ownsDevice: true };
}

export function buildAppleCardFlows(inputs: UpgradeInputs): ScenarioResult {
  const flows: Flow[] = [];
  addUpfront(flows, 0, inputs.price, inputs, { case: true });
  // Apple Card Monthly Installments pay 3% Daily Cash on the whole purchase up front
  add(flows, 0, 'Apple Card 3% Daily Cash', -inputs.price * (1 + inputs.taxRate / 100) * 0.03);
  for (let m = 1; m <= 24; m++) {
    add(flows, m, 'Apple Card installment (0% APR)', inputs.price / 24);
  }
  const ctx: LeaseContext = { flows, paid: 0 };
  addResidual(ctx, inputs.price, inputs);
  return { id: 'applecard', flows, ownsDevice: true };
}

export function buildCarrierFlows(inputs: UpgradeInputs): ScenarioResult {
  const flows: Flow[] = [];
  addUpfront(flows, 0, inputs.price, inputs, { case: true });
  if (inputs.carrierMode === 'instant' && inputs.tradeIn > 0) {
    add(flows, 0, 'Trade-in credit (instant)', -inputs.tradeIn);
  }
  addRewards(
    flows,
    0,
    inputs.price * (inputs.taxRate / 100) + inputs.activationFee + inputs.caseCost,
    inputs
  );
  for (let m = 1; m <= HORIZON; m++) {
    add(flows, m, 'Carrier installment (0% APR)', inputs.price / HORIZON);
    if (inputs.carrierMode === 'bill-credit' && inputs.tradeIn > 0) {
      add(flows, m, 'Trade-in bill credit', -inputs.tradeIn / HORIZON);
    }
    if (inputs.carrierPromoMonthly > 0) {
      add(flows, m, 'Carrier promo credit', -inputs.carrierPromoMonthly);
    }
  }
  const ctx: LeaseContext = { flows, paid: 0 };
  addResidual(ctx, inputs.price, inputs);
  return { id: 'carrier36', flows, ownsDevice: true };
}

export function buildScenarios(inputs: UpgradeInputs): ScenarioResult[] {
  return [
    buildLeaseFlows(12, inputs.decision12, inputs),
    buildLeaseFlows(24, inputs.decision24, inputs),
    buildOutrightFlows(inputs),
    buildAppleCardFlows(inputs),
    buildCarrierFlows(inputs)
  ];
}

export const SCENARIO_META: Record<ScenarioId, { name: string; blurb: string }> = {
  lease12: { name: 'Apple Lease · 12 mo', blurb: 'Lease, then decide at month 12' },
  lease24: { name: 'Apple Lease · 24 mo', blurb: 'Lease, then decide at month 24' },
  outright: { name: 'Buy outright', blurb: 'Pay once, own it immediately' },
  applecard: { name: 'Apple Card 0% · 24 mo', blurb: '0% installments + 3% Daily Cash' },
  carrier36: { name: 'Carrier · 36 mo', blurb: '0% financing on your phone bill' }
};

export interface ScenarioSummary {
  scenario: ScenarioResult;
  name: string;
  /** Net present value through the given month */
  pv: number;
  /** Undiscounted total through the given month */
  total: number;
}

/** Per-scenario totals for display: NPV and nominal through a month cutoff. */
export function summarize(
  scenarios: ScenarioResult[],
  discountRatePct: number,
  throughMonth = HORIZON
): ScenarioSummary[] {
  return scenarios.map((scenario) => ({
    scenario,
    name: SCENARIO_META[scenario.id].name,
    pv: npv(scenario.flows, discountRatePct, throughMonth),
    total: nominal(scenario.flows, throughMonth)
  }));
}
