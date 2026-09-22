/**
 * The short answer.
 *
 * The interactive page runs forty-eight months of cash flow across five
 * columns and lets you watch them fill up. That is the right shape for
 * understanding the program and the wrong shape for answering "so which one
 * do I pick?". This module runs the same model and reduces it to a ranking, a
 * handful of break-evens, and the list of catches that actually move money.
 *
 * Everything here is pure and JSON-serializable, so the summary page renders
 * it at build time and the calculator endpoint serves it verbatim.
 */

import {
  allScenarios,
  appleUpgrade,
  bestUpgradeEstimate,
  carrierTradeInDeal,
  closeOut,
  leaseExitChoices,
  leaseTerms,
  EXTENSION_MONTHS,
  HORIZON,
  LEASE_SHARE,
  type Inputs,
  type Scenario,
  type Term
} from './model';

/** How the four years end, and therefore what "cost" means. */
export type Ending = 'own' | 'walkaway';

/** What to do with a lease that reaches a scheduled upgrade. */
export type LeaseExit = 'return' | 'buyout' | 'best';

export interface EvaluateOptions {
  /** `own` finishes with a paid-off phone everywhere; `walkaway` with none. */
  ending?: Ending;
  /** What the last phone fetches on `walkaway`. Defaults to its age estimate. */
  finalSaleEstimate?: number;
  /**
   * Leases are the only path with a real choice at each upgrade. `best`
   * searches every combination, which is the only way a comparison against
   * cash is fair: the lease's best move is usually not its default one.
   */
  leaseExit?: LeaseExit;
}

export interface PlanSummary {
  key: string;
  name: string;
  shortName: string;
  /** 1 is cheapest by `netCost`. */
  rank: number;
  /** Today's dollars, after the closing phone's value is credited back. */
  netCost: number;
  /** Dollars more than the cheapest plan, over the whole four years. */
  costAboveBest: number;
  /** Today's dollars paid out, before crediting the closing phone. */
  npv: number;
  /** Nominal dollars paid out, net of card rewards and excess trade-in credit. */
  totalPaid: number;
  dueToday: number;
  /** The month that hurts. Balloon buyouts show up here. */
  biggestMonth: number;
  monthsPaying: number;
  monthsWithPhone: number;
  netCostPerMonth: number;
  /** Resale value less anything still owed at month 48. */
  equityAtHorizon: number;
  remainingBalance: number;
  carrierCreditsLost: number;
  /** Trade-in value the path could not absorb, returned as Apple credit. */
  tradeInRefund: number;
  /**
   * What actually happened to the leased phone at each shared upgrade month.
   * `already-owned` means the lease had already run past its return window and
   * Klarna's automatic buyout made the phone yours, so there was no choice left.
   */
  leaseExits?: Record<string, LeaseExitTaken>;
  /** What the last month does: settle and keep, or hand back and walk. */
  finalMove: 'buyout' | 'return';
}

/** The 50%-and-30% rule, priced for this phone. */
export interface BuyoutThreshold {
  term: Term;
  /** Monthly bill during the initial term, after any trade-in credit. */
  payment: number;
  /** The advertised payment, which is what a replacement lease costs. */
  advertisedPayment: number;
  /** What the schedule collects over the term: 50% of list, or 70%. */
  leaseTotal: number;
  tradeInCreditApplied: number;
  /** Trade-in value the lease had no room for, handed back as Apple credit. */
  tradeInCreditRefunded: number;
  /** Cost to own it when the term ends, before tax. Payments never change it. */
  buyout: number;
  buyoutWithTax: number;
  /** That buyout as a share of the sticker: 0.5 at 12 months, 0.3 at 24. */
  buyoutShareOfList: number;
  /** Apple's expected trade-in quote for this phone at that age. */
  tradeInAtTerm: number;
  /** What buying it out and trading it in beats handing it back by. */
  buyoutAdvantage: number;
  verdict: 'buy-it-out' | 'hand-it-back';
}

