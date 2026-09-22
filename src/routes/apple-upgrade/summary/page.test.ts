import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';
import { EXAMPLE_QUERY } from '$lib/apple-upgrade/calculator';
import { PARAMETERS } from '$lib/apple-upgrade/query';

/**
 * The summary page prints numbers straight out of the model, so the risk is
 * not a broken calculation — that is covered in advice.test.ts — but a page
 * that quietly stops printing them.
 */
describe('Apple Upgrade summary page', () => {
  it('leads with the rules rather than the ledger', () => {
    render(Page);
    expect(
      screen.getByRole('heading', { level: 1, name: /which one should i pick/i })
    ).toBeTruthy();
    expect(screen.getByText(/Buy the lease out at the end/i)).toBeTruthy();
    expect(screen.getByText(/AppleCare is not included/i)).toBeTruthy();
    expect(screen.getByText(/How often you upgrade beats which plan/i)).toBeTruthy();
  });

  it('shows the buyout rule as dollars for every phone in the lineup', () => {
    render(Page);
    const table = screen.getByRole('table', { name: /buy it out when the trade-in beats/i });
    const rows = table.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(3);
    expect(table.textContent).toMatch(/buy it out, \+\$\d/);
  });

  it('prints the AppleCare break-even rather than an opinion about it', () => {
    render(Page);
    expect(screen.getByText(/Screens to break even/i)).toBeTruthy();
    expect(screen.getByText(/Which is a crack every/i)).toBeTruthy();
  });

  it('documents the calculator for a caller that only has a URL', () => {
    const { container } = render(Page);
    const link = container.querySelector<HTMLAnchorElement>(
      `a[href*="/apple-upgrade/calculator?"]`
    );
    expect(link?.getAttribute('href')).toContain(EXAMPLE_QUERY);
    for (const parameter of PARAMETERS) {
      expect(screen.getByText(parameter.name)).toBeTruthy();
    }
  });

  it('never renders an unresolved number', () => {
    const { container } = render(Page);
    expect(container.textContent).not.toMatch(/NaN|undefined|\$0\.00\b/);
  });
});
