import { CATEGORIES, type CategoryTotals, type MonthRow } from './model';

/** Actual charges, including their separate tax lines, before card rewards.
 * Deferred damage deductions are lost phone value, not repair work paid for. */
export function careAndRepairPaid(rows: MonthRow[]): { care: number; repair: number } {
  const paid = { care: 0, repair: 0 };
  for (const row of rows) {
    for (const category of ['care', 'repair'] as const) {
      const charges = row.items.filter(
        (item) => item.category === category && !item.label.startsWith('Screen damage at ')
      );
      const labels = new Set(charges.map((item) => item.label));
      paid[category] += charges.reduce((total, item) => total + item.amount, 0);
      paid[category] += row.items
        .filter((item) => item.category === 'tax' && item.taxFor && labels.has(item.taxFor))
        .reduce((total, item) => total + item.amount, 0);
    }
  }
  return paid;
}

export const ADJUSTMENTS_LABEL = 'Taxes, fees, rewards & discounts';

export const PAID_OFF_IDEAS = [
  'Spend the payment on lattes instead.',
  'Take your partner out for a fancy dinner at Applebee’s.',
  'Invest in your future. Buy some chocolate.',
  'Buy fancy cheese and become unbearable about it.',
  'Adopt a houseplant. Name it after your former monthly payment.',
  'Take a friend out for tacos. Get the extra guacamole.',
  'Buy a board game and become a rules lawyer.',
  'Fund a very small adventure. Snacks are expedition supplies.',
  'Go to a matinee. Get popcorn with its own financing plan.',
  'Buy a puzzle and surrender your dining table to it.',
  'Send someone flowers for absolutely no reason.',
  'Take yourself on a bookstore date. The phone can wait outside.',
  'Buy art supplies and paint a deeply unconvincing horse.',
  'Start a vacation fund called “somewhere with better snacks.”',
  'Buy a bird feeder. Become the neighborhood seed baron.',
  'Buy spectacular socks. Your ankles have waited long enough.',
  'Send a care package containing too many cookies.',
  'Buy a kite. Arrange a meeting with the wind.',
  'Support a local band. Clap like you know the drummer.',
  'Donate to an animal shelter. Let a cat enjoy your financial restraint.',
  'Buy a hammock. Schedule some extremely important nothing.',
  'Host a pancake dinner. Breakfast has no jurisdiction over you.',
  'Buy the good olive oil. Become a person who has opinions about olive oil.',
  'Keep the money. Doing nothing can be a hobby too.'
];

/** The amounts printed in the ledger, before rounding for display. */
export function ledgerAmounts(
  row: MonthRow,
  previous: MonthRow | undefined,
  basis: 'cash' | 'npv'
): CategoryTotals {
  const amounts: CategoryTotals = { phone: 0, rent: 0, care: 0, fees: 0, repair: 0, tax: 0 };
  for (const item of row.items)
    amounts[item.category === 'tax' ? 'fees' : item.category] += item.amount;
  amounts.fees -= row.rewards;
  if (basis === 'npv') amounts.fees += row.runningNpv - (previous?.runningNpv ?? 0) - row.net;
  return amounts;
}

/** Accumulate the same categories the reader saw arrive in each month. */
export function ledgerTotals(rows: MonthRow[], basis: 'cash' | 'npv'): CategoryTotals[] {
  const total: CategoryTotals = { phone: 0, rent: 0, care: 0, fees: 0, repair: 0, tax: 0 };
  return rows.map((row, index) => {
    const amounts = ledgerAmounts(row, rows[index - 1], basis);
    for (const category of CATEGORIES) total[category] += amounts[category];
    return { ...total };
  });
}