export interface AppleCareVerdict {
  plan: Inputs['appleCare'];
  /** Premiums over the whole forty-eight months, including tax. */
  fourYearCost: number;
  repairWithCare: number;
  repairWithoutCare: number;
  savedPerRepair: number;
  /** Cracked screens over four years that make the premiums pay for themselves. */
  repairsToBreakEven: number | null;
  /** The same number as a cadence: one break every N months. */
  monthsBetweenBreaksToBreakEven: number | null;
  verdict: 'worth-it' | 'not-worth-it' | 'no-coverage';
  note: string;
}

export interface CadenceCost {
  years: 1 | 2 | 3;
  /** Best-case net cost per year, in today's dollars. */
  annualCost: number;
  /** The plan that got there. */
  plan: string;
  /** Dollars a year more than the cheapest cadence. */
  costAboveBest: number;
}

export interface Gotcha {
  id: string;
  /** `critical` changes which button you press; `watch` changes what it costs. */
  severity: 'critical' | 'watch' | 'info';
  headline: string;
  detail: string;
  /** What it is worth over the four years, where that can be priced. */
  impact: number | null;
  /** Plan keys this applies to; empty means all of them. */
  appliesTo: string[];
}

export interface Recommendation {
  pick: string;
  name: string;
  netCost: number;
  runnerUp: { key: string; name: string; netCost: number } | null;
  /** Dollars over four years between the pick and the runner-up. */
  margin: number;
  marginPerMonth: number;
  /** A margin this thin is noise, not a finding. */
  confidence: 'clear' | 'close' | 'toss-up';
  reason: string;
}

