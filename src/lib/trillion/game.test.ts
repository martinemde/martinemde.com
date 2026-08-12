import { describe, it, expect } from 'vitest';
import {
  BLOCKS,
  FORTUNE,
  allocations,
  bankrollAt,
  blockOwners,
  blockValue,
  canAfford,
  clampUnits,
  formatExact,
  formatMoney,
  formatShare,
  itemTotal,
  maxUnits,
  needsUpgrade,
  nextBankroll,
  overdraft,
  rungFor,
  receipt,
  remaining,
  shortfall,
  spentFraction,
  totalSpent,
  type Bankroll,
  type Item,
  type Tier
} from './game';
import { allItems, bankrolls, tiers } from './items';

const oneTime: Item = {
  id: 'one',
  label: 'One time',
  cost: 10_000_000_000,
  note: '',
  sources: []
};

const yearly: Item = {
  id: 'yearly',
  label: 'Yearly',
  cost: 5_000_000_000,
  per: 'year',
  maxUnits: 4,
  note: '',
  sources: []
};

const testTiers: Tier[] = [
  { id: 'a', title: 'A', kicker: '', lede: '', items: [oneTime] },
  { id: 'b', title: 'B', kicker: '', lede: '', items: [yearly] }
];

describe('units', () => {
  it('caps one-time items at a single purchase', () => {
    expect(maxUnits(oneTime)).toBe(1);
    expect(clampUnits(oneTime, 7)).toBe(1);
  });

  it('caps recurring items at their maxUnits', () => {
    expect(maxUnits(yearly)).toBe(4);
    expect(clampUnits(yearly, 9)).toBe(4);
    expect(clampUnits(yearly, 3)).toBe(3);
  });

  it('treats missing, zero and nonsense units as unfunded', () => {
    expect(clampUnits(yearly, 0)).toBe(0);
    expect(clampUnits(yearly, -2)).toBe(0);
    expect(clampUnits(yearly, NaN)).toBe(0);
  });

  it('multiplies recurring costs by years', () => {
    expect(itemTotal(yearly, 3)).toBe(15_000_000_000);
    expect(itemTotal(oneTime, 3)).toBe(10_000_000_000);
  });
});

describe('spending', () => {
  it('starts with the whole fortune unspent', () => {
    expect(totalSpent(testTiers, {})).toBe(0);
    expect(remaining(testTiers, {})).toBe(FORTUNE);
  });

  it('adds up funded items across tiers', () => {
    const funded = { one: 1, yearly: 2 };
    expect(totalSpent(testTiers, funded)).toBe(20_000_000_000);
    expect(remaining(testTiers, funded)).toBe(FORTUNE - 20_000_000_000);
  });

  it('ignores ids that are not on the board', () => {
    expect(totalSpent(testTiers, { ghost: 5 })).toBe(0);
  });

  it('lists allocations in page order', () => {
    const allocs = allocations(testTiers, { one: 1, yearly: 1 });
    expect(allocs.map((a) => a.item.id)).toEqual(['one', 'yearly']);
    expect(allocs[1].tierId).toBe('b');
  });

  it('sorts the receipt biggest first', () => {
    const allocs = allocations(testTiers, { one: 1, yearly: 4 });
    expect(receipt(allocs).map((a) => a.item.id)).toEqual(['yearly', 'one']);
  });
});

describe('affordability', () => {
  it('knows what fits in what is left', () => {
    expect(canAfford(100, 100)).toBe(true);
    expect(canAfford(101, 100)).toBe(false);
  });

  it('lets the last bankroll buy anything at all', () => {
    expect(canAfford(1e15, 100, true)).toBe(true);
  });

  it('reports how far short you are, never negative', () => {
    expect(shortfall(1_866_000_000_000, FORTUNE)).toBe(866_000_000_000);
    expect(shortfall(10, 100)).toBe(0);
  });
});

