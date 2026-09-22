import { describe, it, expect } from 'vitest';
import { calculate, EXAMPLE_QUERY, SCHEMA } from './calculator';
import { PARAMETERS, parseCalculatorQuery } from './query';
import { ASSUMPTIONS, DEVICES } from './presets';

const parse = (query: string) => parseCalculatorQuery(new URLSearchParams(query));

describe('reading the query string', () => {
  it('fills in defaults for everything it was not told', () => {
    const { answers, options, warnings } = parse('');
    expect(warnings).toEqual([]);
    expect(answers.listPrice).toBe(1199);
    expect(answers.tradeIn).toBe(0);
    expect(answers.carrierOffer).toBeNull();
    expect(answers.appleCare).toBe('none');
    expect(answers.taxRate).toBe(ASSUMPTIONS.taxRate);
    expect(options).toMatchObject({ ending: 'own', leaseExit: 'best' });
  });

  it('takes a device as a price and a trade-in curve', () => {
    const pro = DEVICES.find((device) => device.key === 'iphone-18-pro')!;
    const { answers } = parse('device=iphone-18-pro');
    expect(answers.listPrice).toBe(pro.price);
    expect(answers.upgradeTradeIns).toEqual([...pro.tradeIns!]);
  });

  it('lets an explicit price override the device', () => {
    expect(parse('device=iphone-17&device_price=1500').answers.listPrice).toBe(1500);
  });

  it('turns a cadence into shared upgrade months', () => {
    expect(parse('upgrade_every=1').answers.upgradeMonths).toEqual([12, 24, 36]);
    expect(parse('upgrade_every=2').answers.upgradeMonths).toEqual([24]);
    expect(parse('upgrade_every=3').answers.upgradeMonths).toEqual([36]);
    expect(parse('upgrade_every=4').answers.upgradeMonths).toEqual([]);
  });

  it('lets explicit months win, and drops the ones the model cannot place', () => {
    const { answers, warnings } = parse('upgrade_every=1&upgrade_months=12,18');
    expect(answers.upgradeMonths).toEqual([12]);
    expect(warnings.join(' ')).toContain('upgrade_months');
    expect(parse('upgrade_months=').answers.upgradeMonths).toEqual([]);
  });

  it('accepts money with the dollar sign still attached', () => {
    const { answers, warnings } = parse('trade_in=%24375&device_price=1%2C199');
    expect(answers.tradeIn).toBe(375);
    expect(answers.listPrice).toBe(1199);
    expect(warnings).toEqual([]);
  });

  it('warns rather than failing on a value it cannot use', () => {
    const { answers, warnings } = parse('trade_in=lots&apple_care=gold&tax_rate=-3');
    expect(answers.tradeIn).toBe(0);
    expect(answers.appleCare).toBe('none');
    expect(answers.taxRate).toBe(0);
    expect(warnings).toHaveLength(3);
  });

  it('names parameters it does not know', () => {
    expect(parse('nonsense=1').warnings).toEqual(['Ignored unknown parameter "nonsense".']);
  });

  it('needs four values for a resale curve, or none', () => {
    expect(parse('trade_in_values=800,600,400').warnings.join(' ')).toContain('four values');
    expect(parse('trade_in_values=800,600,400,300').answers.upgradeTradeIns).toEqual([
      800, 600, 400, 300
    ]);
    expect(parse('private_sale_values=800,600,400,300').answers.privateSaleValues).toEqual([
      800, 600, 400, 300
    ]);
    expect(parse('').answers.privateSaleValues).toBeNull();
  });

  it('ignores a sale estimate for an ending that keeps the phone', () => {
    const owning = parse('final_sale_estimate=400');
    expect(owning.options.finalSaleEstimate).toBeUndefined();
    expect(owning.warnings.join(' ')).toContain('walkaway');
    expect(parse('ending=walkaway&final_sale_estimate=400').options.finalSaleEstimate).toBe(400);
  });

  it('offers its own documentation when asked, or when asked nothing', () => {
    expect(parse('').wantsDocs).toBe(true);
    expect(parse('help').wantsDocs).toBe(true);
    expect(parse('device_price=999').wantsDocs).toBe(false);
  });
});

describe('the calculator response', () => {
  it('describes itself to a caller that sent nothing', () => {
    const body = calculate(new URLSearchParams(''));
    expect(body.schema).toBe(SCHEMA);
    expect(body.docs?.parameters).toEqual(PARAMETERS);
    expect(body.docs?.example).toBe(`?${EXAMPLE_QUERY}`);
    expect(body.docs?.reading.length).toBeGreaterThan(0);
    expect(body.notes.length).toBeGreaterThan(0);
  });

  it('leaves the documentation out once it has a question to answer', () => {
    const body = calculate(new URLSearchParams(EXAMPLE_QUERY));
    expect(body.docs).toBeUndefined();
    expect(body.recommendation.pick).toBeTruthy();
    expect(body.plans).toHaveLength(5);
    expect(body.leaseBuyout).toHaveLength(2);
    expect(body.gotchas.length).toBeGreaterThan(0);
  });

  it('echoes what it actually read, so a caller can check its own URL', () => {
    const body = calculate(new URLSearchParams('device_price=1299&trade_in=500&upgrade_every=1'));
    expect(body.request).toMatchObject({
      device_price: 1299,
      trade_in: 500,
      upgrade_months: [12, 24, 36],
      ending: 'own',
      lease_exit: 'best'
    });
  });

  it('serializes cleanly', () => {
    const body = calculate(new URLSearchParams(EXAMPLE_QUERY));
    const json = JSON.stringify(body);
    expect(json).not.toMatch(/\bNaN\b/);
    expect(JSON.parse(json).recommendation.netCost).toBe(body.recommendation.netCost);
  });

  it('documents every parameter it reads, and reads every one it documents', () => {
    const documented = PARAMETERS.map((parameter) => parameter.name);
    expect(new Set(documented).size).toBe(documented.length);
    // A documented parameter that the parser ignores would be a silent lie.
    for (const name of documented) {
      if (name === 'help') continue;
      expect(parse(`${name}=1`).warnings).not.toContain(`Ignored unknown parameter "${name}".`);
    }
  });
});
