import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Field from './Field.svelte';

/**
 * On a phone, a focused box scrolled out of sight drops focus so the keyboard
 * closes instead of fighting the sticky graph for the viewport.
 */
describe('Field keyboard dismissal', () => {
  let report: (visible: boolean) => void;
  let coarse = true;

  beforeEach(() => {
    report = () => {};
    coarse = true;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          report = (visible) =>
            callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as never);
        }
        observe() {}
        unobserve() {}
        disconnect() {
          report = () => {};
        }
      }
    );
    window.matchMedia = vi.fn(() => ({ matches: coarse })) as never;
  });

  function focusField() {
    render(Field, { label: 'Price', value: 100 });
    const input = screen.getByRole('spinbutton');
    input.focus();
    return input;
  }

  it('blurs once the focused box scrolls out of view', () => {
    const input = focusField();
    report(true);
    report(false);
    expect(document.activeElement).not.toBe(input);
  });

  it('ignores a hidden report before the box was ever seen', () => {
    const input = focusField();
    report(false);
    expect(document.activeElement).toBe(input);
  });

  it('leaves fine-pointer devices alone', () => {
    coarse = false;
    const input = focusField();
    report(true);
    report(false);
    expect(document.activeElement).toBe(input);
  });
});
