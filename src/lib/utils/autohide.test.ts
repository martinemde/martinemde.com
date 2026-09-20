import { describe, it, expect } from 'vitest';
import { createAutoHide } from './autohide';

// Small, explicit zones keep the arithmetic in these tests readable.
const opts = { revealZone: 100, deadZone: 20 };

describe('createAutoHide', () => {
  it('starts visible', () => {
    expect(createAutoHide(opts).hidden).toBe(false);
  });

  it('stays visible inside the reveal zone, however far you scroll', () => {
    const bar = createAutoHide(opts);
    for (const y of [10, 40, 80, 100]) bar.update(y);
    expect(bar.hidden).toBe(false);
  });

  it('hides as soon as one continuous scroll clears the reveal zone', () => {
    const bar = createAutoHide(opts);
    // The anchor sits where this downward run began — the top — so by the time
    // you leave the reveal zone you are already well past the dead zone. There
    // is nothing to debounce in a gesture that only ever went one way.
    bar.update(60);
    expect(bar.hidden).toBe(false);
    expect(bar.update(101)).toBe(true);
  });

  it('measures the dead zone from the last reversal, not from the reveal zone', () => {
    const bar = createAutoHide(opts);
    bar.update(400);
    bar.update(380); // reversal -> anchored at 400, 20px up is not enough
    expect(bar.hidden).toBe(true);
    expect(bar.update(379)).toBe(false); // 21px up — over it
  });

  it('ignores small movements in either direction', () => {
    const bar = createAutoHide(opts);
    bar.update(400); // well past the reveal zone
    bar.update(500);
    expect(bar.hidden).toBe(true);

    // Jitter: a few px up, a few px down, repeatedly. Nothing should flip.
    for (const y of [495, 498, 492, 496, 490, 494, 489]) {
      expect(bar.update(y)).toBe(true);
    }
  });

  it('reveals on a deliberate scroll up', () => {
    const bar = createAutoHide(opts);
    bar.update(400);
    bar.update(500);
    expect(bar.hidden).toBe(true);
    expect(bar.update(490)).toBe(true); // 10px up — not enough
    expect(bar.update(475)).toBe(false); // 25px up — enough
  });

  it('requires a fresh dead zone after each flip', () => {
    const bar = createAutoHide(opts);
    bar.update(400);
    bar.update(500);
    expect(bar.hidden).toBe(true);
    bar.update(470); // reversal past the dead zone -> visible
    expect(bar.hidden).toBe(false);

    // Re-hiding needs another full dead zone measured from the reversal point.
    expect(bar.update(480)).toBe(false);
    expect(bar.update(491)).toBe(true);
  });

  it('re-reveals when you scroll back into the reveal zone', () => {
    const bar = createAutoHide(opts);
    bar.update(400);
    bar.update(600);
    expect(bar.hidden).toBe(true);
    // A jump straight to the top (anchor link, scroll-to-top) shows the bar.
    expect(bar.update(50)).toBe(false);
  });

  it('ignores repeated identical offsets', () => {
    const bar = createAutoHide(opts);
    bar.update(400);
    bar.update(500);
    expect(bar.update(500)).toBe(true);
    expect(bar.update(500)).toBe(true);
  });

  it('honours the hold veto but keeps tracking direction', () => {
    let held = true;
    const bar = createAutoHide({ ...opts, hold: () => held });

    bar.update(400);
    expect(bar.update(500)).toBe(false); // would hide, but held visible

    held = false;
    expect(bar.update(560)).toBe(true); // hides as soon as the hold lifts
  });

  it('reset shows the bar and re-anchors at the given offset', () => {
    const bar = createAutoHide(opts);
    bar.update(400);
    bar.update(500);
    expect(bar.hidden).toBe(true);

    expect(bar.reset(500)).toBe(false);
    expect(bar.update(510)).toBe(false); // dead zone measured from 500 again
    expect(bar.update(525)).toBe(true);
  });

  it('defaults to a 120px reveal zone and a 24px dead zone', () => {
    const bar = createAutoHide();
    expect(bar.update(120)).toBe(false); // still in the reveal zone
    expect(bar.update(121)).toBe(true);

    bar.update(600);
    expect(bar.update(576)).toBe(true); // exactly 24px up — not yet
    expect(bar.update(575)).toBe(false); // 25px — over it
  });
});
