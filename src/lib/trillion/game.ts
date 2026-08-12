/**
 * The money math behind /trillion.
 *
 * Everything here is pure so the page can stay a thin layer of state on top of
 * it, and so the formatting rules (which do most of the emotional work on that
 * page) can be pinned down in tests.
 */

/** The pile you start with. One trillion dollars, exactly. */
export const FORTUNE = 1_000_000_000_000;

/**
 * A square is a billion dollars and stays a billion dollars. Take a bigger
 * bankroll and the grid grows squares rather than rescaling the ones already
 * on the board, so Musk's trillion is still the same thousand squares it was
 * when it was the whole game.
 */
export const BLOCK_VALUE = 1_000_000_000;
export const BLOCKS = FORTUNE / BLOCK_VALUE;

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

/**
 * Whose money you are spending. Amounts are totals, not additive — the ten
 * richest people's $2.6T already contains Musk's share of it.
 */
export interface Bankroll {
  id: string;
  /** Full name for the modal: "the ten richest people on Earth". */
  label: string;
  /** Short name for the wallet bar: "the top 10". */
  short: string;
  /** How many people are being emptied out. */
  people: string;
  /**
   * The modal headline when this bankroll runs dry. Written out per rung rather
   * than assembled, because "the top 10 has" and "US billionaires's money" is
   * what you get from gluing a possessive onto a label.
   */
  exhausted: string;
  amount: number;
  note: string;
  sources: Source[];
  /**
   * The last rung. Spending past it is allowed and the balance goes negative;
   * `amount` still sets the grid's scale so the squares stop growing.
   */
  unlimited?: boolean;
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

/** How many squares a pile of money is worth. */
export function blockCount(pot: number): number {
  return Math.max(0, Math.round(pot / BLOCK_VALUE));
}

/**
 * Paints `count` squares. Squares are handed out in ledger order, which means
 * anything under a billion dollars can fail to color a single square — that is
 * the point of the grid, not a rounding bug.
 */
export function blockOwners(allocs: Allocation[], count: number = BLOCKS): (string | null)[] {
  const owners: (string | null)[] = new Array(Math.max(0, count)).fill(null);
  let spent = 0;
  for (const alloc of allocs) {
    const start = Math.floor(spent / BLOCK_VALUE);
    spent += alloc.amount;
    const end = Math.min(Math.floor(spent / BLOCK_VALUE), owners.length);
    for (let i = Math.max(start, 0); i < end; i++) owners[i] = alloc.tierId;
  }
  return owners;
}

/** A run of squares in the grid and whose money put them there. */
export interface Band {
  /** Bankroll id, or 'red' for the squares nobody is paying for. */
  id: string;
  label: string;
  /** Index into the owners array where this band starts. */
  start: number;
  count: number;
}

/**
 * Splits the grid by whose money it is: Musk's original thousand squares, then
 * one band per bankroll taken after that, then the invented money if you have
 * overdrawn. The rules drawn between bands are the whole reason this exists —
 * without them the trillion you started with disappears into the wall.
 */
export function bands(bankrolls: Bankroll[], level: number, total: number): Band[] {
  const out: Band[] = [];
  let start = 0;
  for (let i = 0; i <= Math.min(level, bankrolls.length - 1); i++) {
    const end = blockCount(bankrolls[i].amount);
    // The last rung is the same money as the one below it — it only lifts the
    // ceiling — so it contributes no band of its own.
    if (end <= start) continue;
    out.push({ id: bankrolls[i].id, label: bankrolls[i].short, start, count: end - start });
    start = end;
  }
  if (total > start) {
    out.push({ id: 'red', label: 'money that does not exist', start, count: total - start });
  }
  return out;
}

/**
 * How many columns to lay the grid out in. The grid is width-bound, so height
 * only grows if the columns grow slower than the squares do. At this exponent
 * twenty times the money is a grid a bit under twice as tall — big enough to
 * feel it, short enough to stay on a screen. The rules between bands do the
 * rest of the work of showing the ratio.
 */
export function gridColumns(base: number, count: number): number {
  return Math.max(base, Math.round(base * Math.pow(Math.max(count, BLOCKS) / BLOCKS, 0.4)));
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
 * Share of whatever bankroll is open. Keeps two decimals under 1% because
 * "0.04%" is the joke — collapsing it to "0%" would throw the punchline away.
 */
export function formatShare(amount: number, total: number = FORTUNE): string {
  const pct = (amount / total) * 100;
  if (pct <= 0) return '0%';
  if (pct < 0.01) return '<0.01%';
  if (pct < 1) return `${pct.toFixed(2)}%`;
  if (pct < 10) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

/** 0-1, clamped, for progress bars. */
export function spentFraction(spent: number, total: number = FORTUNE): number {
  return Math.max(0, Math.min(1, spent / total));
}

/** What a purchase costs relative to what you have left. */
export function shortfall(cost: number, left: number): number {
  return Math.max(0, cost - left);
}

export function canAfford(cost: number, left: number, unlimited = false): boolean {
  return unlimited || cost <= left;
}

/** The open bankroll, clamped so a stale saved level can't run off the end. */
export function bankrollAt(bankrolls: Bankroll[], level: number): Bankroll {
  return bankrolls[Math.max(0, Math.min(Math.floor(level) || 0, bankrolls.length - 1))];
}

/** The next rung up, or undefined once you are on the last one. */
export function nextBankroll(bankrolls: Bankroll[], level: number): Bankroll | undefined {
  return bankrolls[level + 1];
}

/**
 * The lowest rung that actually covers `needed` (total committed after the
 * purchase), or the last rung if nothing does. Offering merely the next rung up
 * would let you accept an upgrade and still land in the red — buying a $5.3T
 * item at the $1T pot has to jump straight to a bankroll that can hold it.
 */
export function rungFor(bankrolls: Bankroll[], level: number, needed: number): number {
  for (let i = level + 1; i < bankrolls.length; i++) {
    if (bankrolls[i].unlimited || bankrolls[i].amount >= needed) return i;
  }
  return bankrolls.length - 1;
}

/**
 * Whether funding this needs a bigger bankroll before it can go through. On the
 * last rung nothing is blocked — you just go into the red.
 */
export function needsUpgrade(
  cost: number,
  left: number,
  bankrolls: Bankroll[],
  level: number
): boolean {
  const current = bankrollAt(bankrolls, level);
  if (current.unlimited) return false;
  return cost > left && nextBankroll(bankrolls, level) !== undefined;
}

/** How far past the bankroll you have spent. Zero until you actually overdraw. */
export function overdraft(spent: number, pot: number): number {
  return Math.max(0, spent - pot);
}

/** Everything you funded, cheapest last — the receipt reads better big-first. */
export function receipt(allocs: Allocation[]): Allocation[] {
  return [...allocs].sort((a, b) => b.amount - a.amount);
}