describe('bankrolls', () => {
  const ladder: Bankroll[] = [
    {
      id: 'a',
      label: 'A',
      short: 'A',
      people: '1',
      exhausted: 'x',
      amount: 100,
      note: '',
      sources: []
    },
    {
      id: 'b',
      label: 'B',
      short: 'B',
      people: '2',
      exhausted: 'x',
      amount: 500,
      note: '',
      sources: []
    },
    {
      id: 'red',
      label: 'red',
      short: 'red',
      people: 'nobody',
      exhausted: 'x',
      amount: 500,
      unlimited: true,
      note: '',
      sources: []
    }
  ];

  it('walks up the ladder and stops at the top', () => {
    expect(bankrollAt(ladder, 0).id).toBe('a');
    expect(nextBankroll(ladder, 0)?.id).toBe('b');
    expect(nextBankroll(ladder, 2)).toBeUndefined();
  });

  it('clamps a saved level that no longer exists', () => {
    expect(bankrollAt(ladder, 99).id).toBe('red');
    expect(bankrollAt(ladder, -3).id).toBe('a');
    expect(bankrollAt(ladder, NaN).id).toBe('a');
  });

  it('asks for an upgrade only when one exists and the money does not', () => {
    expect(needsUpgrade(50, 100, ladder, 0)).toBe(false); // affordable
    expect(needsUpgrade(150, 100, ladder, 0)).toBe(true); // too big, rung above
    expect(needsUpgrade(1e9, 100, ladder, 2)).toBe(false); // last rung: just go red
  });

  it('offers the lowest rung that actually covers the purchase', () => {
    expect(rungFor(ladder, 0, 90)).toBe(1); // fits in B
    expect(rungFor(ladder, 0, 400)).toBe(1); // still fits in B
    expect(rungFor(ladder, 0, 900)).toBe(2); // nothing covers it: the red
    expect(rungFor(ladder, 1, 900)).toBe(2);
  });

  it('never lands you in the red by accepting a survivable offer', () => {
    // Accepting an offer for a purchase a real rung can hold must leave >= 0.
    for (const needed of [50, 120, 300, 500]) {
      const rung = ladder[rungFor(ladder, 0, needed)];
      expect(rung.unlimited || rung.amount >= needed).toBe(true);
    }
  });

  it('reports the overdraft only once you are past the pot', () => {
    expect(overdraft(400, 500)).toBe(0);
    expect(overdraft(500, 500)).toBe(0);
    expect(overdraft(700, 500)).toBe(200);
  });

  it('ships a ladder that climbs, ending somewhere nobody can be billed', () => {
    expect(bankrolls[0].amount).toBe(FORTUNE);
    const amounts = bankrolls.map((b) => b.amount);
    for (let i = 1; i < amounts.length; i++)
      expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i - 1]);
    expect(bankrolls.at(-1)?.unlimited).toBe(true);
    for (const b of bankrolls) {
      expect(b.sources.length, `${b.id} has no source`).toBeGreaterThan(0);
      expect(b.note.length, `${b.id} has no note`).toBeGreaterThan(20);
      expect(b.exhausted.length, `${b.id} has no out-of-money line`).toBeGreaterThan(10);
    }
  });

  it('cannot buy the whole catalog even with every billionaire on Earth', () => {
    const everything = Object.fromEntries(allItems.map((item) => [item.id, maxUnits(item)]));
    const richest = bankrolls.filter((b) => !b.unlimited).at(-1)!;
    expect(totalSpent(tiers, everything)).toBeGreaterThan(richest.amount);
  });
});

