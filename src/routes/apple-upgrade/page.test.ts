import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Page from './+page.svelte';
import { HORIZON } from '$lib/apple-upgrade/model';

/**
 * Smoke test for the step-by-step flow: the page gates each question behind the
 * previous answer and only builds the scrolling ledger once all four are in.
 */
describe('Apple Upgrade page', () => {
  let scrolledMonth = -1;
  beforeEach(() => {
    localStorage.clear();
    scrolledMonth = -1;
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

  /** The questions asked before the ledger starts. */
  async function walkThrough(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByText('iPhone 17 Pro Max'));
    await user.click(screen.getByText('No trade-in'));
    await user.click(screen.getByText('24 months'));
    await user.click(screen.getByText('No AppleCare'));
  }

  /** …and the one the ledger stops at, part-way down. */
  async function chooseEnding(user: ReturnType<typeof userEvent.setup>, label = 'Do nothing') {
    await user.click(screen.getByText(label));
  }

  async function scrollToMonth(month: number) {
    scrolledMonth = month;
    await fireEvent.scroll(window);
  }

  it('opens at month nine once, and dismissing it survives reload', async () => {
    const user = userEvent.setup();
    const { unmount, container } = render(Page);
    await walkThrough(user);
    await scrollToMonth(8);
    expect(screen.queryByRole('dialog')).toBeNull();
    await scrollToMonth(9);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'No I didn’t' }));
    await scrollToMonth(8);
    await scrollToMonth(10);
    expect(screen.queryByRole('dialog')).toBeNull();
    await chooseEnding(user, 'Hand it back');
    expect(container.querySelector('[data-cat="repair"]')).toBeNull();
    unmount();
    render(Page);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each(['No AppleCare', 'AppleCare+ monthly'])(
    'adds the repair now to all columns with %s',
    async (coverage) => {
      const user = userEvent.setup();
      const { container } = render(Page);
      await walkThrough(user);
      if (coverage !== 'No AppleCare') await user.click(screen.getByText(coverage));
      await scrollToMonth(9);
      const dialog = await screen.findByRole('dialog');
      await user.click(
        within(dialog).getByRole('button', {
          name: coverage === 'No AppleCare' ? 'Pay $271.25 to fix it' : 'Pay $31.47 to fix it'
        })
      );
      expect(screen.queryByRole('dialog')).toBeNull();
      const repair = container.querySelector('[data-month="9"] [data-cat="repair"]')!;
      expect(repair.querySelectorAll('.bar')).toHaveLength(4);
      await chooseEnding(user, 'Hand it back');
      expect(container.querySelector('[data-month="24"] [data-cat="repair"]')).toBeNull();
    }
  );

  it('defers the repair with AppleCare, and recalculates when coverage or ending changes', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    await user.click(screen.getByText('AppleCare+ monthly'));
    await scrollToMonth(9);
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Deal with it' })
    );
    expect(container.querySelector('[data-month="9"] [data-cat="repair"]')).toBeNull();
    await chooseEnding(user, 'Hand it back');
    const repair = () => container.querySelector('[data-month="24"] [data-cat="repair"]');
    expect(repair()!.querySelectorAll('.cell:not(.zero) .bar')).toHaveLength(1);
    expect(repair()!.querySelector('.cell:not(.zero) .bar')?.getAttribute('title')).toBe(
      'Lease: $29.00'
    );
    expect(repair()!.textContent).toContain('$29.00');
    await user.click(screen.getByText('No AppleCare'));
    expect(repair()!.textContent).toContain('$250.00');
    await chooseEnding(user, 'Do nothing');
    expect(repair()).toBeNull();
  });

  it('treats Escape as no cracked screen', async () => {
    const user = userEvent.setup();
    render(Page);
    await walkThrough(user);
    await scrollToMonth(12);
    const dialog = await screen.findByRole('dialog');
    await fireEvent(dialog, new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(JSON.parse(localStorage.getItem('apple-upgrade-calculator')!).screenChoice).toBe(
      'dismiss'
    );
  });

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

  it('builds the ledger once every setup question is answered', async () => {
    const user = userEvent.setup();
    render(Page);

    expect(screen.queryByText('Scroll, and watch them fill up')).toBeNull();

    await walkThrough(user);

    expect(screen.getByText('Scroll, and watch them fill up')).toBeTruthy();
    expect(screen.getByText('The lease is up. Now what?')).toBeTruthy();
  });

  /**
   * The end-of-term question is a gate, not a preference: every month past it
   * depends on the answer, so there is nothing below it to scroll to.
   */
  it('stops the ledger at the end-of-term question until it is answered', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);

    expect(container.querySelectorAll('[data-month]')).toHaveLength(25); // 0 through 24
    expect(container.querySelector('[data-month="25"]')).toBeNull();
    expect(screen.queryByText('What the scroll adds up to')).toBeNull();
    expect(screen.queryByText('The catches, in plain language')).toBeNull();
  });

  it('opens the rest of the page once an ending is picked', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    await chooseEnding(user);

    expect(container.querySelectorAll('[data-month]')).toHaveLength(HORIZON + 1);
    expect(screen.getByText('What the scroll adds up to')).toBeTruthy();
    expect(screen.getByText('The catches, in plain language')).toBeTruthy();
  });

  it('names every charge once', async () => {
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

  it('shows upfront tax in both cash and carrier columns', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    const row = [...container.querySelectorAll('[data-month="0"] .charges li')].find(
      (li) => li.querySelector('.what')?.textContent === 'Sales tax, up front'
    )!;
    expect(
      [...row.querySelectorAll('.cell')].map((cell) => cell.classList.contains('zero'))
    ).toEqual([false, true, true, false]);
    expect(
      [...row.querySelectorAll('.cell:not(.zero) .amt')].map((amount) => amount.textContent)
    ).toEqual(['$101.92', '$101.92']);
    expect(row.querySelector('[data-cat="tax"]')).toBeTruthy();
    expect(row.querySelector('.biller')?.textContent).toBe('apple / carrier');
    // Splitting tax out of the phone band must not lower the cash reference line.
    expect(container.querySelector('.caption')?.textContent).toContain('$1,262');
  });

  /**
   * A charge is attributed by drawing it in the columns that pay it, so every
   * charge spans all four and the ones that owe nothing are empty. That is the
   * whole mechanism: no chips, no swatches, just where the bars are.
   */
  it('draws each charge across the columns that are billed for it', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);

    const rows = container.querySelectorAll('[data-month="1"] .charges li');
    expect(rows.length).toBeGreaterThan(0);

    const heights = (row: Element) =>
      [...row.querySelectorAll('.bar')].map((b) =>
        Number((b.getAttribute('style') ?? '').match(/height:\s*([\d.]+)px/)?.[1] ?? 0)
      );

    for (const row of rows) {
      expect(row.querySelectorAll('.cell')).toHaveLength(4);

      const label = row.querySelector('.what')!.textContent!;
      const drawn = heights(row).map((h) => h > 0);
      if (label === 'AppleCare+') {
        // Billed by Apple whatever you did about the phone.
        expect(drawn).toEqual([true, true, true, true]);
      } else if (label === 'Lease payment') {
        // Only the lease column, and it is the third.
        expect(drawn).toEqual([false, false, true, false]);
      }
    }
  });

  it('puts small tax bars directly after each taxed monthly charge', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    await user.click(screen.getByText('AppleCare+ monthly'));
    const rows = [...container.querySelectorAll('[data-month="1"] .charges li')];
    for (const label of ['Installment', 'Lease payment', 'AppleCare+']) {
      const index = rows.findIndex((row) => row.querySelector('.what')?.textContent === label);
      const tax = rows[index + 1];
      expect(tax.querySelector('.what')?.textContent).toBe(`Tax on ${label}`);
      expect(tax.querySelector('[data-cat="tax"]')).toBeTruthy();
      const bars = [...rows[index].querySelectorAll('.bar')];
      [...tax.querySelectorAll('.bar')].forEach((bar, column) => {
        const height = Number((bar as HTMLElement).style.height.replace('px', ''));
        const base = Number((bars[column] as HTMLElement).style.height.replace('px', ''));
        expect(height).toBeLessThanOrEqual(base);
        expect(height > 0).toBe(base > 0);
      });
    }
  });

  it('sizes the bars against the biggest charge of that month', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);

    const bars = [...container.querySelectorAll('[data-month="1"] .bar')].map((b) =>
      Number((b.getAttribute('style') ?? '').match(/height:\s*([\d.]+)px/)?.[1] ?? 0)
    );
    // One bar reaches the top of the track; nothing exceeds it.
    expect(Math.max(...bars)).toBe(26);
  });

  it('rewrites the ledger when you change the ending', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);
    await walkThrough(user);
    await chooseEnding(user);

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
    await chooseEnding(user, 'Hand it back');

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

  /**
   * A trade-in bigger than the lease can absorb comes back as Apple credit
   * rather than as a cheaper phone, which is the thing nobody tells you.
   */
  it('says when a trade-in is too big for the lease to use', async () => {
    const user = userEvent.setup();
    const { container } = render(Page);

    await user.click(screen.getByText('Something else'));
    const price = screen.getByLabelText(/Sticker price/i) as HTMLInputElement;
    await user.clear(price);
    await user.type(price, '999');
    await user.click(screen.getByText('Yes, I have one'));
    const trade = screen.getByLabelText(/Trade-in credit/i) as HTMLInputElement;
    await user.clear(trade);
    await user.type(trade, '800');
    // By the radio, not by its text: the surplus warning this test is about
    // names the terms too.
    await user.click(container.querySelector('input[name="term"][value="12"]')!);
    await user.click(screen.getByText('No AppleCare'));

    const dayOne = container.querySelector('[data-month="0"]')!;
    expect(dayOne.textContent).toMatch(/Apple credit back/);
    expect(dayOne.textContent).toMatch(/\$300\.50/);

    // Drawn below the line, outlined, only in the column that could not use it.
    const row = [...dayOne.querySelectorAll('.charges li')].find(
      (li) => li.querySelector('.what')?.textContent === 'Apple credit back'
    )!;
    expect(row.querySelector('.bars.credit')).toBeTruthy();
    const drawn = [...row.querySelectorAll('.bar')].map(
      (b) => Number((b.getAttribute('style') ?? '').match(/height:\s*([\d.]+)px/)?.[1] ?? 0) > 0
    );
    expect(drawn).toEqual([false, false, true, false]);

    // And the same finding where someone entering a trade-in would meet it.
    expect(screen.getByText(/bigger than the lease can use/i)).toBeTruthy();
  });
});
