/**
 * Cash-flow model for Apple Upgrade — the Klarna-backed device lease Apple
 * launched in 2026 — and the three things people actually compare it against:
 * paying cash, Apple Card 24-month 0% financing, and 36-month carrier financing.
 *
 * The page built on this doesn't ask you to pick one. It runs all four side by
 * side, month by month, and lets you watch the columns fill up. So everything
 * here is shaped for that: every dollar carries a category so it can be stacked,
 * a biller so rewards land in the right place, and a running per-category total
 * so a column can be drawn at any month without re-walking the schedule.
 *
 * Everything is pure and unit-tested against the payment examples Apple
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

/**
 * What a dollar is doing, which is the only thing that separates these four
 * paths once the totals converge. `phone` buys equity. `rent` buys a month of
 * use and nothing else. The stacked columns are drawn in this order, bottom up.
 *
 * A lease payment lands in one or the other depending on how the lease ends,
 * not on what it is called: every payment comes off the purchase option fee,
 * so on the buy-it and do-nothing endings the payments really did buy the
 * phone, and on the hand-it-back and upgrade endings they really did not.
 */
export type Category = 'phone' | 'rent' | 'care' | 'fees';

export const CATEGORIES: Category[] = ['phone', 'rent', 'care', 'fees'];

export const CATEGORY_LABELS: Record<Category, string> = {
  phone: 'Toward owning it',
  rent: 'Rent',
  care: 'AppleCare',
  fees: 'Fees and extras'
};

export const CATEGORY_NOTES: Record<Category, string> = {
  phone: 'Money that ends with the phone belonging to you.',
  rent: 'Money that buys a month of use and leaves you with nothing.',
  care: 'Coverage, billed by Apple and separate from everything else.',
  fees: 'Tax due up front, activation, the case, a damage estimate.'
};

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
  /** Used resale value of this device at the horizon, the comparison endpoint. */
  resaleAtHorizon: number;

  /** Carrier promo credits, total, dribbled out over the carrier term. */
  carrierCredits: number;
  /** Carrier installment term. Effectively always 36 now. */
  carrierTerm: number;
}

export interface LineItem {
  label: string;
  amount: number;
  biller: Biller;
  category: Category;
  /** Card rewards this charge earns. Filled in during assembly, not by callers. */
  reward?: number;
}

export type CategoryTotals = Record<Category, number>;

export interface MonthRow {
  /** 0 is the day you walk out of the store. Payment 1 lands ~30 days later. */
  month: number;
  items: LineItem[];
  /** Total cash out this month, tax included, before rewards. */
  outflow: number;
  /** Card rewards earned this month, as a positive number. */
  rewards: number;
  /** `outflow - rewards`: what this month actually costs you. */
  net: number;
  /** Running total of `net`, nominal dollars. */
  runningCash: number;
  /** Running total discounted to today. */
  runningNpv: number;
  /** `runningCash` split by category. Sums to `runningCash`. */
  runningByCategory: CategoryTotals;
  /** `runningNpv` split by category. Sums to `runningNpv`. */
  runningNpvByCategory: CategoryTotals;
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
  /** Months in which you owed anybody anything. */
  monthsPaying: number;
  /** What you could liquidate at the horizon: resale value less any buyout owed. */
  equityAtHorizon: number;
  /**
   * Trade-in value this path could not absorb, handed back as Apple credit.
   * Only the lease usually has any: it collects half or seventy percent of the
   * sticker, so it runs out of payments to discount long before a purchase does.
   */
  tradeInRefund: number;
  /** NPV of cash out, less that credit and the present value of closing equity. */
  netCost: number;
  /** `netCost` spread over the months you actually had a phone. */
  perMonth: number;
}

export interface Scenario {
  key: string;
  /** Full name, for the comparison table. */
  name: string;
  /** Two or three characters wide, for a column head on a phone. */
  shortName: string;
  blurb: string;
  rows: MonthRow[];
  summary: Summary;
}

/**
 * Four years out. Long enough that the 36-month carrier deal finishes, that a
 * 24-month lease runs its whole course twice, and that the phone you bought
 * with cash is visibly old.
 */
export const HORIZON = 48;

