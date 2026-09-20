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
    await user.click(screen.getByText('iPhone 18 Pro'));
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

  it.each([
    ['iPhone 17', 899, '$25.99/mo on a 24-month lease'],
    ['iPhone Air', 1099, '$31.99/mo on a 24-month lease'],
    ['iPhone 18 Pro', 1199, '$34.99/mo on a 24-month lease'],
    ['iPhone 18 Pro Max', 1299, '$37.99/mo on a 24-month lease'],
    ['iPhone Duo', 1999, '$57.99/mo on a 24-month lease']
  ])('uses the September lineup price for %s', async (name, price, payment) => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await user.click(screen.getByText(name));
    expect(screen.getByText(payment)).toBeTruthy();
    await user.click(screen.getByText('No trade-in'));
    await user.click(screen.getByText('No AppleCare'));
    expect(container.querySelectorAll('[data-month]')).toHaveLength(13);
    expect(JSON.parse(localStorage.getItem('apple-upgrade-calculator')!).listPrice).toBe(price);
    expect(screen.queryByText('iPhone 17 Pro')).toBeNull();
    expect(screen.queryByText('iPhone 17 Pro Max')).toBeNull();
  });

  it.each(['iphone-17-pro', 'iphone-17-pro-max'])(
    're-asks setup for discontinued %s and keeps cost assumptions',
    async (deviceKey) => {
      localStorage.setItem(
        'apple-upgrade-calculator',
        JSON.stringify({
          deviceKey,
          listPrice: 1199,
          hasTradeIn: 'yes',
          tradeIn: 600,
          appleCare: 'one',
          annualChoices: ['upgrade', 'keep', 'upgrade'],
          privateSaleValues: [900, 700, 500, 300],
          screenChoice: 'repair',
          taxRate: 6.25,
          appleCareOneMonthly: 49.99
        })
      );
      const user = userEvent.setup();
      const { container } = render(Page);
      expect(screen.queryByText('No trade-in')).toBeNull();
      expect(container.querySelector('[data-month]')).toBeNull();
      await walkThrough(user);
      expect(container.querySelectorAll('[data-month]')).toHaveLength(13);
      expect(JSON.parse(localStorage.getItem('apple-upgrade-calculator')!)).toMatchObject({
        deviceKey: 'iphone-18-pro',
        annualChoices: [null, null, null],
        privateSaleValues: null,
        screenChoice: null,
        tradeIn: 600,
        taxRate: 6.25,
        appleCareOneMonthly: 49.99
      });
    }
  );

  it.each([
    ['iphone-17', 799, 899],
    ['iphone-air', 999, 1099],
    ['custom', 1500, 1500]
  ])('restores %s with current pricing and keeps annual answers', (deviceKey, oldPrice, price) => {
    localStorage.setItem(
      'apple-upgrade-calculator',
      JSON.stringify({
        deviceKey,
        listPrice: oldPrice,
        hasTradeIn: 'no',
        appleCare: 'none',
        annualChoices: ['keep', 'upgrade', null]
      })
    );
    const { container } = render(Page);
    expect(container.querySelectorAll('[data-month]')).toHaveLength(37);
    expect(JSON.parse(localStorage.getItem('apple-upgrade-calculator')!)).toMatchObject({
      listPrice: price,
      annualChoices: ['keep', 'upgrade', null]
    });
  });

  it('uses editable Pro Max percentages for Duo trade-in estimates', async () => {
    const user = userEvent.setup();
    render(Page);
    await user.click(screen.getByText('iPhone Duo'));
    await user.click(screen.getByText('No trade-in'));
    await user.click(screen.getByText('No AppleCare'));
    await user.click(screen.getByText('Nitpicky stuff if you want to account for every penny'));
    expect(
      screen
        .getAllByRole('spinbutton', { name: /^Apple trade-in after/ })
        .map((field) => Number((field as HTMLInputElement).value))
    ).toEqual([885, 610, 455, 360].map((value) => Math.round((1999 * value) / 1299)));
    const tradeIn = screen.getByRole('spinbutton', { name: /^Apple trade-in after 1 year/ });
    await fireEvent.input(tradeIn, { target: { value: '500' } });
    await chooseYear(user, 1, true);
    const replacement = within(document.querySelector('[data-month="12"]') as HTMLElement)
      .getByText('New phone after trade-in')
      .closest('li')!;
    expect(replacement.querySelector('.amt')?.textContent).toBe('$1,499.00');
  });

  it('defaults Duo AppleCare+ to $19.99 monthly or $199.99 yearly and preserves edits on reload', async () => {
    const user = userEvent.setup();
    const view = render(Page);
    await walkThrough(user);
    await user.click(screen.getByText('iPhone Duo'));
    await user.click(screen.getByText('AppleCare+ monthly'));
    expect(
      (screen.getByRole('spinbutton', { name: 'Monthly price' }) as HTMLInputElement).value
    ).toBe('19.99');
    await user.click(screen.getByText('AppleCare+ yearly'));
    const yearly = screen.getByRole('spinbutton', { name: 'Yearly price' });
    expect((yearly as HTMLInputElement).value).toBe('199.99');
    await fireEvent.input(yearly, { target: { value: '180' } });
    view.unmount();
    render(Page);
    expect(
      (screen.getByRole('spinbutton', { name: 'Yearly price' }) as HTMLInputElement).value
    ).toBe('180');
    await user.click(screen.getByText('iPhone 18 Pro'));
    expect(
      (screen.getByRole('spinbutton', { name: 'Yearly price' }) as HTMLInputElement).value
    ).toBe('149');
    await user.click(screen.getByText('AppleCare+ monthly'));
    expect(
      (screen.getByRole('spinbutton', { name: 'Monthly price' }) as HTMLInputElement).value
    ).toBe('13.49');
  });

  it('asks for the phone, trade-in and coverage, without an upfront upgrade schedule', async () => {
    const user = userEvent.setup();
    render(Page);
    expect(screen.queryByText('No trade-in')).toBeNull();
    await user.click(screen.getByText('iPhone 18 Pro'));
    expect(screen.getByText('No trade-in')).toBeTruthy();
    expect(screen.queryByText('No AppleCare')).toBeNull();
    await user.click(screen.getByText('No trade-in'));
    expect(screen.getByText('No AppleCare')).toBeTruthy();
    expect(screen.queryByText('How often do you want a new phone?')).toBeNull();
    expect(screen.getByText('$34.99/mo on a 24-month lease')).toBeTruthy();
  });

  it('toggles the full month breakdown from the card, totals, and keyboard', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    const month = screen.getByRole('button', { name: 'Month 0: show breakdown' });
    const details = month.querySelector<HTMLElement>('.breakdown')!;
    const totals = [...month.querySelectorAll<HTMLElement>('.sum')];
    expect(month.querySelector('header')).toBeTruthy();
    expect(details.querySelector('header')).toBeNull();
    expect(details.inert).toBe(true);
    expect(details.getAttribute('aria-hidden')).toBe('true');
    expect(month.querySelectorAll('.stack-column')).toHaveLength(5);
    expect(month.querySelectorAll('.segment').length).toBeGreaterThan(5);
    expect(totals.every((total) => !total.hidden && total.textContent?.trim())).toBe(true);
    await user.click(month.querySelector('.segment')!);
    expect(month.getAttribute('aria-expanded')).toBe('true');
    expect(details.inert).toBe(false);
    expect([...month.querySelectorAll<HTMLElement>('.amt')].every((amount) => !amount.hidden)).toBe(
      true
    );
    expect(container.querySelector('[data-month="1"]')?.getAttribute('aria-expanded')).toBe(
      'false'
    );
    await user.click(totals[0]);
    expect(details.inert).toBe(true);
    month.focus();
    await user.keyboard('{Enter}');
    expect(details.inert).toBe(false);
    await user.keyboard(' ');
    expect(details.inert).toBe(true);
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

  it('celebrates paid-off months with a different suggestion each month', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    await finish(user);
    const suggestions = Array.from({ length: 12 }, (_, index) => {
      const month = container.querySelector(`[data-month="${37 + index}"]`)!;
      const text = month.querySelector('.nothing')?.textContent?.trim();
      expect(text).toContain('Your phone is paid off.');
      expect(month.querySelector('.charges')).toBeNull();
      return text;
    });
    expect(new Set(suggestions).size).toBe(12);
    expect(container.querySelector('[data-month="1"]')?.textContent).not.toContain(
      'Your phone is paid off.'
    );
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
          name:
            coverage === 'No AppleCare'
              ? 'Pay $271.25 to fix it without AppleCare'
              : 'Pay $31.47 to fix it with AppleCare'
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
    // The Pro's trade-in is below the other lease's payment ceiling, so its
    // damage cost arrives in later payments rather than a lost refund today.
    expect(
      container.querySelectorAll('[data-month="12"] .bars[data-cat="repair"] .cell:not(.zero)')
    ).toHaveLength(2);
    expect(
      container.querySelector('[data-month="12"] .bars[data-cat="repair"]')?.textContent
    ).toContain('$250.00');
    await chooseYear(user, 1);
    await chooseYear(user, 2, true);
    const replacement = () =>
      within(container.querySelector('[data-month="24"]') as HTMLElement)
        .getByText('New phone after trade-in')
        .closest('li')!;
    expect(replacement().querySelector('.amt')?.textContent).toBe('$689.00');
    expect(
      container.querySelectorAll('[data-month="24"] .bars[data-cat="repair"] .cell:not(.zero)')
    ).toHaveLength(2);
    const choices = within(screen.getByRole('region', { name: 'Oh no! You cracked your screen!' }));
    await user.click(choices.getByRole('button', { name: 'No I didn’t' }));
    expect(container.querySelector('.bars[data-cat="repair"]')).toBeNull();
    expect(replacement().querySelector('.amt')?.textContent).toBe('$689.00');
  });

  it('prefills editable Apple estimates and shows private sales as a separate action', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    await chooseYear(user, 1, true);
    const month = () => within(container.querySelector('[data-month="12"]') as HTMLElement);
    const amount = (label: string) =>
      month().getByText(label).closest('li')!.querySelector('.amt')!.textContent;
    expect(amount('New phone after trade-in')).toBe('$414.00');
    await user.click(screen.getByText('Nitpicky stuff if you want to account for every penny'));
    const tradeIn = screen.getByRole('spinbutton', { name: /^Apple trade-in after 1 year/ });
    expect((tradeIn as HTMLInputElement).value).toBe('785');
    await fireEvent.input(tradeIn, { target: { value: '500' } });
    expect(amount('New phone after trade-in')).toBe('$699.00');
    const choice = screen.getByRole('checkbox', {
      name: 'I’ll sell owned phones privately instead'
    });
    await user.click(choice);
    expect(
      (screen.getByRole('spinbutton', { name: /^Private sale after 1 year/ }) as HTMLInputElement)
        .value
    ).toBe('500');
    await fireEvent.input(screen.getByRole('spinbutton', { name: /^Private sale after 1 year/ }), {
      target: { value: '900' }
    });
    expect(month().queryByText('New phone after trade-in')).toBeNull();
    expect(amount('New phone')).toBe('$1,199.00');
    expect(amount('Private sale proceeds')).toBe('−$900.00');
    expect(JSON.parse(localStorage.getItem('apple-upgrade-calculator')!).privateSaleValues[0]).toBe(
      900
    );
    await user.click(choice);
    expect(month().queryByText('Private sale proceeds')).toBeNull();
    expect(amount('New phone after trade-in')).toBe('$699.00');
  });

  it('scales prefilled estimates with the custom phone price', async () => {
    const user = userEvent.setup();
    render(Page);
    await walkThrough(user);
    await user.click(screen.getByText('Something else'));
    await user.click(screen.getByText('Nitpicky stuff if you want to account for every penny'));
    await fireEvent.input(screen.getByRole('spinbutton', { name: /^Sticker price/ }), {
      target: { value: '2598' }
    });
    expect(
      screen
        .getAllByRole('spinbutton', { name: /^Apple trade-in after/ })
        .map((field) => (field as HTMLInputElement).value)
    ).toEqual(['1770', '1220', '910', '720']);
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
