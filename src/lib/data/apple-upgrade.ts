/**
 * Device catalog and lease-pricing model for the Apple Upgrade calculator.
 *
 * Prices are prefilled from apple.com and are editable on the page — treat them
 * as a starting point, not gospel. The lease ratios below are reverse-engineered
 * from the payment examples Apple publishes in the Apple Upgrade footnotes; see
 * `src/lib/utils/apple-upgrade.ts` for the derivation and its tests.
 */

export type Category = 'iphone' | 'watch' | 'ipad' | 'mac';

export type Term = 12 | 24 | 36;

export interface DeviceConfig {
  /** Storage tier or size variant, e.g. "256GB" or "46mm Cellular" */
  label: string;
  price: number;
  /**
   * Payments Apple actually quotes for this exact configuration, by term.
   * Preferred over the estimate whenever it exists — see LEASE_RATIOS for why
   * the estimate can't be trusted to the cent.
   */
  quoted?: Partial<Record<Term, number>>;
}

export interface Device {
  id: string;
  name: string;
  category: Category;
  configs: DeviceConfig[];
}

export const CATEGORY_LABELS: Record<Category, string> = {
  iphone: 'iPhone',
  watch: 'Apple Watch',
  ipad: 'iPad',
  mac: 'Mac'
};

/** Lease terms Apple offers per product family. */
export const CATEGORY_TERMS: Record<Category, Term[]> = {
  iphone: [12, 24],
  watch: [12, 24],
  ipad: [24, 36],
  mac: [24, 36]
};

/**
 * Total lease payments as a fraction of list price, by family and term. Used
 * only when a configuration has no `quoted` payment.
 *
 * This is a fitted approximation, not Apple's formula. Real quotes for the same
 * phone and term sit at slightly different ratios — 69.86% for a $1099 iPhone 17
 * Pro against 70.03–70.05% across the three iPhone 17 Pro Max tiers — so no
 * single percentage reproduces them all. The best flat fit lands within about a
 * nickel for 24-month terms and a dime for 12-month ones, which is close enough
 * to reason about and not close enough to quote. The shape is what matters: a
 * 12-month iPhone lease costs about half the phone, 24 months costs about 70%,
 * and you own nothing either way.
 */
export const LEASE_RATIOS: Record<Category, Partial<Record<Term, number>>> = {
  iphone: { 12: 0.50124, 24: 0.69967 },
  watch: { 12: 0.66135, 24: 0.7212 },
  ipad: { 24: 0.6986, 36: 0.81874 },
  mac: { 24: 0.64822, 36: 0.70221 }
};

/**
 * Default AppleCare pricing per family, in dollars.
 *
 * `monthly` is AppleCare+ with Theft and Loss where it exists. `annual` is the
 * yearly plan, which bills a year at a time and renews — not a one-time prepay
 * covering the whole lease. All of these are starting estimates, editable on the
 * page, because Apple's prices move and vary by model.
 */
export interface CarePricing {
  monthly: number;
  /** Billed once a year, every year you keep coverage. */
  annual: number;
  deductible: number;
}

export const CARE_PRICING: Record<Category, CarePricing> = {
  iphone: { monthly: 13.49, annual: 149, deductible: 99 },
  watch: { monthly: 5.99, annual: 59, deductible: 69 },
  ipad: { monthly: 7.99, annual: 79, deductible: 49 },
  mac: { monthly: 14.99, annual: 149, deductible: 99 }
};

/** AppleCare One covers up to three devices for one monthly price. */
export const APPLECARE_ONE_MONTHLY = 19.99;

/** Typical out-of-warranty repair costs, used as the default damage fee. */
export const DEFAULT_DAMAGE_FEE: Record<Category, number> = {
  iphone: 379,
  watch: 299,
  ipad: 449,
  mac: 599
};

/**
 * Resale value after the initial lease term, as a fraction of list price.
 * Applied geometrically for longer holds — 50% at 24 months means 25% at 48.
 */
export const DEFAULT_RESALE_PCT: Record<Category, number> = {
  iphone: 0.5,
  watch: 0.35,
  ipad: 0.45,
  mac: 0.55
};

