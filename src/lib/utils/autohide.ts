/**
 * Scroll-direction latch for the auto-hiding site header.
 *
 * Kept free of DOM access so the hysteresis is unit-testable: the caller reads
 * and clamps `scrollY`, this decides whether the bar should be hidden.
 *
 * The dead zone is what stops the flicker. A direction change re-anchors, so
 * the bar only reacts once you have travelled `deadZone` px *since reversing* —
 * thumb jitter, momentum wobble and trackpad noise under that never flip it.
 */
export interface AutoHideOptions {
  /** Scroll offset below which the bar is always shown. Default 120. */
  revealZone?: number;
  /** Travel required after a direction change before the bar reacts. Default 24. */
  deadZone?: number;
  /** Veto: return true to keep the bar visible regardless of direction. */
  hold?: () => boolean;
}

export interface AutoHide {
  /** Whether the bar should currently be hidden. */
  readonly hidden: boolean;
  /** Feed a clamped scroll offset; returns the new hidden state. */
  update(y: number): boolean;
  /** Show the bar and re-anchor — e.g. after a client-side navigation. */
  reset(y?: number): boolean;
}

export function createAutoHide({
  revealZone = 120,
  deadZone = 24,
  hold
}: AutoHideOptions = {}): AutoHide {
  let hidden = false;
  let lastY = 0;
  let anchorY = 0;
  let lastDir = 0;

  return {
    get hidden() {
      return hidden;
    },

    reset(y = 0) {
      hidden = false;
      lastY = anchorY = y;
      lastDir = 0;
      return hidden;
    },

    update(y) {
      if (y === lastY) return hidden;

      const dir = y > lastY ? 1 : -1;
      if (dir !== lastDir) {
        lastDir = dir;
        anchorY = lastY; // reversing restarts the dead zone from here
      }
      lastY = y;

      if (y <= revealZone) {
        // Up in the masthead there is nothing to reclaim by hiding.
        hidden = false;
      } else if (hold?.()) {
        // Held visible. The anchor keeps tracking, so the next real gesture still lands.
      } else if (dir > 0 ? y - anchorY > deadZone : anchorY - y > deadZone) {
        hidden = dir > 0;
      }

      return hidden;
    }
  };
}