export interface Advice {
  horizonMonths: number;
  ending: Ending;
  leaseExit: LeaseExit;
  upgradeMonths: number[];
  recommendation: Recommendation;
  plans: PlanSummary[];
  leaseBuyout: BuyoutThreshold[];
  appleCare: AppleCareVerdict;
  cadence: CadenceCost[];
  gotchas: Gotcha[];
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Settle every path at the same endpoint. `walkaway` gets to choose between
 * returning an eligible lease and buying it out to sell, because which one is
 * cheaper is exactly the question.
 */
function settle(input: Inputs, scenario: Scenario, ending: Ending, sale?: number): Scenario {
  if (ending === 'own') return closeOut(input, scenario, 'buyout');
  return (['return', 'buyout'] as const)
    .map((choice) => closeOut(input, scenario, choice, sale))
    .reduce((best, candidate) =>
      candidate.summary.netCost < best.summary.netCost ? candidate : best
    );
}

/** The lease exit combinations worth costing, given what the caller asked for. */
function exitsToTry(
  upgradeMonths: number[],
  term: Term,
  leaseExit: LeaseExit
): Record<string, 'return' | 'buyout'>[] {
  if (leaseExit === 'best') return leaseExitChoices(upgradeMonths, term);
  return [
    Object.fromEntries(upgradeMonths.map((month) => [`${term}:${month}`, leaseExit] as const))
  ];
}

/** The value estimate the walkaway ending sells the last phone for. */
function finalSalePrice(input: Inputs, options: EvaluateOptions): number | undefined {
  if (options.ending !== 'walkaway') return undefined;
  if (options.finalSaleEstimate !== undefined) return options.finalSaleEstimate;
  const months = input.upgradeMonths ?? [];
  const age = (HORIZON - Math.max(0, ...months, 0)) / 12;
  return (input.privateSaleValues ?? input.upgradeTradeIns)?.[age - 1] ?? 0;
}

export type LeaseExitTaken = 'returned' | 'bought-out' | 'already-owned';

/** A settled path. Lease paths carry the exits the search settled on. */
export interface RankedPath {
  scenario: Scenario;
  /** Set on the two lease paths only. */
  isLease: boolean;
}

/**
 * What the schedule did with the leased phone at each upgrade, read back off
 * the months rather than off the request: an exit the lease was not eligible
 * for was never taken, whatever was asked for.
 */
function leaseExitsTaken(
  scenario: Scenario,
  upgradeMonths: number[]
): Record<string, LeaseExitTaken> {
  return Object.fromEntries(
    upgradeMonths.map((month): [string, LeaseExitTaken] => {
      const row = scenario.rows[month];
      if (row?.leaseReturn) return [String(month), 'returned'];
      if (row?.items.some((item) => item.label === 'Buy out phone before upgrading'))
        return [String(month), 'bought-out'];
      return [String(month), 'already-owned'];
    })
  );
}

/**
 * Every path, closed out at the same endpoint, with the leases represented by
 * their best exit rather than their default one. Cheapest first.
 */
export function rankedScenarios(input: Inputs, options: EvaluateOptions = {}): RankedPath[] {
  const ending = options.ending ?? 'own';
  const leaseExit = options.leaseExit ?? 'best';
  const months = input.upgradeMonths ?? [];
  const sale = finalSalePrice(input, options);

  const settled: RankedPath[] = allScenarios(input)
    .filter((scenario) => !scenario.key.startsWith('upgrade-'))
    .map((scenario) => ({ scenario: settle(input, scenario, ending, sale), isLease: false }));

  for (const term of [12, 24] as const) {
    const variants = exitsToTry(months, term, leaseExit).map((choices) => ({
      scenario: settle(
        input,
        appleUpgrade({ ...input, term, leaseUpgradeChoices: choices }),
        ending,
        sale
      ),
      isLease: true
    }));
    settled.push(
      variants.reduce((best, candidate) =>
        candidate.scenario.summary.netCost < best.scenario.summary.netCost ? candidate : best
      )
    );
  }

  return settled.sort((a, b) => a.scenario.summary.netCost - b.scenario.summary.netCost);
}

function summarizePlan(input: Inputs, path: RankedPath, rank: number, best: number): PlanSummary {
  const { scenario } = path;
  const exits = path.isLease ? leaseExitsTaken(scenario, input.upgradeMonths ?? []) : undefined;
  return {
    key: scenario.key,
    name: scenario.name,
    shortName: scenario.shortName,
    rank,
    netCost: round(scenario.summary.netCost),
    costAboveBest: round(scenario.summary.netCost - best),
    npv: round(scenario.summary.npv - scenario.summary.tradeInRefund),
    totalPaid: round(scenario.summary.cash - scenario.summary.tradeInRefund),
    dueToday: round(scenario.summary.today),
    biggestMonth: round(scenario.summary.biggestMonth),
    monthsPaying: scenario.summary.monthsPaying,
    monthsWithPhone: scenario.summary.monthsWithPhone,
    netCostPerMonth: round(scenario.summary.perMonth),
    equityAtHorizon: round(scenario.summary.equityAtHorizon),
    remainingBalance: round(scenario.summary.remainingBalance),
    carrierCreditsLost: round(scenario.summary.carrierCreditsLost ?? 0),
    tradeInRefund: round(scenario.summary.tradeInRefund),
    ...(exits ? { leaseExits: exits } : {}),
    finalMove: scenario.closeout?.choice ?? 'buyout'
  };
}

/**
 * The one number that decides a lease.
 *
 * A lease collects half the sticker over twelve months, or seventy percent
 * over twenty-four. Whatever is left is the buyout, and a trade-in credit
 * cannot change it: the credit comes off the payments and off the buyout
 * equally, so the buyout stays at 50% or 30% of list no matter what you
 * traded in. Handing the phone back therefore sells it to Apple for exactly
 * that number. If the phone is worth more than that used — and a one-year-old
 * iPhone usually is — handing it back is the expensive door.
 */
export function buyoutThreshold(input: Inputs, term: Term): BuyoutThreshold {
  const tax = 1 + input.taxRate / 100;
  const terms = leaseTerms(input.listPrice, term, input.tradeIn);
  const tradeInAtTerm = input.upgradeTradeIns?.[term / 12 - 1] ?? 0;
  const buyoutWithTax = terms.buyoutAtTerm * tax;
  return {
    term,
    payment: round(terms.payment),
    advertisedPayment: round(terms.gross),
    leaseTotal: round(terms.leaseTotal),
    tradeInCreditApplied: round(terms.credit),
    tradeInCreditRefunded: round(terms.refund),
    buyout: round(terms.buyoutAtTerm),
    buyoutWithTax: round(buyoutWithTax),
    buyoutShareOfList: round(1 - LEASE_SHARE[term]),
    tradeInAtTerm: round(tradeInAtTerm),
    buyoutAdvantage: round(tradeInAtTerm - buyoutWithTax),
    verdict: tradeInAtTerm > buyoutWithTax ? 'buy-it-out' : 'hand-it-back'
  };
}

/** Premiums over four years against what one cracked screen actually costs. */
export function appleCareVerdict(input: Inputs): AppleCareVerdict {
  const tax = 1 + input.taxRate / 100;
  const premiums =
    input.appleCare === 'monthly'
      ? input.appleCareMonthly * HORIZON * tax
      : input.appleCare === 'one'
        ? input.appleCareOneMonthly * HORIZON * tax
        : input.appleCare === 'annual'
          ? input.appleCareAnnual * (HORIZON / 12) * tax
          : 0;
  const repairWithCare = Math.max(0, input.appleCareRepairCost) * tax;
  const repairWithoutCare = Math.max(0, input.screenRepairCost) * tax;
  const savedPerRepair = repairWithoutCare - repairWithCare;
  const repairs = savedPerRepair > 0 ? premiums / savedPerRepair : null;
  const months = repairs && repairs > 0 ? HORIZON / repairs : null;
  return {
    plan: input.appleCare,
    fourYearCost: round(premiums),
    repairWithCare: round(repairWithCare),
    repairWithoutCare: round(repairWithoutCare),
    savedPerRepair: round(savedPerRepair),
    repairsToBreakEven: repairs === null ? null : round(repairs),
    monthsBetweenBreaksToBreakEven: months === null ? null : round(months),
    verdict:
      input.appleCare === 'none'
        ? 'no-coverage'
        : months !== null && months < 12
          ? 'worth-it'
          : 'not-worth-it',
    note:
      input.appleCare === 'none'
        ? `No coverage. One cracked screen costs ${money(repairWithoutCare)} out of pocket, and a leased phone has to be returned working.`
        : months === null
          ? 'Coverage saves nothing per repair at these prices.'
          : `Coverage pays for itself only if you crack a screen about every ${Math.round(months)} months. This prices screen repair only; theft, loss and battery service are not modelled.`
  };
}

/** Upgrading less often is almost always worth more than picking a plan. */
export function cadenceCosts(input: Inputs, options: EvaluateOptions = {}): CadenceCost[] {
  const ending = options.ending ?? 'own';
  const costs = ([1, 2, 3] as const).map((years) => ({
    years,
    ...bestUpgradeEstimate(input, years, ending, options.finalSaleEstimate)
  }));
  const cheapest = Math.min(...costs.map((cost) => cost.annualCost));
  return costs.map((cost) => ({
    years: cost.years,
    annualCost: round(cost.annualCost),
    plan: cost.plan,
    costAboveBest: round(cost.annualCost - cheapest)
  }));
}

function money(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });
}

