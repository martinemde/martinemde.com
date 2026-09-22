/**
 * The calculator's query string: one table that documents the parameters and
 * one parser that reads them, so the docs cannot drift from the behaviour.
 *
 * Written for an agent that arrives with a price and a trade-in quote and
 * wants the answer as data. Every parameter is optional; the defaults describe
 * a September 2026 iPhone 18 Pro bought in an 8.5% tax state.
 */

import type { AppleCarePlan, ScreenChoice } from './model';
import {
  ASSUMPTIONS,
  DEFAULT_LIST_PRICE,
  DEVICES,
  type Answers,
  deviceByKey,
  upgradeTradeIns
} from './presets';
import type { Ending, EvaluateOptions, LeaseExit } from './advice';

export interface ParamDoc {
  name: string;
  type: 'number' | 'percent' | 'money' | 'enum' | 'money-list' | 'month-list' | 'flag';
  default: string;
  description: string;
  values?: readonly string[];
}

export const PARAMETERS: readonly ParamDoc[] = [
  {
    name: 'device',
    type: 'enum',
    default: 'none',
    values: DEVICES.map((device) => device.key),
    description:
      'A phone from the September 2026 lineup. Sets device_price and the trade-in curve used for future years. Pass device_price instead for anything else.'
  },
  {
    name: 'device_price',
    type: 'money',
    default: String(DEFAULT_LIST_PRICE),
    description: 'Sticker price of the phone you are buying, before tax and before any trade-in.'
  },
  {
    name: 'trade_in',
    type: 'money',
    default: '0',
    description:
      'Apple Trade In credit for the phone you are handing over today. On a lease this is spread across the initial term only, and anything the lease cannot absorb comes back as Apple store credit.'
  },
  {
    name: 'carrier_offer',
    type: 'money',
    default: 'none',
    description:
      'The whole carrier promotion, including your trade-in, not a bonus on top of it. Paid out in equal monthly bill credits over 36 months and forfeited from the month you leave. Omit it and the carrier column just uses the ordinary trade-in.'
  },
  {
    name: 'apple_care',
    type: 'enum',
    default: 'none',
    values: ['none', 'monthly', 'annual', 'one'],
    description:
      'AppleCare+ billed monthly or yearly, AppleCare One at a flat monthly rate, or no coverage. Never bundled with any of the payment paths; it is billed separately by Apple in all of them.'
  },
  {
    name: 'apple_care_monthly',
    type: 'money',
    default: String(ASSUMPTIONS.appleCareMonthly),
    description: 'Monthly AppleCare+ price for this device, before tax.'
  },
  {
    name: 'apple_care_annual',
    type: 'money',
    default: String(ASSUMPTIONS.appleCareAnnual),
    description: 'Yearly AppleCare+ price for this device, before tax.'
  },
  {
    name: 'apple_care_one_monthly',
    type: 'money',
    default: String(ASSUMPTIONS.appleCareOneMonthly),
    description:
      'Monthly AppleCare One price. Set it to 0 if the household already subscribes and this device rides along for nothing.'
  },
  {
    name: 'screen_repair_cost',
    type: 'money',
    default: String(ASSUMPTIONS.screenRepairCost),
    description: 'Out-of-warranty screen repair for this device, before tax.'
  },
  {
    name: 'apple_care_repair_cost',
    type: 'money',
    default: String(ASSUMPTIONS.appleCareRepairCost),
    description: 'The AppleCare+ service fee for a screen repair, before tax.'
  },
  {
    name: 'broken_screen',
    type: 'enum',
    default: 'none',
    values: ['none', 'repair', 'defer', 'dismiss'],
    description:
      'Crack the screen in month nine and see what each path does about it. `repair` fixes it then; `defer` leaves it, which costs trade-in value on a phone you own and a full-price repair before a lease goes back; `dismiss` means it never happened.'
  },
  {
    name: 'tax_rate',
    type: 'percent',
    default: String(ASSUMPTIONS.taxRate),
    description:
      'Sales tax, percent. Applied to lease payments and the buyout, and to the whole price up front on a purchase.'
  },
  {
    name: 'activation_fee',
    type: 'money',
    default: String(ASSUMPTIONS.activationFee),
    description: 'Carrier activation or upgrade fee, charged again at every replacement.'
  },
  {
    name: 'case_cost',
    type: 'money',
    default: String(ASSUMPTIONS.caseCost),
    description: 'Case and accessories, charged again at every replacement.'
  },
  {
    name: 'apple_card_back',
    type: 'percent',
    default: String(ASSUMPTIONS.appleCardBack),
    description: 'Card rewards on charges Apple bills. Apple Card pays 3%.'
  },
  {
    name: 'klarna_card_back',
    type: 'percent',
    default: String(ASSUMPTIONS.klarnaCardBack),
    description:
      'Card rewards on the Klarna lease payments. Set it to 0 unless you have checked: Klarna refuses American Express, UnionPay, Chase- and Capital One-issued cards, Apple Pay and PayPal.'
  },
  {
    name: 'carrier_card_back',
    type: 'percent',
    default: String(ASSUMPTIONS.carrierCardBack),
    description: 'Card rewards on the carrier bill.'
  },
  {
    name: 'discount_rate',
    type: 'percent',
    default: String(ASSUMPTIONS.discountRate),
    description:
      'Annual rate your unspent cash earns, used to discount every path to today. Raising it favours the paths that keep your money longest.'
  },
  {
    name: 'upgrade_every',
    type: 'enum',
    default: '4',
    values: ['1', '2', '3', '4'],
    description:
      'Years between replacements, applied identically to every path. 4 means keep this phone for the whole comparison.'
  },
  {
    name: 'upgrade_months',
    type: 'month-list',
    default: 'from upgrade_every',
    description:
      'Explicit replacement months, any of 12, 24 and 36, comma-separated. Overrides upgrade_every when both are given. An empty value means never replace it.'
  },
  {
    name: 'lease_exit',
    type: 'enum',
    default: 'best',
    values: ['best', 'return', 'buyout'],
    description:
      'What the lease does with the old phone at each replacement. `best` searches every combination and reports the cheapest, which is the only fair comparison against paths that have no such choice.'
  },
  {
    name: 'ending',
    type: 'enum',
    default: 'own',
    values: ['own', 'walkaway'],
    description:
      'How month 48 settles. `own` pays off every path and credits the phone you keep. `walkaway` finishes with no phone and no debt, returning an eligible lease or selling an owned phone.'
  },
  {
    name: 'final_sale_estimate',
    type: 'money',
    default: 'the age-based estimate',
    description: 'Net proceeds for the last phone on `ending=walkaway`, after fees and shipping.'
  },
  {
    name: 'trade_in_values',
    type: 'money-list',
    default: "the device's own curve",
    description:
      'Expected Apple trade-in offers when the phone is one, two, three and four years old, comma-separated. These decide whether buying a lease out beats handing it back, so they are the input most worth replacing with real quotes.'
  },
  {
    name: 'private_sale_values',
    type: 'money-list',
    default: 'none',
    description:
      'Opt into selling owned phones yourself: net proceeds at one, two, three and four years old, comma-separated. Replaces trade-in credit, and rules out a new carrier promotion.'
  },
  {
    name: 'help',
    type: 'flag',
    default: 'off',
    description:
      'Include this parameter table in the response. It is included automatically when no parameters are given.'
  }
] as const;

