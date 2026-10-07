import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import Ledger from './Ledger.svelte';
import { allScenarios } from '#lib/apple-upgrade/model.ts';
import { buildInputs } from '#lib/apple-upgrade/presets.ts';

describe('Ledger month DOM references', () => {
  let passedMonth: number;
  let frame: FrameRequestCallback | undefined;

  beforeEach(() => {
    passedMonth = -1;
    frame = undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frame = callback;
        return 1;
      })
    );
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      const month = this.dataset.month;
      return {
        top: month === undefined || Number(month) <= passedMonth ? 0 : 10000,
        height: 57
      } as DOMRect;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function mount(limit = 2) {
    return render(Ledger, {
      scenarios: allScenarios(buildInputs({ listPrice: 1199 })),
      beats: new Map(),
      limit
    });
  }

  async function scrollTo(month: number) {
    passedMonth = month;
    window.dispatchEvent(new Event('scroll'));
    const callback = frame;
    frame = undefined;
    expect(callback).toBeDefined();
    callback!(0);
    await tick();
  }

  it('binds month elements without non-reactive binding warnings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mount();
    await tick();
    expect(warn.mock.calls.flat().join(' ')).not.toContain('binding_property_non_reactive');
  });

  it('tracks the last month above the reading line and batches scroll events', async () => {
    const { container } = mount();
    await tick();
    expect(container.querySelector('.month.on')).toBeNull();
    await scrollTo(1);
    expect(container.querySelector('.month.on')?.getAttribute('data-month')).toBe('1');
    expect(container.querySelectorAll('.month.landed')).toHaveLength(2);
    expect(container.querySelector('.panel-wrap h3')?.textContent).toBe('Total spent by month 1');
    const raf = vi.mocked(requestAnimationFrame);
    raf.mockClear();
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    expect(raf).toHaveBeenCalledTimes(1);
    frame!(0);
    await tick();
    await scrollTo(-1);
    expect(container.querySelector('.month.on')).toBeNull();
  });

  it('uses live references after months are removed and added again', async () => {
    const { container, rerender } = mount();
    await tick();
    await scrollTo(2);
    const removed = container.querySelector('[data-month="2"]')!;
    await rerender({ limit: 0 });
    await tick();
    expect(container.querySelectorAll('.month')).toHaveLength(1);
    expect(container.querySelector('.month.on')?.getAttribute('data-month')).toBe('0');
    await rerender({ limit: 2 });
    await tick();
    expect(container.querySelector('[data-month="2"]')).not.toBe(removed);
    await scrollTo(2);
    expect(container.querySelector('.month.on')?.getAttribute('data-month')).toBe('2');
  });
});
