import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Page from './+page.svelte';
import { HORIZON } from '$lib/apple-upgrade/model';

/**
 * Smoke test for the step-by-step flow: the page gates each question behind the
 * previous answer and only builds the scrolling ledger once all four are in.
 */
describe('Apple Upgrade page', () => {
  beforeEach(() => {
    localStorage.clear();

    // jsdom has none of these, and the sticky column panel leans on all of them.
    const noopObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    vi.stubGlobal('IntersectionObserver', noopObserver);
    vi.stubGlobal('ResizeObserver', noopObserver);
    window.matchMedia ??= vi.fn().mockReturnValue({ matches: false }) as never;
    Element.prototype.scrollIntoView = vi.fn();
  });

  async function walkThrough(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByText('iPhone 17 Pro Max'));
    await user.click(screen.getByText('No trade-in'));
    await user.click(screen.getByText('24 months'));
    await user.click(screen.getByText('No AppleCare'));
  }

  it('starts with only the first question open', () => {
    render(Page);

    expect(screen.getByText('What are you buying?')).toBeTruthy();
    expect(screen.getByText('iPhone 17 Pro Max')).toBeTruthy();

    // Later steps are visible as dimmed stubs, but their controls are not there.
    expect(screen.queryByText('No trade-in')).toBeNull();
    expect(screen.queryByText('No AppleCare')).toBeNull();
  });

  it('reveals each step as the one before it is answered', async () => {
    const user = userEvent.setup();
    render(Page);

    await user.click(screen.getByText('iPhone 17 Pro Max'));
    expect(screen.getByText('No trade-in')).toBeTruthy();
    expect(screen.queryByText('12 months')).toBeNull();

    await user.click(screen.getByText('No trade-in'));
    expect(screen.getByText('12 months')).toBeTruthy();
    expect(screen.queryByText('No AppleCare')).toBeNull();

    await user.click(screen.getByText('24 months'));
    expect(screen.getByText('No AppleCare')).toBeTruthy();
  });

  it('quotes the published payment for the device you pick', async () => {
    const user = userEvent.setup();
    render(Page);

    await user.click(screen.getByText('iPhone 17 Pro Max'));
    await user.click(screen.getByText('No trade-in'));

    // Apple's own numbers for a $1,199 Pro Max.
    expect(screen.getByText('$49.99/mo')).toBeTruthy();
    expect(screen.getByText('$34.99/mo')).toBeTruthy();
  });

  it('builds the ledger and the comparison once every question is answered', async () => {
    const user = userEvent.setup();
    render(Page);

    expect(screen.queryByText('Scroll, and watch them fill up')).toBeNull();

    await walkThrough(user);

    expect(screen.getByText('Scroll, and watch them fill up')).toBeTruthy();
    expect(screen.getByText('The lease is up. Now what?')).toBeTruthy();
    expect(screen.getByText('What the scroll adds up to')).toBeTruthy();
    expect(screen.getByText('The catches, in plain language')).toBeTruthy();
  });

  it('renders a block for every month from pickup to the horizon', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);

    const rows = container.querySelectorAll('[data-month]');
    expect(rows).toHaveLength(HORIZON + 1);
  });

  // Four columns, so four sets of aligned totals under every month.
  it('aligns a total per column under each month', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);

    const month = container.querySelector('[data-month="1"]')!;
    expect(month.querySelectorAll('.foot .cell')).toHaveLength(4);
  });

  it('names every charge once and says who gets billed for it', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);

    // Month 1: the lease, the Apple Card installment and the carrier
    // installment all start, and paying cash is already finished.
    const month = container.querySelector('[data-month="1"]')!.textContent!;
    expect(month).toMatch(/Lease payment/);
    expect(month).toMatch(/Installment/);
    expect(month).toMatch(/Device installment/);
  });

  it('rewrites the ledger when you change the ending', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);

    const monthThirty = () => container.querySelector('[data-month="30"]')!.textContent!;

    // Doing nothing means Klarna is still billing you at month 30.
    expect(monthThirty()).toMatch(/Automatic buyout/);

    await user.click(screen.getByText('Hand it back'));
    expect(monthThirty()).toMatch(/You don’t have a phone/);
  });

  it('fills the phoneless months with something to do', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    await user.click(screen.getByText('Hand it back'));

    // Every month past the term is phoneless on the return path; each should
    // suggest a pastime, and no two of them should suggest the same one.
    const suggestions = [];
    for (let m = 25; m <= HORIZON; m++) {
      const text = container.querySelector(`[data-month="${m}"]`)!.textContent!;
      const match = text.match(/You don’t have a phone: (.+)/);
      expect(match).not.toBeNull();
      suggestions.push(match![1].trim());
    }
    expect(new Set(suggestions).size).toBe(suggestions.length);
  });

  it('remembers your answers across a reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(Page);
    await walkThrough(user);
    unmount();

    render(Page);
    expect(screen.getByText('Scroll, and watch them fill up')).toBeTruthy();
  });
});