const LEASE_KEYS = ['upgrade-12', 'upgrade-24'];

/**
 * The catches, priced. Each one is included only when this particular set of
 * answers triggers it, so an empty list really does mean nothing is lurking.
 */
export function gotchas(
  input: Inputs,
  paths: RankedPath[],
  plans: PlanSummary[],
  options: EvaluateOptions = {}
): Gotcha[] {
  const found: Gotcha[] = [];
  const care = appleCareVerdict(input);
  const thresholds = ([12, 24] as const).map((term) => buyoutThreshold(input, term));
  const tax = 1 + input.taxRate / 100;
  const cadence = cadenceCosts(input, options);

  found.push({
    id: 'applecare-never-included',
    severity: care.plan === 'none' ? 'watch' : 'critical',
    headline: 'AppleCare is never part of the lease',
    detail:
      care.plan === 'none'
        ? `Apple Upgrade covers the financing, not the phone. With no coverage a cracked screen is ${money(care.repairWithoutCare)}, and a leased phone has to come back in working condition — so on a lease that repair is not optional the way it is on a phone you own.`
        : `${money(care.fourYearCost)} of premiums over four years sits on top of every column here, lease or not. It is billed by Apple, separately, and cancelling it does not touch the lease.`,
    impact: care.plan === 'none' ? null : care.fourYearCost,
    appliesTo: []
  });

  if (care.plan !== 'none' && care.monthsBetweenBreaksToBreakEven !== null) {
    // One break a year is the cadence people imagine when they buy coverage,
    // so price that case rather than leaving the reader to do the division.
    const yearly = round(care.savedPerRepair * (HORIZON / 12) - care.fourYearCost);
    found.push({
      id: 'applecare-break-even',
      severity: care.verdict === 'worth-it' ? 'info' : 'watch',
      headline: `AppleCare needs a cracked screen every ${Math.round(care.monthsBetweenBreaksToBreakEven)} months to pay for itself`,
      detail: `${money(care.fourYearCost)} in premiums against ${money(care.savedPerRepair)} saved per repair is ${care.repairsToBreakEven?.toFixed(1)} cracked screens over four years. Break one every year and coverage comes out ${money(Math.abs(yearly))} ${yearly >= 0 ? 'ahead' : 'behind'}; break one every other year and it comes out ${money(Math.abs(round(care.savedPerRepair * 2 - care.fourYearCost)))} ${care.savedPerRepair * 2 >= care.fourYearCost ? 'ahead' : 'behind'}. This prices screen repair only — theft, loss and battery service are not modelled.`,
      impact: care.fourYearCost,
      appliesTo: []
    });
  }

  for (const threshold of thresholds) {
    found.push({
      id: `lease-buyout-${threshold.term}`,
      severity: threshold.verdict === 'buy-it-out' ? 'critical' : 'watch',
      headline:
        threshold.verdict === 'buy-it-out'
          ? `Handing back the ${threshold.term}-month lease throws away ${money(threshold.buyoutAdvantage)}`
          : `Handing back the ${threshold.term}-month lease is the right move here`,
      detail: `The ${threshold.term}-month lease collects ${money(threshold.leaseTotal)} and leaves a ${money(threshold.buyoutWithTax)} buyout — ${Math.round(threshold.buyoutShareOfList * 100)}% of the sticker, with tax. A trade-in credit does not change that: it comes off the payments and the buyout equally. Apple's own trade-in quote for this phone at ${threshold.term} months is ${money(threshold.tradeInAtTerm)}, so giving it back ${threshold.verdict === 'buy-it-out' ? `sells it for ${money(threshold.buyoutAdvantage)} less than it is worth` : 'is not leaving money on the table at these values'}.`,
      impact: threshold.verdict === 'buy-it-out' ? threshold.buyoutAdvantage : null,
      appliesTo: [`upgrade-${threshold.term}`]
    });
  }

  const overflowing = thresholds.filter((threshold) => threshold.tradeInCreditRefunded > 0);
  if (overflowing.length > 0) {
    found.push({
      id: 'trade-in-overflow',
      severity: 'critical',
      headline: 'A big trade-in does not fit on a lease',
      detail: `A lease only ever collects ${Math.round(LEASE_SHARE[12] * 100)}% or ${Math.round(LEASE_SHARE[24] * 100)}% of the sticker, so a trade-in worth more than that runs out of payments to reduce. ${overflowing
        .map(
          (threshold) =>
            `At ${threshold.term} months, ${money(threshold.tradeInCreditRefunded)} of your ${money(input.tradeIn)} comes back as Apple store credit rather than a cheaper phone`
        )
        .join('; ')}. On a cash purchase or a loan the whole trade-in comes off the price.`,
      impact: Math.max(...overflowing.map((threshold) => threshold.tradeInCreditRefunded)),
      appliesTo: overflowing.map((threshold) => `upgrade-${threshold.term}`)
    });
  }

  const discounted = thresholds.filter(
    (threshold) => threshold.payment < threshold.advertisedPayment
  );
  if (discounted.length > 0) {
    found.push({
      id: 'payment-resets-after-term',
      severity: 'critical',
      headline: 'The low payment is your old phone, spent',
      detail: `The trade-in credit is spread across the initial term and nothing after it. ${discounted
        .map(
          (threshold) =>
            `The ${threshold.term}-month lease bills ${money(threshold.payment)} while the credit lasts, then ${money(threshold.advertisedPayment)} — a ${money(threshold.advertisedPayment - threshold.payment)}/mo jump.`
        )
        .join(' ')} Budgeting off the first payment is how a lease cycle becomes hard to leave.`,
      impact: round(
        Math.max(
          ...discounted.map(
            (threshold) => (threshold.advertisedPayment - threshold.payment) * threshold.term
          )
        )
      ),
      appliesTo: LEASE_KEYS
    });
  }

  found.push({
    id: 'lease-balloon',
    severity: 'watch',
    headline: `Owning a leased phone means finding ${money(Math.max(...thresholds.map((t) => t.buyoutWithTax)))} in one month`,
    detail: `Take no action when the term ends and payments simply continue at the full rate; ${EXTENSION_MONTHS} months later Klarna charges the rest of the buyout to your card and the phone is yours. That charge is ${thresholds.map((threshold) => `${money(threshold.buyoutWithTax)} at ${threshold.term} months`).join(' and ')}. If a sudden charge that size is a problem, the cheap-looking exit is another lease, which is the point.`,
    impact: Math.max(...thresholds.map((threshold) => threshold.buyoutWithTax)),
    appliesTo: LEASE_KEYS
  });

  found.push({
    id: 'no-trade-in-on-a-new-lease',
    severity: 'critical',
    headline: 'You cannot trade a leased phone in',
    detail:
      'A replacement lease takes no trade-in, because you never owned the phone you handed back. The only route from a leased phone to trade-in value is to buy it out first and trade in the phone you then own — which is why the buyout is the whole decision on this path.',
    impact: null,
    appliesTo: LEASE_KEYS
  });

  if (input.screenChoice === 'defer' || input.screenChoice === 'repair') {
    const uncovered = Math.max(0, input.screenRepairCost) * tax;
    found.push({
      id: 'return-condition',
      severity: 'watch',
      headline: 'A leased phone has to go back working',
      detail: `Damage you would live with on a phone you own becomes a bill on a lease: ${money(uncovered)} without coverage, ${money(Math.max(0, input.appleCareRepairCost) * tax)} with it. Deferring it does not make it go away — it comes off the trade-in or gets repaired before the return.`,
      impact: uncovered,
      appliesTo: LEASE_KEYS
    });
  }

  if (input.klarnaCardBack > 0) {
    // Only what Klarna actually bills is at risk; AppleCare and the carrier
    // keep their rewards whatever card the lease ends up on.
    const atRisk = paths
      .filter((path) => path.isLease)
      .reduce(
        (most, path) =>
          Math.max(
            most,
            path.scenario.rows.reduce(
              (total, row) =>
                total +
                row.items
                  .filter((item) => item.biller === 'klarna')
                  .reduce((sum, item) => sum + (item.reward ?? 0), 0),
              0
            )
          ),
        0
      );
    found.push({
      id: 'klarna-card-acceptance',
      severity: 'watch',
      headline: `${input.klarnaCardBack}% back on lease payments assumes Klarna takes your card`,
      detail: `Klarna does not accept American Express, UnionPay, cards issued by Chase or Capital One, Apple Pay, or PayPal. Debit works. If your rewards card is on that list the lease loses ${money(atRisk)} of the rewards priced here, while everything billed by Apple keeps them — check your card before counting on it.`,
      impact: round(atRisk),
      appliesTo: LEASE_KEYS
    });
  }

  if (input.carrierOffer !== null && input.carrierOffer > 0) {
    const months = input.upgradeMonths ?? [];
    const deal = carrierTradeInDeal(input, input.tradeIn, months[0] ?? input.carrierTerm);
    const forfeited =
      plans.find((plan) => plan.key === 'carrier')?.carrierCreditsLost ?? deal.forfeited;
    found.push({
      id: 'carrier-credits-are-hostage',
      severity: forfeited > 0 ? 'critical' : 'watch',
      headline:
        forfeited > 0
          ? `Upgrading early hands ${money(forfeited)} of carrier credit back`
          : 'Carrier credit only arrives if you stay all 36 months',
      detail: `The promotion is paid out as ${money(deal.credit)} a month against the bill for ${input.carrierTerm} months, and it is the whole trade-in, not a bonus on top of one. Leave early and you pay off the remaining installments and stop earning the rest. It is the cheapest column precisely because it is the hardest to leave.`,
      impact: forfeited > 0 ? forfeited : null,
      appliesTo: ['carrier']
    });
  }

  const yearly = cadence.find((entry) => entry.years === 1);
  const triennial = cadence.find((entry) => entry.years === 3);
  if (yearly && triennial && yearly.annualCost > triennial.annualCost) {
    found.push({
      id: 'cadence-beats-plan',
      severity: 'info',
      headline: 'How often you upgrade costs more than which plan you pick',
      detail: `Upgrading every year runs ${money(yearly.annualCost)} a year here; every three years runs ${money(triennial.annualCost)}. That gap is ${money((yearly.annualCost - triennial.annualCost) * 4)} over four years, against ${money(plans[plans.length - 1].netCost - plans[0].netCost)} between the most and least expensive plan on the same schedule.`,
      impact: round((yearly.annualCost - triennial.annualCost) * 4),
      appliesTo: []
    });
  }

  found.push({
    id: 'lease-caps-at-list',
    severity: 'info',
    headline: 'The lease can never cost more than the phone',
    detail: `Payments and buyout add up to the sticker exactly, so there is no interest to find. The risk is not the total; it is the shape — a payment set artificially low by your old phone's equity, and a buyout you have to produce in one month to keep what you have been paying for.`,
    impact: null,
    appliesTo: LEASE_KEYS
  });

  return found;
}