/**
 * How long Klarna leaves the decision open past the end of the term. You keep
 * paying month-to-month through that window; the month it closes, the rest of
 * the balance is charged instead of another payment, so the last month of the
 * extension is one line — pay the remainder — not a payment and a balloon.
 */
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
 * "No phone" three dozen times in a row undersells it.
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
  'be genuinely unreachable for one entire afternoon.',
  'sharpen every knife in the house.',
  'identify one tree on your street, for certain.',
  'learn the difference between a crow and a raven.',
  'copy a recipe onto a card in your own handwriting.',
  'sit on a porch and greet people going past.',
  'work out which way is north without checking.',
  'finish the crossword in pen, badly.',
  'learn to skip a stone four times.',
  'keep a diary for a week and then read it.',
  'watch a pot until it boils, out of spite.'
];

/**
 * Plain-language notes for each charge, keyed by the label the schedule uses.
 * The ledger shows one the first time a charge appears and then shuts up about
 * it, which is why these live here rather than on every LineItem.
 */
export const CHARGE_NOTES: Record<string, string> = {
  Device: 'The whole sticker price plus tax, on day one, in one charge.',
  Installment: 'The tax-inclusive total split 24 ways at 0% APR. Apple bills it; nothing accrues.',
  'Device installment':
    'The carrier’s share of the phone, minus this month’s slice of promo credit. Leave early and the rest of the credit evaporates.',
  'Lease payment':
    'It comes off the purchase option fee, so whether it bought you anything depends on how the lease ends. The trade-in credit is folded into it until the initial term runs out.',
  'Month-to-month payment':
    'The lease rolled over. Same phone, full un-credited rate, and every payment still comes off the buyout.',
  'New lease payment':
    'A fresh lease on a new phone. No trade-in is allowed on an upgrade, so this is the full rate.',
  'Purchase option fee': 'One payment and the phone stops being Klarna’s.',
  'Automatic buyout — it’s yours':
    'The whole remaining balance, in one charge, on whatever card Klarna has on file.',
  'AppleCare+':
    'Billed by Apple, cancellable, and on a leased phone it is what stands between you and the return inspection.',
  'AppleCare One': 'Flat rate, up to three devices. Already subscribed? Adding this phone is free.',
  'AppleCare+ (annual)':
    'A year at a time, up front. Cheaper than monthly if you keep it the whole way.',
  'Sales tax, up front':
    'Carriers collect tax on the full retail price at signing, before you have paid for the phone.',
  'Carrier activation':
    'One-time, at signup, and required — you cannot complete a lease without attaching a carrier.',
  Case: 'Case and glass. Not financed, not optional in practice.',
  'Expected damage fee':
    '“Good working condition” is the standard and Apple has not said what failing it costs. This is your guess times your odds.'
};

const CATEGORY_OF_ZERO: CategoryTotals = { phone: 0, rent: 0, care: 0, fees: 0 };

function zeroTotals(): CategoryTotals {
  return { ...CATEGORY_OF_ZERO };
}

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
 * Cost to own the device outright, given the credit already against it and the
 * cash paid so far.
 *
 * Apple describes the purchase option fee as "the list price minus any lease
 * payments you've made minus any remaining discounts or trade-in credit."
 * Read literally that would charge you for the trade-in twice, so this models
 * the reading that keeps Apple's other promise true: you never pay more than
 * full price, and with a trade-in you never pay more than full price less what
 * you traded in. Every dollar of credit against the device, whether it arrived
 * as a payment or as a traded-in phone, comes off the buyout.
 */
export function buyoutAfter(listPrice: number, credit: number, cashPaid: number): number {
  return Math.max(0, listPrice - credit - cashPaid);
}

export interface LeaseTerms {
  /** What the schedule is built to collect, before tax: 50% or 70% of list. */
  leaseTotal: number;
  /** The advertised monthly payment, before any trade-in credit. */
  gross: number;
  /** How much of the trade-in this lease can actually absorb. */
  credit: number;
  /**
   * Trade-in value the lease has no room for. A lease only ever collects half
   * or seventy percent of the sticker, so a big trade-in runs out of payments
   * to reduce, and the rest comes back as Apple credit rather than as a
   * cheaper phone. This is the single biggest thing a trade-in does differently
   * on a lease than on a purchase.
   */
  refund: number;
  /** What you are actually billed each month of the initial term. */
  payment: number;
  /** Cost to own it the month the initial term ends. */
  buyoutAtTerm: number;
}

