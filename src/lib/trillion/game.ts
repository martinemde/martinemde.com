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
 * The hero grid is always 1,000 squares. At the starting bankroll each square
 * is a billion dollars; unlock a bigger bankroll and the squares get bigger
 * rather than more numerous, which is its own comment on the numbers.
 */
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
  /** The same headcount as a number, for the money-back-each math. */
  count: number;
  /** Reads after "give": "Elon", "each of America's 989 billionaires". */
  each: string;
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

/** What one square is worth at a given bankroll. */
export function blockValue(pot: number): number {
  return pot / BLOCKS;
}

/**
 * Paints the 1,000-square grid. Squares are handed out in ledger order, which
 * means anything under one square's worth can fail to color a single square —
 * that is the point of the grid, not a rounding bug.
 */
export function blockOwners(allocs: Allocation[], pot: number = FORTUNE): (string | null)[] {
  const owners: (string | null)[] = new Array(BLOCKS).fill(null);
  const per = blockValue(pot);
  let spent = 0;
  for (const alloc of allocs) {
    const start = Math.floor(spent / per);
    spent += alloc.amount;
    const end = Math.min(Math.floor(spent / per), BLOCKS);
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
 * The cheapest rung that can hold `total`, counting from the bottom. A shared
 * ledger arrives as a pile of numbers with no history, so this works out which
 * bankroll the sender must have had open.
 */
export function rungForTotal(bankrolls: Bankroll[], total: number): number {
  for (let i = 0; i < bankrolls.length; i++) {
    if (bankrolls[i].unlimited || bankrolls[i].amount >= total) return i;
  }
  return bankrolls.length - 1;
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

/**
 * What is left over, split back among the people it was taken from. The whole
 * point of the line it feeds: after buying every fix on the list, everybody you
 * billed can still be handed a fortune back.
 */
export function refund(left: number, count: number): number {
  if (left <= 0 || count <= 0) return 0;
  return left / count;
}

/**
 * A ledger as a query string: `painting,homeless:5,nfl`. Ids are written in
 * catalog order so the same spending always produces the same link, and years
 * are only spelled out when there is more than one.
 */
export function encodeSpend(items: Item[], funded: Funded): string {
  return items
    .map((item) => ({ item, units: clampUnits(item, funded[item.id] ?? 0) }))
    .filter(({ units }) => units > 0)
    .map(({ item, units }) => (units > 1 ? `${item.id}:${units}` : item.id))
    .join(',');
}

/**
 * The other direction. Anything that is not a live item id is dropped, so an
 * old link keeps working after the catalog changes instead of erroring.
 */
export function decodeSpend(items: Item[], code: string | null | undefined): Funded {
  if (!code) return {};
  const byId = new Map(items.map((item) => [item.id, item]));
  const funded: Funded = {};
  for (const part of code.split(',')) {
    const [id, years] = part.split(':');
    const item = byId.get(id);
    if (!item) continue;
    const units = clampUnits(item, years === undefined ? 1 : Number(years));
    if (units > 0) funded[item.id] = units;
  }
  return funded;
}

export interface ShareArgs {
  ledger: Allocation[];
  spent: number;
  pot: number;
  left: number;
  url: string;
  /** Lines to print before the rest get collapsed into a count. */
  limit?: number;
}

/**
 * The receipt as something you can paste anywhere. Long ledgers get truncated
 * rather than pasted in full: the top few lines are the priorities, which is
 * the part worth sharing.
 */
export function shareText({ ledger, spent, pot, left, url, limit = 6 }: ShareArgs): string {
  if (ledger.length === 0) {
    return `A trillion dollars to give away and I haven't spent a cent of it.\n\n${url}`;
  }

  const lines = ledger
    .slice(0, limit)
    .map(
      (alloc) =>
        `${formatMoney(alloc.amount)} · ${alloc.item.label}${
          alloc.units > 1 ? ` × ${alloc.units} years` : ''
        }`
    );
  const rest = ledger.length - lines.length;
  if (rest > 0) lines.push(`…and ${rest} more`);

  const tail =
    left >= 0
      ? `${formatMoney(left)} still in the pile.`
      : `Overdrawn by ${formatMoney(-left)} — that money does not exist.`;

  return `I gave away ${formatMoney(spent)} of ${formatMoney(pot)}:\n\n${lines.join(
    '\n'
  )}\n\n${tail}\n\nSpend yours: ${url}`;
}