const PARAM_NAMES = new Set(PARAMETERS.map((parameter) => parameter.name));

export interface ParsedQuery {
  answers: Answers;
  options: Required<Pick<EvaluateOptions, 'ending' | 'leaseExit'>> & {
    finalSaleEstimate?: number;
  };
  /** Echoed back so a caller can see which defaults filled themselves in. */
  resolved: Record<string, string | number | boolean | number[] | null>;
  /** Anything ignored or clamped, named. Never fatal: bad input gets a default. */
  warnings: string[];
  /** True when the caller sent nothing, or asked for the parameter table. */
  wantsDocs: boolean;
}

/**
 * Read the query string. Nothing here throws: an unusable value earns a
 * warning and the default, because a half-answered question is still worth
 * costing and a 400 helps nobody.
 */
export function parseCalculatorQuery(params: URLSearchParams): ParsedQuery {
  const warnings: string[] = [];

  for (const name of new Set(params.keys())) {
    if (!PARAM_NAMES.has(name)) warnings.push(`Ignored unknown parameter "${name}".`);
  }

  const has = (name: string) => params.get(name) !== null && params.get(name) !== '';

  function number(name: string, fallback: number, { min = 0 } = {}): number {
    if (!has(name)) return fallback;
    const raw = params.get(name)!.replace(/[$,\s]/g, '');
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      warnings.push(`"${name}" is not a number; used ${fallback}.`);
      return fallback;
    }
    if (value < min) {
      warnings.push(`"${name}" cannot be below ${min}; used ${min}.`);
      return min;
    }
    return value;
  }

  function choice<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
    if (!has(name)) return fallback;
    const value = params.get(name)!.trim().toLowerCase() as T;
    if (allowed.includes(value)) return value;
    warnings.push(`"${name}" must be one of ${allowed.join(', ')}; used ${fallback}.`);
    return fallback;
  }

  function numbers(name: string): number[] | null {
    if (!has(name)) return null;
    const parts = params.get(name)!.split(',');
    const values = parts.map((part) => Number(part.replace(/[$\s]/g, '')));
    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      warnings.push(`"${name}" must be a comma-separated list of non-negative numbers; ignored.`);
      return null;
    }
    if (values.length !== 4) {
      warnings.push(`"${name}" needs four values, for ages one to four years; ignored.`);
      return null;
    }
    return values;
  }

  const deviceKeys = DEVICES.map((device) => device.key);
  const deviceKey = has('device') ? choice('device', deviceKeys, 'custom') : null;
  const device = deviceKey ? deviceByKey(deviceKey) : undefined;
  const listPrice = number(
    'device_price',
    device && device.price > 0 ? device.price : DEFAULT_LIST_PRICE,
    { min: 1 }
  );

  const carrierOffer = has('carrier_offer') ? number('carrier_offer', 0) : null;
  const brokenScreen = choice(
    'broken_screen',
    ['none', 'repair', 'defer', 'dismiss'] as const,
    'none'
  );
  const appleCare = choice('apple_care', ['none', 'monthly', 'annual', 'one'] as const, 'none');

  // upgrade_months wins when both are given; it can express schedules
  // upgrade_every cannot, like replacing the phone once at month 12.
  const everyYears = Number(choice('upgrade_every', ['1', '2', '3', '4'] as const, '4'));
  let upgradeMonths = [12, 24, 36].filter((month) => month % (everyYears * 12) === 0);
  if (params.get('upgrade_months') !== null) {
    const raw = params.get('upgrade_months')!.trim();
    const wanted = raw === '' ? [] : raw.split(',').map((part) => Number(part.trim()));
    const kept = [...new Set(wanted.filter((month) => [12, 24, 36].includes(month)))].sort(
      (a, b) => a - b
    );
    if (kept.length !== wanted.length)
      warnings.push('"upgrade_months" only accepts 12, 24 and 36; the rest were dropped.');
    upgradeMonths = kept;
  }

  const tradeInValues = numbers('trade_in_values');
  const privateSaleValues = numbers('private_sale_values');
  const tradeIns = tradeInValues ?? upgradeTradeIns(listPrice, deviceKey);

  const answers: Answers = {
    deviceKey,
    listPrice,
    tradeIn: number('trade_in', 0),
    carrierOffer,
    appleCare: appleCare as AppleCarePlan,
    screenChoice: (brokenScreen === 'none' ? null : brokenScreen) as ScreenChoice | null,
    appleCareMonthly: has('apple_care_monthly')
      ? number('apple_care_monthly', ASSUMPTIONS.appleCareMonthly)
      : undefined,
    appleCareAnnual: has('apple_care_annual')
      ? number('apple_care_annual', ASSUMPTIONS.appleCareAnnual)
      : undefined,
    appleCareOneMonthly: number('apple_care_one_monthly', ASSUMPTIONS.appleCareOneMonthly),
    screenRepairCost: number('screen_repair_cost', ASSUMPTIONS.screenRepairCost),
    appleCareRepairCost: number('apple_care_repair_cost', ASSUMPTIONS.appleCareRepairCost),
    taxRate: number('tax_rate', ASSUMPTIONS.taxRate),
    activationFee: number('activation_fee', ASSUMPTIONS.activationFee),
    caseCost: number('case_cost', ASSUMPTIONS.caseCost),
    appleCardBack: number('apple_card_back', ASSUMPTIONS.appleCardBack),
    klarnaCardBack: number('klarna_card_back', ASSUMPTIONS.klarnaCardBack),
    carrierCardBack: number('carrier_card_back', ASSUMPTIONS.carrierCardBack),
    discountRate: number('discount_rate', ASSUMPTIONS.discountRate),
    upgradeMonths,
    upgradeTradeIns: tradeIns,
    privateSaleValues
  };

  const ending = choice('ending', ['own', 'walkaway'] as const, 'own') as Ending;
  const leaseExit = choice(
    'lease_exit',
    ['best', 'return', 'buyout'] as const,
    'best'
  ) as LeaseExit;
  const finalSaleEstimate = has('final_sale_estimate')
    ? number('final_sale_estimate', 0)
    : undefined;
  if (finalSaleEstimate !== undefined && ending === 'own')
    warnings.push('"final_sale_estimate" only applies when ending=walkaway; ignored.');

  return {
    answers,
    options: { ending, leaseExit, ...(ending === 'walkaway' ? { finalSaleEstimate } : {}) },
    resolved: {
      device: deviceKey,
      device_price: listPrice,
      trade_in: answers.tradeIn ?? 0,
      carrier_offer: carrierOffer,
      apple_care: appleCare,
      broken_screen: brokenScreen,
      tax_rate: answers.taxRate!,
      upgrade_months: upgradeMonths,
      lease_exit: leaseExit,
      ending,
      trade_in_values: tradeIns,
      private_sale_values: privateSaleValues,
      klarna_card_back: answers.klarnaCardBack!
    },
    warnings,
    wantsDocs: params.get('help') !== null || [...params.keys()].length === 0
  };
}