/**
 * Everything the lease schedule does with a price, a term and a trade-in.
 *
 * The trade-in is credited against the lease total rather than against the
 * rounded payment schedule, which is what makes the edge case behave: trade in
 * more than the lease will ever collect and the payment is zero, not the few
 * cents the x.99 rounding would otherwise leave behind.
 */
export function leaseTerms(listPrice: number, term: Term, tradeIn: number): LeaseTerms {
  const leaseTotal = listPrice * LEASE_SHARE[term];
  const gross = leasePayment(listPrice, term);
  const credit = Math.min(Math.max(0, tradeIn), leaseTotal);
  const refund = Math.max(0, tradeIn - leaseTotal);

  // Apple quotes the reduced payment as the advertised rate less the credit
  // spread over the term, so that is what gets billed — except once the credit
  // covers the whole lease total, where there is simply nothing left to collect.
  const payment = credit >= leaseTotal ? 0 : Math.max(0, gross - credit / term);

  return {
    leaseTotal,
    gross,
    credit,
    refund,
    payment,
    buyoutAtTerm: buyoutAfter(listPrice, credit, payment * term)
  };
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
  const care = (label: string, amount: number): LineItem[] =>
    amount > 0 ? [{ label, amount, biller: 'apple', category: 'care' }] : [];

  switch (input.appleCare) {
    case 'monthly':
      return month >= 1 ? care('AppleCare+', taxed(input.appleCareMonthly)) : [];
    case 'one':
      return month >= 1 ? care('AppleCare One', taxed(input.appleCareOneMonthly)) : [];
    case 'annual':
      return month % 12 === 0 ? care('AppleCare+ (annual)', taxed(input.appleCareAnnual)) : [];
    default:
      return [];
  }
}