describe('the block grid', () => {
  it('has one square per billion dollars', () => {
    expect(BLOCKS).toBe(1000);
    expect(blockOwners([])).toHaveLength(BLOCKS);
    expect(blockOwners([]).every((owner) => owner === null)).toBe(true);
  });

  it('rescales the squares to the open bankroll', () => {
    expect(blockValue(FORTUNE)).toBe(1_000_000_000);
    expect(blockValue(20_100_000_000_000)).toBe(20_100_000_000);
    // The same purchase fills fewer squares once a bigger bankroll is open.
    const allocs = allocations(testTiers, { one: 1 });
    expect(blockOwners(allocs, FORTUNE).filter(Boolean)).toHaveLength(10);
    expect(blockOwners(allocs, FORTUNE * 10).filter(Boolean)).toHaveLength(1);
  });

  it('colors one square per billion spent', () => {
    const owners = blockOwners(allocations(testTiers, { one: 1 }));
    expect(owners.filter((o) => o === 'a')).toHaveLength(10);
    expect(owners.slice(0, 10).every((o) => o === 'a')).toBe(true);
    expect(owners[10]).toBeNull();
  });

  it('gives sub-billion purchases no square at all', () => {
    const tiny: Tier[] = [
      {
        id: 'tiny',
        title: '',
        kicker: '',
        lede: '',
        items: [{ id: 'tiny', label: '', cost: 450_300_000, note: '', sources: [] }]
      }
    ];
    expect(blockOwners(allocations(tiny, { tiny: 1 })).every((o) => o === null)).toBe(true);
  });

  it('never paints past the end of the grid when you overspend', () => {
    const owners = blockOwners([{ item: oneTime, tierId: 'a', units: 1, amount: FORTUNE * 3 }]);
    expect(owners).toHaveLength(BLOCKS);
    expect(owners.every((o) => o === 'a')).toBe(true);
  });
});

describe('formatting', () => {
  it('scales money to T, B and M', () => {
    expect(formatMoney(1_866_000_000_000)).toBe('$1.87T');
    expect(formatMoney(228_000_000_000)).toBe('$228B');
    expect(formatMoney(6_900_000_000)).toBe('$6.9B');
    expect(formatMoney(450_300_000)).toBe('$450M');
    expect(formatMoney(1_500_000)).toBe('$1.5M');
    expect(formatMoney(0)).toBe('$0');
  });

  it('drops trailing zeros rather than printing $6.00B', () => {
    expect(formatMoney(6_000_000_000)).toBe('$6B');
    expect(formatMoney(1_000_000_000_000)).toBe('$1T');
  });

  it('writes the counter out in full', () => {
    expect(formatExact(FORTUNE)).toBe('$1,000,000,000,000');
    expect(formatExact(941_300_000_000)).toBe('$941,300,000,000');
  });

  it('takes shares against whichever bankroll is open', () => {
    expect(formatShare(FORTUNE, FORTUNE)).toBe('100%');
    expect(formatShare(FORTUNE, 20_100_000_000_000)).toBe('5.0%');
  });

  it('keeps small shares legible instead of rounding them to zero', () => {
    expect(formatShare(450_300_000)).toBe('0.05%');
    expect(formatShare(228_000_000_000)).toBe('23%');
    expect(formatShare(6_900_000_000)).toBe('0.69%');
    expect(formatShare(1_000_000)).toBe('<0.01%');
    expect(formatShare(0)).toBe('0%');
    expect(formatShare(FORTUNE)).toBe('100%');
  });

  it('clamps the progress fraction', () => {
    expect(spentFraction(0)).toBe(0);
    expect(spentFraction(FORTUNE / 2)).toBe(0.5);
    expect(spentFraction(FORTUNE * 2)).toBe(1);
  });
});

describe('the catalog', () => {
  it('gives every item a unique id', () => {
    const ids = allItems.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cites a source for every price', () => {
    for (const item of allItems) {
      expect(item.sources.length, `${item.id} has no source`).toBeGreaterThan(0);
      for (const source of item.sources) {
        expect(source.url, `${item.id} source is not a URL`).toMatch(/^https:\/\//);
      }
    }
  });

  it('explains every price', () => {
    for (const item of allItems) {
      expect(item.note.length, `${item.id} has no note`).toBeGreaterThan(20);
    }
  });

  it('opens cheap and ends beyond reach', () => {
    const first = tiers[0].items.map((i) => i.cost);
    expect(Math.max(...first)).toBeLessThan(FORTUNE * 0.01);

    const wall = tiers[tiers.length - 1].items;
    expect(wall.some((item) => item.cost > FORTUNE)).toBe(true);
  });

  it('can be fully funded by nobody — the catalog outruns the fortune', () => {
    const everything = Object.fromEntries(allItems.map((item) => [item.id, maxUnits(item)]));
    expect(totalSpent(tiers, everything)).toBeGreaterThan(FORTUNE);
  });
});
