/**
 * The answers the Apple Upgrade page collects, in a form anything else can
 * reuse: the device list, Apple's published trade-in quotes, the cost
 * assumptions behind the defaults, and one function that turns all of it into
 * the `Inputs` the model runs on.
 *
 * The interactive page, the summary page and the calculator endpoint all read
 * from here, so a price or a trade-in quote is only ever wrong in one place.
 */

import type { AppleCarePlan, Inputs, ScreenChoice } from './model';

/**
 * Apple's US maximum trade-in offers, checked 2026-09-20:
 * https://www.apple.com/shop/browse/overlay/tradein_landing/iphone_values
 * Maximums, not quotes: a real offer depends on condition.
 */
export const TRADE_IN_DEVICES: readonly (readonly [string, number])[] = [
  ['iPhone 17 Pro Max', 885],
  ['iPhone 17 Pro', 785],
  ['iPhone Air', 585],
  ['iPhone 17', 585],
  ['iPhone 16 Pro Max', 610],
  ['iPhone 16 Pro', 510],
  ['iPhone 16 Plus', 430],
  ['iPhone 16', 430],
  ['iPhone 16e', 270],
  ['iPhone 15 Pro Max', 455],
  ['iPhone 15 Pro', 370],
  ['iPhone 15 Plus', 315],
  ['iPhone 15', 305],
  ['iPhone 14 Pro Max', 360],
  ['iPhone 14 Pro', 285],
  ['iPhone 14 Plus', 210],
  ['iPhone 14', 195],
  ['iPhone SE (3rd generation)', 75],
  ['iPhone 13 Pro Max', 320],
  ['iPhone 13 Pro', 255],
  ['iPhone 13', 175],
  ['iPhone 13 mini', 145],
  ['iPhone 12 Pro Max', 210],
  ['iPhone 12 Pro', 165],
  ['iPhone 12', 120],
  ['iPhone 12 mini', 80],
  ['iPhone SE (2nd generation)', 40],
  ['iPhone 11 Pro Max', 140],
  ['iPhone 11 Pro', 125],
  ['iPhone 11', 100],
  ['iPhone XS Max', 85],
  ['iPhone XS', 60],
  ['iPhone XR', 75],
  ['iPhone X', 50],
  ['iPhone 8 Plus', 35],
  ['Galaxy S22 Ultra 5G', 125],
  ['Galaxy S22+ 5G', 80],
  ['Galaxy S22 5G', 80],
  ['Galaxy S21 Ultra 5G', 95],
  ['Galaxy S21+ 5G', 70],
  ['Galaxy S21 5G', 55],
  ['Google Pixel 9 Pro XL', 290],
  ['Google Pixel 9 Pro', 275],
  ['Google Pixel 9', 200],
  ['Google Pixel 8 Pro', 150],
  ['Google Pixel 8', 115],
  ['Google Pixel 8a', 105],
  ['Google Pixel 7 Pro', 90],
  ['Google Pixel 7', 65],
  ['OnePlus 13', 250],
  ['OnePlus 13R', 165],
  ['Other — Recycling', 0]
] as const;

export interface Device {
  key: string;
  label: string;
  price: number;
  /** Apple's quote for this tier at one, two, three and four years old. */
  tradeIns: readonly number[] | null;
}

/**
 * September 2026 lineup; iPhone 16 is not eligible for Apple Upgrade.
 * Age proxies: 17/16/15/14 of the same tier; Air uses regular 16/15/14 for
 * older ages. Duo has no older generations, so it borrows the Pro Max
 * percentages, like a custom price does. These estimate future offers, not
 * private-sale proceeds or guaranteed quotes.
 */
export const DEVICES: readonly Device[] = [
  { key: 'iphone-17', label: 'iPhone 17', price: 899, tradeIns: [585, 430, 305, 195] },
  { key: 'iphone-air', label: 'iPhone Air', price: 1099, tradeIns: [585, 430, 305, 195] },
  { key: 'iphone-18-pro', label: 'iPhone 18 Pro', price: 1199, tradeIns: [785, 510, 370, 285] },
  {
    key: 'iphone-18-pro-max',
    label: 'iPhone 18 Pro Max',
    price: 1299,
    tradeIns: [885, 610, 455, 360]
  },
  { key: 'iphone-duo', label: 'iPhone Duo', price: 1999, tradeIns: null },
  { key: 'custom', label: 'Something else', price: 0, tradeIns: null }
];

/** The tier a device with no trade-in history of its own borrows from. */
const FALLBACK_DEVICE = 'iphone-18-pro-max';

/** Every cost assumption behind the defaults, all of them overridable. */
export interface CostAssumptions {
  appleCareMonthly: number;
  appleCareOneMonthly: number;
  appleCareAnnual: number;
  screenRepairCost: number;
  appleCareRepairCost: number;
  taxRate: number;
  activationFee: number;
  caseCost: number;
  appleCardBack: number;
  klarnaCardBack: number;
  carrierCardBack: number;
  discountRate: number;
  carrierTerm: number;
}