const REWARD_RATE: Record<Biller, keyof Inputs> = {
  apple: 'appleCardBack',
  klarna: 'klarnaCardBack',
  carrier: 'carrierCardBack'
};

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
  const byCategory = zeroTotals();
  const npvByCategory = zeroTotals();

  for (let month = 0; month <= HORIZON; month++) {
    // Rewards are netted against the charge that earned them, so a column's
    // stacked categories still add up to what the column cost.
    const monthItems = items(month).map((item) => ({
      ...item,
      reward: item.amount * ((input[REWARD_RATE[item.biller]] as number) / 100)
    }));

    let outflow = 0;
    let rewards = 0;
    for (const item of monthItems) {
      outflow += item.amount;
      rewards += item.reward;
      const net = item.amount - item.reward;
      byCategory[item.category] += net;
      npvByCategory[item.category] += pv(net, month, rate);
    }

    const net = outflow - rewards;
    runningCash += net;
    runningNpv += pv(net, month, rate);

    rows.push({
      month,
      items: monthItems,
      outflow,
      rewards,
      net,
      runningCash,
      runningNpv,
      runningByCategory: { ...byCategory },
      runningNpvByCategory: { ...npvByCategory },
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
    [48, 0.24],
    [60, 0.18]
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
 * reader typed into the closing-resale box. Their optimism carries across the
 * curve.
 */
function resaleAtAge(input: Inputs, ageMonths: number): number {
  const anchor = input.listPrice * usedFraction(HORIZON);
  const scale = anchor > 0 ? input.resaleAtHorizon / anchor : 0;
  return input.listPrice * usedFraction(ageMonths) * scale;
}

function summarize(
  input: Inputs,
  rows: MonthRow[],
  equityAtHorizon: number,
  tradeInRefund = 0
): Summary {
  const last = rows[rows.length - 1];
  const rate = monthlyDiscount(input.discountRate);
  const monthsWithPhone = rows.filter((r) => r.month >= 1 && r.hasPhone).length;

  // The refund arrives as store credit on day one, so it needs no discounting.
  const netCost = last.runningNpv - tradeInRefund - pv(equityAtHorizon, HORIZON, rate);

  return {
    cash: last.runningCash,
    npv: last.runningNpv,
    today: rows[0].net,
    biggestMonth: Math.max(...rows.map((r) => r.outflow)),
    monthsWithPhone,
    monthsPaying: rows.filter((r) => r.month >= 1 && r.outflow > 0).length,
    equityAtHorizon,
    tradeInRefund,
    netCost,
    perMonth: monthsWithPhone > 0 ? netCost / monthsWithPhone : 0
  };
}

/**
 * The lease. Payments start ~30 days after pickup, the trade-in credit is
 * smeared across the initial term only, and the interesting stuff all happens
 * the month a term runs out — which, on the upgrade path, happens over and over.
 */
export function appleUpgrade(input: Inputs): Scenario {
  const { listPrice, term, tradeIn, endChoice } = input;
  const tax = 1 + input.taxRate / 100;
  const { gross, credit, refund, payment, buyoutAtTerm } = leaseTerms(listPrice, term, tradeIn);

  // The extension: payments continue at the full rate because the trade-in
  // credit only ever covered the initial term.
  const extensionEnd = term + EXTENSION_MONTHS;

  /**
   * Cash the lease has collected by the end of `month`, before tax. The
   * extension bills a payment for every month of the window but the last,
   * which settles the balance instead.
   */
  const extensionPayments = EXTENSION_MONTHS - 1;
  const cashThrough = (month: number): number => {
    const paid = payment * Math.max(0, Math.min(month, term));
    if (endChoice !== 'nothing' || month <= term) return paid;
    return paid + gross * Math.min(month - term, extensionPayments);
  };

  /** Which lease you're on (0-indexed) and how far into it, for the upgrade path. */
  const cycle = (month: number) => {
    const index = Math.floor((month - 1) / term);
    return { index, inLease: month - index * term };
  };

  // Every lease payment reduces the buyout, so whether it bought equity or
  // just bought a month comes down to whether you end up owning the thing.
  const owns = endChoice === 'buyout' || endChoice === 'nothing';
  const leaseCharge = (label: string, amount: number): LineItem => ({
    label,
    amount,
    biller: 'klarna',
    category: owns ? 'phone' : 'rent'
  });

  const items = (month: number): LineItem[] => {
    const out: LineItem[] = [];

    if (month === 0) {
      if (input.caseCost > 0)
        out.push({
          label: 'Case',
          amount: input.caseCost * tax,
          biller: 'apple',
          category: 'fees'
        });
      if (input.activationFee > 0)
        out.push({
          label: 'Carrier activation',
          amount: input.activationFee,
          biller: 'carrier',
          category: 'fees'
        });
      // No down payment, and the trade-in is consumed by the payment schedule
      // rather than handed back as cash, so day one is remarkably cheap.
    }

    if (month >= 1 && month <= term && payment > 0) {
      out.push(leaseCharge('Lease payment', payment * tax));
    }

    if (month > term) {
      if (endChoice === 'nothing' && month < extensionEnd) {
        out.push(leaseCharge('Month-to-month payment', gross * tax));
      }
      if (endChoice === 'upgrade') {
        // Every term you hand it back and start again, at the full rate.
        out.push(leaseCharge('New lease payment', gross * tax));
      }
    }

    if (month === term && endChoice === 'buyout') {
      out.push({
        label: 'Purchase option fee',
        amount: buyoutAtTerm * tax,
        biller: 'klarna',
        category: 'phone'
      });
    }

    if (month === extensionEnd && endChoice === 'nothing') {
      out.push({
        label: 'Automatic buyout — it\u2019s yours',
        amount: buyoutAfter(listPrice, credit, cashThrough(extensionEnd)) * tax,
        biller: 'klarna',
        category: 'phone'
      });
    }

    // A damage fee lands every time you hand a device back without AppleCare.
    const handsBack =
      month > 0 &&
      month % term === 0 &&
      (endChoice === 'upgrade' || (endChoice === 'return' && month === term)) &&
      input.appleCare === 'none';
    if (handsBack && input.damageFee > 0 && input.damageOdds > 0) {
      out.push({
        label: 'Expected damage fee',
        amount: input.damageFee * (input.damageOdds / 100),
        biller: 'klarna',
        category: 'fees'
      });
    }

    // AppleCare stops when the device does, except on the upgrade path where
    // there is always a device.
    const covered = endChoice === 'return' ? month <= term : true;
    if (covered) out.push(...appleCareItems(input, month));

    return out;
  };

  const state = (month: number) => {
    if (month <= term) {
      return {
        buyout: buyoutAfter(listPrice, credit, cashThrough(month)),
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
      case 'upgrade': {
        const { inLease } = cycle(month);
        // A replacement lease gets no trade-in; Apple does not allow one.
        return {
          buyout: buyoutAfter(listPrice, 0, gross * inLease),
          hasPhone: true,
          owns: false,
          note: inLease === term ? 'Another term up. Another four doors.' : undefined
        };
      }
      case 'nothing':
        return month <= extensionEnd
          ? {
              buyout: buyoutAfter(listPrice, credit, cashThrough(month)),
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

  // What you're holding at the horizon depends entirely on which door you took.
  // The upgrade path is the fiddly one: you're some way into a lease on a phone
  // younger than the original, so it's worth more, and you still owe its buyout.
  const last = rows[rows.length - 1];
  const equityAtHorizon =
    endChoice === 'return'
      ? 0
      : endChoice === 'upgrade'
        ? Math.max(0, resaleAtAge(input, cycle(HORIZON).inLease) - (last.buyout ?? 0) * tax)
        : input.resaleAtHorizon;

  return {
    key: `upgrade-${term}`,
    name: `Apple Upgrade · ${term} mo`,
    shortName: 'Lease',
    blurb: `${term} lease payments, then the choice.`,
    rows,
    summary: summarize(input, rows, equityAtHorizon, refund)
  };
}

/** Hand over a card, own it that afternoon. */
export function outright(input: Inputs): Scenario {
  const tax = 1 + input.taxRate / 100;
  const owed = input.listPrice * tax;
  const refund = Math.max(0, input.tradeIn - owed);

  const items = (month: number): LineItem[] => {
    const out: LineItem[] = [];
    if (month === 0) {
      out.push({
        label: 'Device',
        amount: Math.max(0, owed - input.tradeIn),
        biller: 'apple',
        category: 'phone'
      });
      if (input.caseCost > 0)
        out.push({
          label: 'Case',
          amount: input.caseCost * tax,
          biller: 'apple',
          category: 'fees'
        });
      if (input.activationFee > 0)
        out.push({
          label: 'Carrier activation',
          amount: input.activationFee,
          biller: 'carrier',
          category: 'fees'
        });
    }
    out.push(...appleCareItems(input, month));
    return out;
  };

  const rows = assemble(input, items, () => ({ buyout: null, hasPhone: true, owns: true }));
  return {
    key: 'outright',
    name: 'Pay cash',
    shortName: 'Cash',
    blurb: 'One charge, no strings, no credit check.',
    rows,
    summary: summarize(input, rows, input.resaleAtHorizon, refund)
  };
}

/** Apple Card Monthly Installments: the tax-inclusive total, split 24 ways, 0% APR. */
export function appleCardFinancing(input: Inputs): Scenario {
  const tax = 1 + input.taxRate / 100;
  const owed = input.listPrice * tax;
  const financed = Math.max(0, owed - input.tradeIn);
  const refund = Math.max(0, input.tradeIn - owed);
  const payment = financed / 24;

  const items = (month: number): LineItem[] => {
    const out: LineItem[] = [];
    if (month === 0) {
      if (input.caseCost > 0)
        out.push({
          label: 'Case',
          amount: input.caseCost * tax,
          biller: 'apple',
          category: 'fees'
        });
      if (input.activationFee > 0)
        out.push({
          label: 'Carrier activation',
          amount: input.activationFee,
          biller: 'carrier',
          category: 'fees'
        });
    }
    if (month >= 1 && month <= 24) {
      out.push({ label: 'Installment', amount: payment, biller: 'apple', category: 'phone' });
    }
    out.push(...appleCareItems(input, month));
    return out;
  };

  const rows = assemble(input, items, () => ({ buyout: null, hasPhone: true, owns: true }));
  return {
    key: 'applecard',
    name: 'Apple Card · 24 mo 0%',
    shortName: 'Card',
    blurb: 'Same total as cash, spread out, with 3% back on day one.',
    rows,
    summary: summarize(input, rows, input.resaleAtHorizon, refund)
  };
}

/** Carrier installments: tax due up front, promo credits dribbled out monthly. */
export function carrierFinancing(input: Inputs): Scenario {
  const tax = input.taxRate / 100;
  const n = input.carrierTerm;
  const payment = Math.max(0, input.listPrice - input.tradeIn) / n;
  const refund = Math.max(0, input.tradeIn - input.listPrice);
  const creditPerMonth = input.carrierCredits / n;

  const items = (month: number): LineItem[] => {
    const out: LineItem[] = [];
    if (month === 0) {
      // Carriers collect sales tax on the full retail price at signing.
      out.push({
        label: 'Sales tax, up front',
        amount: input.listPrice * tax,
        biller: 'carrier',
        category: 'fees'
      });
      if (input.caseCost > 0)
        out.push({
          label: 'Case',
          amount: input.caseCost * (1 + tax),
          biller: 'apple',
          category: 'fees'
        });
      if (input.activationFee > 0)
        out.push({
          label: 'Carrier activation',
          amount: input.activationFee,
          biller: 'carrier',
          category: 'fees'
        });
    }
    if (month >= 1 && month <= n) {
      const owed = Math.max(0, payment - creditPerMonth);
      out.push({
        label: 'Device installment',
        amount: owed,
        biller: 'carrier',
        category: 'phone'
      });
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
    shortName: 'Carrier',
    blurb: 'Cheapest sticker, longest leash.',
    rows,
    summary: summarize(input, rows, input.resaleAtHorizon, refund)
  };
}

/**
 * The four columns, priced off one set of answers. Which lease term appears is
 * the reader's call; nobody is asked whether they'd rather buy, finance or
 * lease, because that is the question the page exists to answer.
 */
export function allScenarios(input: Inputs): Scenario[] {
  return [outright(input), appleCardFinancing(input), appleUpgrade(input), carrierFinancing(input)];
}

/**
 * A month that is worth stopping on, and why. The ledger runs 48 rows; without
 * these it would be 48 rows of the same four numbers getting bigger.
 */
export interface Beat {
  title: string;
  detail: string;
}

export function beats(input: Inputs): Map<number, Beat> {
  const { term, endChoice, carrierTerm } = input;
  const { gross, payment, refund, leaseTotal } = leaseTerms(input.listPrice, term, input.tradeIn);
  const map = new Map<number, Beat>();
  const set = (month: number, beat: Beat) => {
    if (month >= 0 && month <= HORIZON && !map.has(month)) map.set(month, beat);
  };

  set(0, {
    title: 'You walk out of the store',
    detail: refund
      ? `Two columns have already taken a large bite and two have taken almost nothing. And your trade-in is bigger than a ${term}-month lease has room for: it only ever collects ${money0(leaseTotal)}.`
      : 'Two columns have already taken a large bite and two have taken almost nothing. Nothing about the phone differs between them — only the moment the money moves.'
  });

  set(1, {
    title: 'Thirty days later, everything starts billing',
    detail:
      'The lease, the Apple Card installment and the carrier instalment all begin about a month after pickup. The cash column is done paying for the phone and never pays for it again.'
  });

  if (input.appleCare === 'annual') {
    set(12, {
      title: 'AppleCare comes due again',
      detail:
        'The yearly plan lands in one charge, in every column at once. It is the only line here that does not care how you paid for the phone.'
    });
  }

  if (input.tradeIn > 0 && endChoice !== 'return' && payment < gross) {
    set(term + 1, {
      title: 'The trade-in credit is spent',
      detail: `The credit only ever covered the initial term. The lease payment goes from ${money(payment)} to the full ${money(gross)}, and that is the number it stays at from here.`
    });
  }

  if (endChoice === 'nothing') {
    set(term + EXTENSION_MONTHS, {
      title: 'Klarna settles it for you',
      detail:
        'Six months with no decision, so the remaining balance is charged to your card and the phone becomes yours. You have now paid exactly list price, and you decided nothing.'
    });
  }

  set(24, {
    title: 'Apple Card financing is paid off',
    detail:
      'Twenty-four installments, zero interest, and that column stops growing except for coverage. Compare its height to the cash column — same phone, same total, two years apart.'
  });

  if (carrierTerm > 24 && carrierTerm < HORIZON) {
    set(carrierTerm, {
      title: 'The carrier finally lets go',
      detail: input.carrierCredits
        ? 'The last promo credit posts and the installments end. Three years of staying put, which was the actual price of that sticker.'
        : 'Thirty-six installments end. This was the cheapest monthly number on the page and the longest commitment behind it.'
    });
  }

  if (endChoice === 'upgrade' && 2 * term <= HORIZON && 2 * term !== term) {
    set(2 * term, {
      title: 'Another term up, another four doors',
      detail:
        'You hand back a second phone and sign a third lease. The rent column has no top to it — that is what the upgrade path is.'
    });
  }

  set(HORIZON, {
    title: 'Four years in',
    detail:
      'Look at the four totals, then at what each one leaves in your hand. The columns are not comparing the same thing until you subtract what you can still sell.'
  });

  return map;
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