export const DEVICES: Device[] = [
  {
    id: 'iphone-17',
    name: 'iPhone 17',
    category: 'iphone',
    configs: [
      { label: '256GB', price: 799 },
      { label: '512GB', price: 999 }
    ]
  },
  {
    id: 'iphone-air',
    name: 'iPhone Air',
    category: 'iphone',
    configs: [
      { label: '256GB', price: 999 },
      { label: '512GB', price: 1199 },
      { label: '1TB', price: 1399 }
    ]
  },
  {
    id: 'iphone-17-pro',
    name: 'iPhone 17 Pro',
    category: 'iphone',
    configs: [
      { label: '256GB', price: 1099, quoted: { 12: 45.99, 24: 31.99 } },
      { label: '512GB', price: 1299 },
      { label: '1TB', price: 1499 }
    ]
  },
  {
    id: 'iphone-17-pro-max',
    name: 'iPhone 17 Pro Max',
    category: 'iphone',
    configs: [
      { label: '256GB', price: 1199, quoted: { 12: 49.99, 24: 34.99 } },
      { label: '512GB', price: 1399, quoted: { 24: 40.82 } },
      { label: '1TB', price: 1599, quoted: { 24: 46.67 } },
      { label: '2TB', price: 1999 }
    ]
  },
  {
    id: 'watch-series-11',
    name: 'Apple Watch Series 11',
    category: 'watch',
    configs: [
      { label: '42mm GPS', price: 399, quoted: { 12: 21.99, 24: 11.99 } },
      { label: '46mm GPS', price: 429 },
      { label: '42mm Cellular', price: 499 },
      { label: '46mm Cellular', price: 529 }
    ]
  },
  {
    id: 'watch-ultra-3',
    name: 'Apple Watch Ultra 3',
    category: 'watch',
    configs: [{ label: '49mm', price: 799 }]
  },
  {
    id: 'ipad-pro-11',
    name: 'iPad Pro 11"',
    category: 'ipad',
    configs: [
      { label: '256GB', price: 999 },
      { label: '512GB', price: 1199 },
      { label: '1TB', price: 1599 }
    ]
  },
  {
    id: 'ipad-pro-13',
    name: 'iPad Pro 13"',
    category: 'ipad',
    configs: [
      { label: '256GB', price: 1299 },
      { label: '512GB', price: 1499 },
      { label: '1TB', price: 1899 }
    ]
  },
  {
    id: 'ipad-air-11',
    name: 'iPad Air 11"',
    category: 'ipad',
    configs: [
      { label: '128GB', price: 599 },
      { label: '256GB', price: 699 },
      { label: '512GB', price: 899 }
    ]
  },
  {
    id: 'ipad-mini',
    name: 'iPad mini',
    category: 'ipad',
    configs: [
      { label: '128GB', price: 499 },
      { label: '256GB', price: 599 }
    ]
  },
  {
    id: 'macbook-air-13',
    name: 'MacBook Air 13"',
    category: 'mac',
    configs: [
      { label: '16GB / 256GB', price: 999 },
      { label: '16GB / 512GB', price: 1199 },
      { label: '24GB / 512GB', price: 1399 }
    ]
  },
  {
    id: 'macbook-air-15',
    name: 'MacBook Air 15"',
    category: 'mac',
    configs: [
      { label: '16GB / 256GB', price: 1199 },
      { label: '16GB / 512GB', price: 1399 }
    ]
  },
  {
    id: 'macbook-pro-14',
    name: 'MacBook Pro 14"',
    category: 'mac',
    configs: [
      { label: '16GB / 512GB', price: 1599 },
      { label: '24GB / 512GB', price: 1999 },
      { label: '24GB / 1TB', price: 2199 }
    ]
  },
  {
    id: 'macbook-pro-16',
    name: 'MacBook Pro 16"',
    category: 'mac',
    configs: [
      { label: '24GB / 512GB', price: 2499 },
      { label: '36GB / 1TB', price: 2899 }
    ]
  },
  {
    id: 'imac',
    name: 'iMac',
    category: 'mac',
    configs: [
      { label: '16GB / 256GB', price: 1299 },
      { label: '16GB / 512GB', price: 1499 }
    ]
  },
  {
    id: 'mac-studio',
    name: 'Mac Studio',
    category: 'mac',
    configs: [
      { label: 'M4 Max', price: 1999 },
      { label: 'M3 Ultra', price: 3999 }
    ]
  }
];

export function devicesInCategory(category: Category): Device[] {
  return DEVICES.filter((d) => d.category === category);
}

export function findDevice(id: string): Device | undefined {
  return DEVICES.find((d) => d.id === id);
}
