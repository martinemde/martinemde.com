/**
 * The money math behind /trillion.
 *
 * Everything here is pure so the page can stay a thin layer of state on top of
 * it, and so the formatting rules (which do most of the emotional work on that
 * page) can be pinned down in tests.
 */

/** The pile you start with. One trillion dollars, exactly. */
export const FORTUNE = 1_000_000_000_000;

/** The hero grid is 1,000 squares, so each square is a billion dollars. */
export const BLOCKS = 1000;
export const BLOCK_VALUE = FORTUNE / BLOCKS;

export interface Source {
  label: string;
  url: string;
}

export interface Item {
  id: string;
  label: string;
  /** One-time price, or the price of a single year when `per` is 'year'. */
  cost: number;
  per?: 'year';
  /** Ceiling on the stepper for recurring items. Ignored for one-time items. */
  maxUnits?: number;
  /** Where the number comes from, in one sentence. */
  note: string;
  sources: Source[];
}

export interface Tier {
  id: string;
  title: string;
  kicker: string;
  lede: string;
  items: Item[];
}

/** id -> units funded. Missing or 0 means unfunded; one-time items max out at 1. */
export type Funded = Record<string, number>;

export interface Allocation {
  item: Item;
  tierId: string;
  units: number;
  amount: number;
}

/** How many times you can buy a thing. One-time items are one-and-done. */
export function maxUnits(item: Item): number {
  return item.per ? (item.maxUnits ?? 10) : 1;
}

export function itemTotal(item: Item, units: number): number {
  return item.cost * clampUnits(item, units);
}

export function clampUnits(item: Item, units: number): number {
  if (!Number.isFinite(units) || units <= 0) return 0;
  return Math.min(Math.floor(units), maxUnits(item));
}

/**
 * Walks the tiers in page order so the ledger — and the colors in the grid —
 * read top to bottom the way the page does.
 */
export function allocations(tiers: Tier[], funded: Funded): Allocation[] {
  const out: Allocation[] = [];
  for (const tier of tiers) {
    for (const item of tier.items) {
      const units = clampUnits(item, funded[item.id] ?? 0);
      if (units > 0) {
        out.push({ item, tierId: tier.id, units, amount: item.cost * units });
      }
    }
  }
  return out;
}

export function totalSpent(tiers: Tier[], funded: Funded): number {
  return allocations(tiers, funded).reduce((sum, a) => sum + a.amount, 0);
}

export function remaining(tiers: Tier[], funded: Funded): number {
  return FORTUNE - totalSpent(tiers, funded);
}

/**
 * Paints the 1,000-square grid. Squares are handed out in ledger order, which
 * means anything under a billion dollars can fail to color a single square —
 * that is the point of the grid, not a rounding bug.
 */
export function blockOwners(allocs: Allocation[]): (string | null)[] {
  const owners: (string | null)[] = new Array(BLOCKS).fill(null);
  let spent = 0;
  for (const alloc of allocs) {
    const start = Math.floor(spent / BLOCK_VALUE);
    spent += alloc.amount;
    const end = Math.min(Math.floor(spent / BLOCK_VALUE), BLOCKS);
    for (let i = Math.max(start, 0); i < end; i++) owners[i] = alloc.tierId;
  }
  return owners;
}

/** Rounds to a sensible number of digits for its size: 228, 6.9, 0.45. */
function trim(value: number): string {
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return Number(value.toFixed(digits)).toString();
}

/** Headline money: $450M, $6.9B, $1.87T. */
export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 1e12) return `${sign}$${trim(abs / 1e12)}T`;
  if (abs >= 1e9) return `${sign}$${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}$${trim(abs / 1e6)}M`;
  return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
}

/** Every digit, for the counter at the top: $941,300,000,000. */
export function formatExact(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${Math.round(Math.abs(amount)).toLocaleString('en-US')}`;
}

/**
 * Share of the fortune. Keeps two decimals under 1% because "0.04%" is the
 * joke — collapsing it to "0%" would throw the punchline away.
 */
export function formatShare(amount: number): string {
  const pct = (amount / FORTUNE) * 100;
  if (pct <= 0) return '0%';
  if (pct < 0.01) return '<0.01%';
  if (pct < 1) return `${pct.toFixed(2)}%`;
  if (pct < 10) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

/** 0-1, clamped, for progress bars. */
export function spentFraction(spent: number): number {
  return Math.max(0, Math.min(1, spent / FORTUNE));
}

/** What a purchase costs relative to what you have left. */
export function shortfall(cost: number, left: number): number {
  return Math.max(0, cost - left);
}

export function canAfford(cost: number, left: number): boolean {
  return cost <= left;
}

/** Everything you funded, cheapest last — the receipt reads better big-first. */
export function receipt(allocs: Allocation[]): Allocation[] {
  return [...allocs].sort((a, b) => b.amount - a.amount);
}
