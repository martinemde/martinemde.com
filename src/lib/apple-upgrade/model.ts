/**
 * Cash-flow model for Apple Upgrade — the Klarna-backed device lease Apple
 * launched in 2026 — and the three things people actually compare it against:
 * paying cash, Apple Card 24-month 0% financing, and 36-month carrier financing.
 *
 * Everything here is pure and unit-tested against the payment examples Apple
 * publishes in the Apple Upgrade footnotes. See `model.test.ts`.
 */

export type Term = 12 | 24;

/** What you do when the initial lease term runs out. */
export type EndChoice =
  /** Hand it back, walk away, no phone. */
  | 'return'
  /** Hand it back, sign a fresh lease on a new device (no trade-in allowed). */
  | 'upgrade'
  /** Pay the purchase option fee and own it. */
  | 'buyout'
  /** Take no action: keep paying month-to-month, then Klarna charges the remaining
   *  buyout to your card and the device becomes yours. */
  | 'nothing';

export type AppleCarePlan = 'none' | 'monthly' | 'annual' | 'one';

export type Biller = 'apple' | 'klarna' | 'carrier';

export interface Inputs {
  /** Sticker price of the device, before tax and before any trade-in. */
  listPrice: number;
  /** Apple Trade In credit. Lowers the lease payment; an instant credit elsewhere. */
  tradeIn: number;
  term: Term;
  endChoice: EndChoice;

  appleCare: AppleCarePlan;
  /** AppleCare+ billed monthly by Apple. */
  appleCareMonthly: number;
  /** AppleCare One, $19.99/mo flat — one subscription covering up to three devices. */
  appleCareOneMonthly: number;
  /** Billed once a year by Apple, used by the 'annual' plan. */
  appleCareAnnual: number;
  /** What a return inspection costs you if you skipped AppleCare and cracked it. */
  damageFee: number;
  /** Odds you actually incur that fee, 0-100. Applied as an expected value. */
  damageOdds: number;

  /** Sales tax, percent. */
  taxRate: number;
  /** One-time carrier activation / upgrade fee. Not sales-taxed here. */
  activationFee: number;
  /** Case, screen protector, whatever you buy alongside it. Taxed. */
  caseCost: number;

  /** Card rewards on charges Apple bills you, percent. Apple Card is 3%. */
  appleCardBack: number;
  /** Card rewards on Klarna lease payments, percent. Klarna refuses many issuers. */
  klarnaCardBack: number;
  /** Card rewards on the carrier bill, percent. */
  carrierCardBack: number;

  /** Annual discount rate for NPV, percent. What your cash earns if you keep it. */
  discountRate: number;

  /** Used resale value of this device at the end of the initial lease term. */
  resaleAtTerm: number;
  /** Used resale value of this device at month 36, the comparison horizon. */
  resaleAt36: number;

  /** Carrier promo credits, total, dribbled out over the carrier term. */
  carrierCredits: number;
  /** Carrier installment term. Effectively always 36 now. */
  carrierTerm: number;
}

export interface LineItem {
  label: string;
  amount: number;
  biller: Biller;
}

export interface MonthRow {
  /** 0 is the day you walk out of the store. Payment 1 lands ~30 days later. */
  month: number;
  items: LineItem[];
  /** Total cash out this month, tax included. */
  outflow: number;
  /** Card rewards earned this month, as a positive number. */
  rewards: number;
  /** Running total of `outflow - rewards`, nominal dollars. */
  runningCash: number;
  /** Running total discounted to today. */
  runningNpv: number;
  /**
   * Pre-tax cost to own it outright at the end of this month, or null when
   * ownership is not on the table (you already own it, or already gave it back).
   */
  buyout: number | null;
  /** Do you have a working phone in your pocket during this month? */
  hasPhone: boolean;
  /** Do you own the thing in your pocket? */
  owns: boolean;
  note?: string;
  /** Shown in place of the line items on months where nothing is due. */
  idleNote?: string;
}

export interface Summary {
  /** Nominal cash out over the horizon, net of card rewards. */
  cash: number;
  /** That same stream discounted to today. */
  npv: number;
  /** Cash you have to produce on day one. */
  today: number;
  /** Largest single month's outflow. Balloon payments show up here. */
  biggestMonth: number;
  monthsWithPhone: number;
  /** What you could liquidate at month 36: resale value less any buyout owed. */
  equityAt36: number;
  /** NPV of cash out, less the present value of that month-36 equity. */
  netCost: number;
  /** `netCost` spread over the months you actually had a phone. */
  perMonth: number;
}

