/**
 * The calculator response: the advice engine plus enough context for a caller
 * that arrived with nothing but a URL. Kept out of the route so it can be
 * tested, and so the summary page can render the same worked example it
 * documents.
 */

import { evaluate, type Advice } from './advice';
import { buildInputs } from './presets';
import { PARAMETERS, parseCalculatorQuery, type ParamDoc } from './query';

export const SCHEMA = 'apple-upgrade-calculator/1';

/** When Apple's published trade-in maximums behind the defaults were read. */
export const TRADE_IN_QUOTES_CHECKED = '2026-09-20';

export const EXAMPLE_QUERY =
  'device_price=1199&trade_in=375&carrier_offer=1000&apple_care=monthly&upgrade_every=2&tax_rate=8.5';

export interface CalculatorResponse extends Advice {
  schema: typeof SCHEMA;
  about: string;
  /** Every parameter as it was finally read, defaults included. */
  request: Record<string, string | number | boolean | number[] | null>;
  warnings: string[];
  money: 'USD';
  tradeInQuotesChecked: string;
  notes: string[];
  docs?: {
    example: string;
    parameters: readonly ParamDoc[];
    reading: string[];
  };
}

const NOTES = [
  'Estimates, not quotes. Trade-in values, tax treatment and carrier promotions all move.',
  'Costs are net of card rewards. `netCost` is in today’s dollars at your discount rate, after crediting whatever phone you still hold at month 48.',
  'A lease collects 50% of the sticker over 12 months or 70% over 24, so the buyout is always the remaining 50% or 30% of list. A trade-in credit lowers the payments and the buyout by the same amount, and never changes that share.',
  'AppleCare is billed separately by Apple on every path here, including the lease.',
  'Apple does not accept a trade-in against a replacement lease. Getting trade-in value out of a leased phone means buying it out first.'
];

const READING = [
  'Start at `recommendation`. If `confidence` is not `clear`, the plans are within the error bars of four years of guessed trade-in values and the choice should be made on cash flow instead.',
  'Then read `gotchas`, which are the answers that surprise people. Each one is already priced for these inputs; `severity: critical` means it changes which button to press, not just what it costs.',
  '`leaseBuyout` is the single most important table: `verdict: buy-it-out` means handing the phone back at the end of the term sells it to Apple for `buyoutAdvantage` dollars less than it is worth.',
  '`cadence` prices how often the phone gets replaced, holding everything else equal. It is usually a larger number than the gap between any two plans.',
  '`plans` is sorted cheapest first by `netCost`. `dueToday` and `biggestMonth` are the cash-flow columns; a plan can win on cost and still be unaffordable in one particular month.'
];

/** Turn a query string into the full response body. */
export function calculate(params: URLSearchParams): CalculatorResponse {
  const parsed = parseCalculatorQuery(params);
  const advice = evaluate(buildInputs(parsed.answers), parsed.options);
  return {
    schema: SCHEMA,
    about:
      'Four ways to pay for the same iPhone, costed over 48 months: cash, Apple Card 24-month 0%, the Klarna-backed Apple Upgrade lease at both terms, and 36-month carrier financing.',
    request: parsed.resolved,
    warnings: parsed.warnings,
    money: 'USD',
    tradeInQuotesChecked: TRADE_IN_QUOTES_CHECKED,
    ...advice,
    notes: NOTES,
    ...(parsed.wantsDocs
      ? { docs: { example: `?${EXAMPLE_QUERY}`, parameters: PARAMETERS, reading: READING } }
      : {})
  };
}