function recommend(plans: PlanSummary[], ending: Ending): Recommendation {
  const [pick, runnerUp] = plans;
  const margin = runnerUp ? runnerUp.netCost - pick.netCost : 0;
  const marginPerMonth = margin / HORIZON;
  // Four years of guessed trade-in values and tax rates do not resolve a
  // twenty-dollar difference, so don't pretend they do.
  const confidence = margin < 50 ? 'toss-up' : margin < 200 ? 'close' : 'clear';
  const reason = !runnerUp
    ? `${pick.name} is the only path costed here.`
    : confidence === 'clear'
      ? `${pick.name} costs ${money(margin)} less than ${runnerUp.name} over four years, which is more than the assumptions can explain away.`
      : `${pick.name} edges ${runnerUp.name} by ${money(margin)} over four years — about ${money(marginPerMonth)} a month. That is inside the error bars on four years of guessed trade-in values, so pick on cash flow and flexibility instead: ${
          ending === 'own'
            ? 'what you can produce in the worst single month'
            : 'how easily you can leave when you want to'
        }.`;
  return {
    pick: pick.key,
    name: pick.name,
    netCost: pick.netCost,
    runnerUp: runnerUp
      ? { key: runnerUp.key, name: runnerUp.name, netCost: runnerUp.netCost }
      : null,
    margin: round(margin),
    marginPerMonth: round(marginPerMonth),
    confidence,
    reason
  };
}

/** Everything the summary page prints and the calculator returns. */
export function evaluate(input: Inputs, options: EvaluateOptions = {}): Advice {
  const ending = options.ending ?? 'own';
  const leaseExit = options.leaseExit ?? 'best';
  const paths = rankedScenarios(input, { ...options, ending, leaseExit });
  const best = paths[0].scenario.summary.netCost;
  const plans = paths.map((path, index) => summarizePlan(input, path, index + 1, best));
  return {
    horizonMonths: HORIZON,
    ending,
    leaseExit,
    upgradeMonths: input.upgradeMonths ?? [],
    recommendation: recommend(plans, ending),
    plans,
    leaseBuyout: ([12, 24] as const).map((term) => buyoutThreshold(input, term)),
    appleCare: appleCareVerdict(input),
    cadence: cadenceCosts(input, options),
    gotchas: gotchas(input, paths, plans, options)
  };
}
