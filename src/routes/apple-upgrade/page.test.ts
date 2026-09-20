import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Page from './+page.svelte';
import { HORIZON } from '$lib/apple-upgrade/model';

/**
 * Smoke test for the step-by-step flow: the page gates each question behind the
 * previous answer and only builds the scrolling ledger once the setup answers are in.
 */
describe('Apple Upgrade page', () => {
  let scrolledMonth = -1;
  beforeEach(() => {
    localStorage.clear();
    scrolledMonth = -1;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      const month = this.getAttribute('data-month');
      return {
        top: month !== null && Number(month) <= scrolledMonth ? 0 : 1000,
        height: 0
      } as DOMRect;
    });
    // Native layout and dialog behavior are browser boundaries absent in jsdom.
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

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
    await user.click(screen.getByText('No AppleCare'));
  }
  async function chooseYear(
    user: ReturnType<typeof userEvent.setup>,
    year: number,
    upgrade = false
  ) {
    const section = document.getElementById(`year-${year}-title`)!.closest('section')!;
    await user.click(
      within(section).getByRole('button', { name: upgrade ? 'Upgrade' : 'Keep this phone' })
    );
  }
  async function finish(user: ReturnType<typeof userEvent.setup>) {
    for (const year of [1, 2, 3]) await chooseYear(user, year);
  }
  async function scrollToMonth(month: number) {
    scrolledMonth = month;
    await fireEvent.scroll(window);
  }

  it('asks for the phone, trade-in and coverage, without an upfront upgrade schedule', async () => {
    const user = userEvent.setup();
    render(Page);
    expect(screen.queryByText('No trade-in')).toBeNull();
    await user.click(screen.getByText('iPhone 17 Pro Max'));
    expect(screen.getByText('No trade-in')).toBeTruthy();
    expect(screen.queryByText('No AppleCare')).toBeNull();
    await user.click(screen.getByText('No trade-in'));
    expect(screen.getByText('No AppleCare')).toBeTruthy();
    expect(screen.queryByText('How often do you want a new phone?')).toBeNull();
    expect(screen.getByText('$34.99/mo on a 24-month lease')).toBeTruthy();
  });

  it('gates each year and only shows final totals after all three annual decisions', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    expect(container.querySelectorAll('.chart .name')).toHaveLength(5);
    expect(container.querySelectorAll('[data-month]')).toHaveLength(13);
    expect(screen.queryByText('What the scroll adds up to')).toBeNull();
    for (const year of [1, 2, 3]) {
      await chooseYear(user, year);
      expect(container.querySelectorAll('[data-month]')).toHaveLength((year + 1) * 12 + 1);
    }
    expect(screen.getByText('What the scroll adds up to')).toBeTruthy();
    expect(screen.getByText('Assumptions and lease terms')).toBeTruthy();
    expect(screen.queryByText('The lease is up. Now what?')).toBeNull();
  });

  it('keeping the phone stops replacements on every path and exposes both automatic buyouts', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    await finish(user);
    expect(container.querySelector('[data-month="18"]')?.textContent).toContain('Automatic buyout');
    expect(container.querySelector('[data-month="30"]')?.textContent).toContain('Automatic buyout');
    expect(container.textContent).not.toContain('New phone after trade-in');
    expect(container.textContent).not.toContain('Installment on traded-in phone');
    expect(container.textContent).not.toContain('You don’t have a phone');
  });

  it('supports mixed decisions and clears later answers when an earlier decision changes', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    await chooseYear(user, 1, true);
    await chooseYear(user, 2);
    await chooseYear(user, 3, true);
    expect(container.querySelector('[data-month="12"]')?.textContent).toContain(
      'New phone after trade-in'
    );
    expect(container.querySelector('[data-month="24"]')?.textContent).not.toContain(
      'New phone after trade-in'
    );
    expect(container.querySelector('[data-month="36"]')?.textContent).toContain(
      'New phone after trade-in'
    );
    expect(container.querySelector('[data-month="13"]')?.textContent).toContain(
      'Installment on traded-in phone'
    );
    await chooseYear(user, 1);
    expect(container.querySelector('[data-month="25"]')).toBeNull();
    expect(screen.queryByText('What the scroll adds up to')).toBeNull();
    expect(JSON.parse(localStorage.getItem('apple-upgrade-calculator')!).annualChoices).toEqual([
      'keep',
      null,
      null
    ]);
  });

  it('restores annual answers, but asks again for incompatible legacy schedules', async () => {
    const user = userEvent.setup();
    let view = render(Page);
    await walkThrough(user);
    await chooseYear(user, 1, true);
    await chooseYear(user, 2);
    view.unmount();
    view = render(Page);
    expect(view.container.querySelector('[data-month="36"]')).toBeTruthy();
    expect(view.container.querySelector('[data-month="37"]')).toBeNull();
    view.unmount();
    const saved = JSON.parse(localStorage.getItem('apple-upgrade-calculator')!);
    delete saved.annualChoices;
    localStorage.setItem(
      'apple-upgrade-calculator',
      JSON.stringify({ ...saved, upgradeEvery: 12, endChoice: 'nothing' })
    );
    view = render(Page);
    expect(view.container.querySelectorAll('[data-month]')).toHaveLength(13);
    expect(JSON.parse(localStorage.getItem('apple-upgrade-calculator')!).annualChoices).toEqual([
      null,
      null,
      null
    ]);
  });

  it('jumps to the top without clearing answers, and start over resets the annual choices', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    await chooseYear(user, 1, true);
    const saved = localStorage.getItem('apple-upgrade-calculator');
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1400 });
    await fireEvent.scroll(window);
    await user.click(screen.getByRole('button', { name: 'Jump to top' }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(localStorage.getItem('apple-upgrade-calculator')).toBe(saved);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    await fireEvent.scroll(window);
    await user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(container.querySelector('[data-month]')).toBeNull();
    expect(JSON.parse(localStorage.getItem('apple-upgrade-calculator')!).annualChoices).toEqual([
      null,
      null,
      null
    ]);
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Apple Upgrade, decoded' })
    );
  });

  it('opens the screen question at month nine once, and preserves dismissal', async () => {
    const user = userEvent.setup();
    const { unmount } = render(Page);
    await walkThrough(user);
    await scrollToMonth(8);
    expect(screen.queryByRole('dialog')).toBeNull();
    await scrollToMonth(9);
    const dialog = await screen.findByRole('dialog');
    await fireEvent(dialog, new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    unmount();
    render(Page);
    await scrollToMonth(10);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(JSON.parse(localStorage.getItem('apple-upgrade-calculator')!).screenChoice).toBe(
      'dismiss'
    );
  });

  it.each(['No AppleCare', 'AppleCare+ monthly'])(
    'repairs every path when fixing the screen with %s',
    async (coverage) => {
      const user = userEvent.setup();
      const { container } = render(Page);
      await walkThrough(user);
      if (coverage !== 'No AppleCare') await user.click(screen.getByText(coverage));
      await scrollToMonth(9);
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
          name: coverage === 'No AppleCare' ? 'Pay $271.25 to fix it' : 'Pay $31.47 to fix it'
        })
      );
      expect(
        container.querySelectorAll('[data-month="9"] .bars[data-cat="repair"] .cell:not(.zero)')
      ).toHaveLength(5);
    }
  );

  it('charges a deferred repair when returning a lease and recalculates changed screen choices', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    await scrollToMonth(9);
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Deal with it' })
    );
    await chooseYear(user, 1, true);
    expect(
      container.querySelectorAll('[data-month="12"] .bars[data-cat="repair"] .cell:not(.zero)')
    ).toHaveLength(1);
    expect(
      container.querySelector('[data-month="12"] .bars[data-cat="repair"]')?.textContent
    ).toContain('$250.00');
    await chooseYear(user, 1);
    await chooseYear(user, 2, true);
    const replacement = () =>
      within(container.querySelector('[data-month="24"]') as HTMLElement)
        .getByText('New phone after trade-in')
        .closest('li')!;
    expect(replacement().querySelector('.amt')?.textContent).toBe('$909.00');
    expect(
      container.querySelectorAll('[data-month="24"] .bars[data-cat="repair"] .cell:not(.zero)')
    ).toHaveLength(1);
    const choices = within(screen.getByRole('region', { name: 'Oh no! You cracked your screen!' }));
    await user.click(choices.getByRole('button', { name: 'No I didn’t' }));
    expect(container.querySelector('.bars[data-cat="repair"]')).toBeNull();
    expect(replacement().querySelector('.amt')?.textContent).toBe('$659.00');
  });

  it('reconciles all five visible columns in both dollar modes across mixed decisions', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    await chooseYear(user, 1, true);
    await chooseYear(user, 2);
    await chooseYear(user, 3, true);
    const dollars = (text: string | null | undefined) =>
      Number(text?.match(/\$([\d,]+\.\d{2})/)?.[1].replaceAll(',', '')) || 0;
    for (const discounted of [true, false]) {
      if (!discounted) await user.click(screen.getByRole('button', { name: 'today’s dollars' }));
      for (const month of [0, 1, 12, 18, 24, 30, 36, HORIZON]) {
        const block = container.querySelector(`[data-month="${month}"]`)!;
        const sums = [...block.querySelectorAll('.sum')];
        expect(sums).toHaveLength(5);
        sums.forEach((sum, column) => {
          const charges = [...block.querySelectorAll('.charges li')].reduce((total, row) => {
            const text = row.querySelectorAll('.amt')[column].textContent;
            return total + dollars(text) * (text?.startsWith('−') ? -1 : 1);
          }, 0);
          const total = dollars(sum.textContent) * (sum.classList.contains('back') ? -1 : 1);
          expect(Math.abs(charges - total)).toBeLessThan(0.04);
        });
        expect(block.querySelector('.sum small')).toBeNull();
      }
    }
  });

  it('shows excess trade-in credit in both lease columns', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await user.click(screen.getByText('Something else'));
    const price = screen.getByLabelText(/Sticker price/i);
    await user.clear(price);
    await user.type(price, '999');
    await user.click(screen.getByText('Yes, I have one'));
    const trade = screen.getByLabelText(/Apple Trade-in offer/i);
    await user.clear(trade);
    await user.type(trade, '800');
    await user.click(screen.getByText('No AppleCare'));
    const row = within(container.querySelector('[data-month="0"]') as HTMLElement)
      .getByText('Apple credit back for excess trade-in')
      .closest('li')!;
    expect(row.textContent).toContain('−$300.50');
    expect(row.textContent).toContain('−$100.70');
    expect(row.querySelectorAll('.cell:not(.zero)')).toHaveLength(2);
  });
});