export interface Scenario {
  key: string;
  name: string;
  blurb: string;
  rows: MonthRow[];
  summary: Summary;
}

/** The comparison runs three years out, which covers every path. */
export const HORIZON = 36;

/** Klarna keeps charging you month-to-month for six months past the term. */
export const EXTENSION_MONTHS = 6;

/**
 * Share of list price the lease payments add up to over the initial term.
 * Reverse-engineered from Apple's published iPhone examples: 12-month leases
 * collect half the sticker, 24-month leases collect 70% of it.
 */
export const LEASE_SHARE: Record<Term, number> = { 12: 0.5, 24: 0.7 };

/**
 * What you do with the months after you hand the phone back. The return path
 * leaves a long tail of months where nothing is due and nothing happens, and
 * "No phone" two dozen times in a row undersells it.
 */
export const PASTIMES = [
  'spend some time looking at the trees.',
  'visit your in-laws and listen to their stories.',
  'learn which birds live near you, by sound.',
  'read an entire newspaper, including the part about zoning.',
  'memorize three phone numbers, like a pioneer.',
  'get lost on purpose and ask a stranger the way.',
  'watch a whole sunset without photographing it.',
  'write a letter. On paper. With a stamp.',
  'find out what your neighbors are called.',
  'learn to tell the clouds apart.',
  'sit in a waiting room and simply wait.',
  'bake something that takes four hours.',
  'take up whittling. Everyone needs a spoon.',
  'reread a book you have claimed to have read.',
  'attend a town council meeting, recreationally.',
  'stare out of a bus window like it is 1987.',
  'have a conversation that ends when it is over.',
  'learn the constellations you can actually see.',
  'alphabetize something. Anything.',
  'walk somewhere without knowing how long it takes.',
  'teach yourself to fold a fitted sheet.',
  'nap without setting an alarm.',
  'grow a tomato from seed and worry about it daily.',
  'learn the bus timetable by heart.',
  'eat a meal while looking at the other person.',
  'get a library card, and then use it.',
  'practice an instrument badly, in public.',
  'take the long way home for no reason.',
  'answer a landline without knowing who it is.',
  'be genuinely unreachable for one entire afternoon.'
];

/** Apple prices every lease payment at some x.99. */
export function roundTo99(value: number): number {
  if (value <= 0) return 0;
  return Math.max(0.99, Math.round(value - 0.99) + 0.99);
}

/** The advertised monthly payment, before any trade-in credit. */
export function leasePayment(listPrice: number, term: Term): number {
  return roundTo99((listPrice * LEASE_SHARE[term]) / term);
}

/**
 * Cost to buy the device outright after `month` lease payments.
 *
 * Apple describes this as "the list price minus any lease payments you've made
 * minus any remaining discounts or trade-in credit." Read literally that would
 * charge you for the trade-in twice, so this models the reading that keeps
 * Apple's other promise true — that you never pay more than full price. Every
 * dollar of credit against the device, whether it arrived as a payment or as a
 * traded-in phone, comes off the buyout.
 */
export function buyoutAfter(
  month: number,
  listPrice: number,
  grossPayment: number,
  tradeIn: number,
  term: Term
): number {
  const unusedCredit = (tradeIn * Math.max(0, term - month)) / term;
  return Math.max(0, listPrice - month * grossPayment - unusedCredit);
}

function monthlyDiscount(annualPercent: number): number {
  return annualPercent / 100 / 12;
}

function pv(amount: number, month: number, rate: number): number {
  return rate === 0 ? amount : amount / Math.pow(1 + rate, month);
}

/** Apple bills AppleCare separately from the lease. This is that stream. */
function appleCareItems(input: Inputs, month: number): LineItem[] {
  const taxed = (n: number) => n * (1 + input.taxRate / 100);
  switch (input.appleCare) {
    case 'monthly':
      return month >= 1
        ? [{ label: 'AppleCare+', amount: taxed(input.appleCareMonthly), biller: 'apple' }]
        : [];
    case 'one':
      return month >= 1
        ? [{ label: 'AppleCare One', amount: taxed(input.appleCareOneMonthly), biller: 'apple' }]
        : [];
    case 'annual':
      return month % 12 === 0
        ? [{ label: 'AppleCare+ (annual)', amount: taxed(input.appleCareAnnual), biller: 'apple' }]
        : [];
    default:
      return [];
  }
}