/** What the calculator assumes when the caller does not say otherwise. */
export const ASSUMPTIONS: CostAssumptions = {
  appleCareMonthly: 13.49,
  appleCareOneMonthly: 19.99,
  appleCareAnnual: 149,
  screenRepairCost: 250,
  appleCareRepairCost: 29,
  taxRate: 8.5,
  activationFee: 35,
  caseCost: 59,
  appleCardBack: 3,
  klarnaCardBack: 3,
  carrierCardBack: 2,
  discountRate: 4,
  /** Carrier installments are effectively always 36 months now. */
  carrierTerm: 36
};

export const DEFAULT_LIST_PRICE = 1199;
export const DEFAULT_TRADE_IN = 375;
export const DEFAULT_CARRIER_OFFER = 1000;

export function deviceByKey(key: string | null | undefined): Device | undefined {
  return DEVICES.find((device) => device.key === key);
}

/** AppleCare is priced per device; the Duo costs more to cover. */
export function carePrices(deviceKey: string | null | undefined) {
  return deviceKey === 'iphone-duo'
    ? { appleCareMonthly: 19.99, appleCareAnnual: 199.99 }
    : {
        appleCareMonthly: ASSUMPTIONS.appleCareMonthly,
        appleCareAnnual: ASSUMPTIONS.appleCareAnnual
      };
}

/**
 * Apple's quotes expressed as a share of the phone's own list price, so a
 * custom price gets a plausible curve instead of another model's dollars.
 */
export function tradeInRates(deviceKey: string | null | undefined): number[] {
  const device =
    DEVICES.find((candidate) => candidate.key === deviceKey && candidate.tradeIns !== null) ??
    deviceByKey(FALLBACK_DEVICE)!;
  return device.tradeIns!.map((value) => value / device.price);
}

/** Expected Apple trade-in offer for this phone at one through four years old. */
export function upgradeTradeIns(listPrice: number, deviceKey: string | null | undefined): number[] {
  return tradeInRates(deviceKey).map((rate) => Math.round(listPrice * rate));
}

/** Everything a caller has to decide. The rest comes from `ASSUMPTIONS`. */
export interface Answers extends Partial<CostAssumptions> {
  listPrice: number;
  /** Apple Trade In credit against this purchase. 0 means no trade-in. */
  tradeIn?: number;
  /** The whole carrier promotion, including the trade-in. Null means none. */
  carrierOffer?: number | null;
  appleCare?: AppleCarePlan;
  screenChoice?: ScreenChoice | null;
  /** Months at which every path replaces the phone. Empty means never. */
  upgradeMonths?: number[];
  leaseUpgradeChoices?: Record<string, 'return' | 'buyout'>;
  /** Apple trade-in estimates by age in years. Defaults to the device curve. */
  upgradeTradeIns?: number[];
  /** Opt in to selling owned phones yourself, net of fees and shipping. */
  privateSaleValues?: number[] | null;
  deviceKey?: string | null;
}

/**
 * The one place answers become model inputs. `term` and `endChoice` are
 * placeholders: with `upgradeMonths` set, the model runs both lease terms off
 * the shared schedule and ignores the single-lease fields.
 */
export function buildInputs(answers: Answers): Inputs {
  const tradeIns = answers.upgradeTradeIns ?? upgradeTradeIns(answers.listPrice, answers.deviceKey);
  return {
    ...ASSUMPTIONS,
    ...carePrices(answers.deviceKey),
    listPrice: answers.listPrice,
    tradeIn: answers.tradeIn ?? 0,
    term: 12,
    endChoice: 'nothing',
    appleCare: answers.appleCare ?? 'none',
    screenChoice: answers.screenChoice ?? null,
    appleCareMonthly: answers.appleCareMonthly ?? carePrices(answers.deviceKey).appleCareMonthly,
    appleCareOneMonthly: answers.appleCareOneMonthly ?? ASSUMPTIONS.appleCareOneMonthly,
    appleCareAnnual: answers.appleCareAnnual ?? carePrices(answers.deviceKey).appleCareAnnual,
    screenRepairCost: answers.screenRepairCost ?? ASSUMPTIONS.screenRepairCost,
    appleCareRepairCost: answers.appleCareRepairCost ?? ASSUMPTIONS.appleCareRepairCost,
    taxRate: answers.taxRate ?? ASSUMPTIONS.taxRate,
    activationFee: answers.activationFee ?? ASSUMPTIONS.activationFee,
    caseCost: answers.caseCost ?? ASSUMPTIONS.caseCost,
    appleCardBack: answers.appleCardBack ?? ASSUMPTIONS.appleCardBack,
    klarnaCardBack: answers.klarnaCardBack ?? ASSUMPTIONS.klarnaCardBack,
    carrierCardBack: answers.carrierCardBack ?? ASSUMPTIONS.carrierCardBack,
    discountRate: answers.discountRate ?? ASSUMPTIONS.discountRate,
    carrierTerm: answers.carrierTerm ?? ASSUMPTIONS.carrierTerm,
    resaleAtTerm: tradeIns[1],
    resaleAtHorizon: tradeIns[3],
    upgradeTradeIns: tradeIns,
    privateSaleValues: answers.privateSaleValues ?? undefined,
    leaseUpgradeChoices: answers.leaseUpgradeChoices ?? {},
    carrierOffer: answers.carrierOffer ?? null,
    upgradeMonths: answers.upgradeMonths ?? []
  };
}
