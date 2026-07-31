import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Page from './+page.svelte';

/**
 * Smoke test for the step-by-step flow: the page gates each question behind the
 * previous answer and only builds the timeline once all four are in.
 */
describe('Apple Upgrade page', () => {
  beforeEach(() => {
    localStorage.clear();

    // jsdom has neither of these, and the timeline rail leans on both.
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
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

    expect(screen.getByText('What are you leasing?')).toBeTruthy();
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

  it('builds the timeline and the comparison once every question is answered', async () => {
    const user = userEvent.setup();
    render(Page);

    expect(screen.queryByText('Every month, one row at a time')).toBeNull();

    await walkThrough(user);

    expect(screen.getByText('Every month, one row at a time')).toBeTruthy();
    expect(screen.getByText('The lease is up. Now what?')).toBeTruthy();
    expect(screen.getByText('The same phone, five ways')).toBeTruthy();
    expect(screen.getByText('The catches, in plain language')).toBeTruthy();
  });

  it('renders a row for every month from pickup to the horizon', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);

    const rows = container.querySelectorAll('[data-month]');
    expect(rows).toHaveLength(37); // month 0 through 36
  });

  it('rewrites the timeline when you change the ending', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);

    const monthThirty = () => container.querySelector('[data-month="30"]')!.textContent!;

    // Doing nothing means Klarna is still billing you at month 30.
    expect(monthThirty()).toMatch(/Automatic buyout/);

    await user.click(screen.getByText('Hand it back'));
    expect(monthThirty()).toMatch(/No phone/);
  });

  it('remembers your answers across a reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(Page);
    await walkThrough(user);
    unmount();

    render(Page);
    expect(screen.getByText('Every month, one row at a time')).toBeTruthy();
  });
});