const REWARD_RATE: Record<Biller, keyof Inputs> = {
  apple: 'appleCardBack',
  klarna: 'klarnaCardBack',
  carrier: 'carrierCardBack'
};

function rewardsFor(items: LineItem[], input: Inputs): number {
  return items.reduce((sum, item) => {
    const rate = input[REWARD_RATE[item.biller]] as number;
    return sum + item.amount * (rate / 100);
  }, 0);
}

/**
 * Walks a set of per-month line items into rows with running totals.
 * `state(month)` reports what you're holding during that month.
 */
function assemble(
  input: Inputs,
  items: (month: number) => LineItem[],
  state: (month: number) => {
    buyout: number | null;
    hasPhone: boolean;
    owns: boolean;
    note?: string;
    idleNote?: string;
  }
): MonthRow[] {
  const rate = monthlyDiscount(input.discountRate);
  const rows: MonthRow[] = [];
  let runningCash = 0;
  let runningNpv = 0;

  for (let month = 0; month <= HORIZON; month++) {
    const monthItems = items(month);
    const outflow = monthItems.reduce((sum, item) => sum + item.amount, 0);
    const rewards = rewardsFor(monthItems, input);
    runningCash += outflow - rewards;
    runningNpv += pv(outflow - rewards, month, rate);
    rows.push({
      month,
      items: monthItems,
      outflow,
      rewards,
      runningCash,
      runningNpv,
      ...state(month)
    });
  }
  return rows;
}

/**
 * Roughly what fraction of list an iPhone fetches used, by age in months.
 * Only needed to value a device whose age isn't one the reader gave us a
 * number for — specifically the replacement phone on the upgrade path.
 */
export function usedFraction(ageMonths: number): number {
  const curve: [number, number][] = [
    [0, 1],
    [12, 0.62],
    [24, 0.45],
    [36, 0.33],
    [48, 0.24]
  ];
  const age = Math.max(0, ageMonths);
  for (let i = 1; i < curve.length; i++) {
    const [x1, y1] = curve[i - 1];
    const [x2, y2] = curve[i];
    if (age <= x2) return y1 + ((y2 - y1) * (age - x1)) / (x2 - x1);
  }
  return curve[curve.length - 1][1];
}

/**
 * Resale value of a device of some age, scaled so it agrees with whatever the
 * reader typed into the month-36 box. Their optimism carries across the curve.
 */
function resaleAtAge(input: Inputs, ageMonths: number): number {
  const anchor = input.listPrice * usedFraction(HORIZON);
  const scale = anchor > 0 ? input.resaleAt36 / anchor : 0;
  return input.listPrice * usedFraction(ageMonths) * scale;
}

function summarize(input: Inputs, rows: MonthRow[], equityAt36: number): Summary {
  const last = rows[rows.length - 1];
  const rate = monthlyDiscount(input.discountRate);
  const monthsWithPhone = rows.filter((r) => r.month >= 1 && r.hasPhone).length;

  const netCost = last.runningNpv - pv(equityAt36, HORIZON, rate);

  return {
    cash: last.runningCash,
    npv: last.runningNpv,
    today: rows[0].outflow - rows[0].rewards,
    biggestMonth: Math.max(...rows.map((r) => r.outflow)),
    monthsWithPhone,
    equityAt36,
    netCost,
    perMonth: monthsWithPhone > 0 ? netCost / monthsWithPhone : 0
  };
}

/**
 * The lease. Payments start ~30 days after pickup, the trade-in credit is
 * smeared across the initial term only, and the interesting stuff all happens
 * the month the term runs out.
 */
export function appleUpgrade(input: Inputs): Scenario {
  const { listPrice, term, tradeIn, endChoice } = input;
  const tax = 1 + input.taxRate / 100;
  const gross = leasePayment(listPrice, term);
  const creditPerMonth = tradeIn / term;
  const net = Math.max(0, gross - creditPerMonth);

  // The extension: payments continue at the full rate because the trade-in
  // credit only ever covered the initial term.
  const extensionEnd = term + EXTENSION_MONTHS;
  const buyoutAtTerm = buyoutAfter(term, listPrice, gross, tradeIn, term);

  // For the upgrade path, the replacement lease is priced like this one.
  const newGross = leasePayment(listPrice, term);

  const items = (month: number): LineItem[] => {
    const out: LineItem[] = [];

    if (month === 0) {
      if (input.caseCost > 0)
        out.push({ label: 'Case', amount: input.caseCost * tax, biller: 'apple' });
      if (input.activationFee > 0)
        out.push({ label: 'Carrier activation', amount: input.activationFee, biller: 'carrier' });
      // No down payment, and the trade-in is consumed by the payment schedule
      // rather than handed back as cash, so day one is remarkably cheap.
    }

    if (month >= 1 && month <= term) {
      out.push({ label: 'Lease payment', amount: net * tax, biller: 'klarna' });
    }

    if (month > term) {
      if (endChoice === 'nothing' && month <= extensionEnd) {
        out.push({ label: 'Month-to-month payment', amount: gross * tax, biller: 'klarna' });
      }
      if (endChoice === 'upgrade' && month <= term + term) {
        out.push({ label: 'New lease payment', amount: newGross * tax, biller: 'klarna' });
      }
    }

    if (month === term && endChoice === 'buyout') {
      out.push({ label: 'Purchase option fee', amount: buyoutAtTerm * tax, biller: 'klarna' });
    }

    if (month === extensionEnd && endChoice === 'nothing') {
      const remaining = buyoutAfter(extensionEnd, listPrice, gross, tradeIn, term);
      out.push({
        label: 'Automatic buyout — it\u2019s yours',
        amount: remaining * tax,
        biller: 'klarna'
      });
    }

    // Damage fee lands when you hand a device back without AppleCare.
    const handsBack =
      (endChoice === 'return' || endChoice === 'upgrade') &&
      month === term &&
      input.appleCare === 'none';
    if (handsBack && input.damageFee > 0 && input.damageOdds > 0) {
      out.push({
        label: 'Expected damage fee',
        amount: input.damageFee * (input.damageOdds / 100),
        biller: 'klarna'
      });
    }

    // AppleCare stops when the device does, except on the upgrade path.
    const covered = endChoice === 'upgrade' || endChoice === 'return' ? month <= term : true;
    if (covered || endChoice === 'upgrade') out.push(...appleCareItems(input, month));

    return out;
  };

  const state = (month: number) => {
    if (month <= term) {
      return {
        buyout: buyoutAfter(month, listPrice, gross, tradeIn, term),
        hasPhone: true,
        owns: false,
        note:
          month === term
            ? 'Initial term is up. Return it, upgrade, buy it, or do nothing.'
            : undefined
      };
    }
    switch (endChoice) {
      case 'return':
        return {
          buyout: null,
          hasPhone: false,
          owns: false,
          note: undefined,
          idleNote: `You don\u2019t have a phone: ${PASTIMES[(month - term - 1) % PASTIMES.length]}`
        };
      case 'buyout':
        return { buyout: null, hasPhone: true, owns: true, note: undefined };
      case 'upgrade':
        return {
          buyout: buyoutAfter(month - term, listPrice, newGross, 0, term),
          hasPhone: true,
          owns: false,
          note: undefined
        };
      case 'nothing':
        return month <= extensionEnd
          ? {
              buyout: buyoutAfter(month, listPrice, gross, tradeIn, term),
              hasPhone: true,
              owns: false,
              note:
                month === extensionEnd
                  ? 'No decision for six months, so Klarna charges you the rest and the phone is yours.'
                  : undefined
            }
          : { buyout: null, hasPhone: true, owns: true, note: undefined };
    }
  };

  const rows = assemble(input, items, state);

  // What you're holding at month 36 depends entirely on which door you took.
  // The upgrade path is the fiddly one: you're a year into a lease on a phone
  // that is only HORIZON - term months old, so it's worth a good deal more
  // than the original would have been, and you still owe the buyout on it.
  const last = rows[rows.length - 1];
  const equityAt36 =
    endChoice === 'return'
      ? 0
      : endChoice === 'upgrade'
        ? Math.max(
            0,
            resaleAtAge(input, HORIZON - term) - (last.buyout ?? 0) * (1 + input.taxRate / 100)
          )
        : input.resaleAt36;

  return {
    key: `upgrade-${term}`,
    name: `Apple Upgrade · ${term} mo`,
    blurb: `${term} lease payments, then the choice.`,
    rows,
    summary: summarize(input, rows, equityAt36)
  };
}

/** Hand over a card, own it that afternoon. */
export function outright(input: Inputs): Scenario {
  const tax = 1 + input.taxRate / 100;

  const items = (month: number): LineItem[] => {
    const out: LineItem[] = [];
    if (month === 0) {
      out.push({
        label: 'Device',
        amount: Math.max(0, input.listPrice * tax - input.tradeIn),
        biller: 'apple'
      });
      if (input.caseCost > 0)
        out.push({ label: 'Case', amount: input.caseCost * tax, biller: 'apple' });
      if (input.activationFee > 0)
        out.push({ label: 'Carrier activation', amount: input.activationFee, biller: 'carrier' });
    }
    out.push(...appleCareItems(input, month));
    return out;
  };

  const rows = assemble(input, items, () => ({ buyout: null, hasPhone: true, owns: true }));
  return {
    key: 'outright',
    name: 'Pay cash',
    blurb: 'One charge, no strings, no credit check.',
    rows,
    summary: summarize(input, rows, input.resaleAt36)
  };
}

/** Apple Card Monthly Installments: the tax-inclusive total, split 24 ways, 0% APR. */
export function appleCardFinancing(input: Inputs): Scenario {
  const tax = 1 + input.taxRate / 100;
  const financed = Math.max(0, input.listPrice * tax - input.tradeIn);
  const payment = financed / 24;

  const items = (month: number): LineItem[] => {
    const out: LineItem[] = [];
    if (month === 0) {
      if (input.caseCost > 0)
        out.push({ label: 'Case', amount: input.caseCost * tax, biller: 'apple' });
      if (input.activationFee > 0)
        out.push({ label: 'Carrier activation', amount: input.activationFee, biller: 'carrier' });
    }
    if (month >= 1 && month <= 24) {
      out.push({ label: 'Installment', amount: payment, biller: 'apple' });
    }
    out.push(...appleCareItems(input, month));
    return out;
  };

  const rows = assemble(input, items, () => ({ buyout: null, hasPhone: true, owns: true }));
  return {
    key: 'applecard',
    name: 'Apple Card · 24 mo 0%',
    blurb: 'Same total as cash, spread out, with 3% back on day one.',
    rows,
    summary: summarize(input, rows, input.resaleAt36)
  };
}

/** Carrier installments: tax due up front, promo credits dribbled out monthly. */
export function carrierFinancing(input: Inputs): Scenario {
  const tax = input.taxRate / 100;
  const n = input.carrierTerm;
  const payment = Math.max(0, input.listPrice - input.tradeIn) / n;
  const creditPerMonth = input.carrierCredits / n;

  const items = (month: number): LineItem[] => {
    const out: LineItem[] = [];
    if (month === 0) {
      // Carriers collect sales tax on the full retail price at signing.
      out.push({ label: 'Sales tax, up front', amount: input.listPrice * tax, biller: 'carrier' });
      if (input.caseCost > 0)
        out.push({ label: 'Case', amount: input.caseCost * (1 + tax), biller: 'apple' });
      if (input.activationFee > 0)
        out.push({ label: 'Activation fee', amount: input.activationFee, biller: 'carrier' });
    }
    if (month >= 1 && month <= n) {
      const owed = Math.max(0, payment - creditPerMonth);
      out.push({ label: 'Device installment', amount: owed, biller: 'carrier' });
    }
    out.push(...appleCareItems(input, month));
    return out;
  };

  const rows = assemble(input, items, (month) => ({
    buyout: null,
    hasPhone: true,
    owns: true,
    note: month === 0 && input.carrierCredits > 0 ? 'Credits stop if you leave early.' : undefined
  }));

  return {
    key: 'carrier',
    name: `Carrier · ${n} mo`,
    blurb: 'Cheapest sticker, longest leash.',
    rows,
    summary: summarize(input, rows, input.resaleAt36)
  };
}

/** Every path, priced the same way, for the comparison table. */
export function allScenarios(input: Inputs): Scenario[] {
  return [
    outright(input),
    appleCardFinancing(input),
    appleUpgrade({ ...input, term: 12 }),
    appleUpgrade({ ...input, term: 24 }),
    carrierFinancing(input)
  ];
}

export function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function money0(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });
}
