<script lang="ts">
  interface Props {
    label: string;
    value: number;
    /** Shown inside the input. '$' sits left, '%' sits right. */
    unit?: '$' | '%' | '';
    hint?: string;
    step?: number;
    min?: number;
    id?: string;
  }

  let { label, value = $bindable(), unit = '$', hint, step = 1, min = 0, id }: Props = $props();

  /**
   * A number input reports an empty box as null, and `bind:value` would push
   * that straight into the model — so clearing a field to retype it took the
   * whole page down. Only finite numbers go upstream; the box keeps whatever
   * you are part-way through typing, and an empty one is restored on blur.
   */
  function onInput(event: Event & { currentTarget: HTMLInputElement }) {
    const next = event.currentTarget.valueAsNumber;
    if (Number.isFinite(next)) value = next;
  }

  /**
   * On a phone the open keyboard fights the sticky graph for the viewport and
   * iOS renders the panel in the wrong place. Once the focused box has been
   * scrolled out of sight nobody is typing into it any more, so drop focus and
   * let the keyboard go. Only the visible → hidden transition counts: a box
   * focused programmatically may report hidden before the browser scrolls it
   * into view.
   */
  let offscreen: IntersectionObserver | undefined;

  function onFocus(event: FocusEvent & { currentTarget: HTMLInputElement }) {
    const input = event.currentTarget;
    offscreen?.disconnect();
    offscreen = undefined;
    if (typeof IntersectionObserver === 'undefined') return;
    if (!window.matchMedia?.('(pointer: coarse)').matches) return;

    // The site header is sticky, so a box tucked under it is out of sight too.
    const header = document.querySelector('header');
    const top = header ? Math.round(header.getBoundingClientRect().height) : 0;
    let seen = false;
    offscreen = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) seen = true;
        else if (seen && document.activeElement === input) input.blur();
      },
      { rootMargin: `-${top}px 0px 0px 0px` }
    );
    offscreen.observe(input);
  }

  function onBlur(event: FocusEvent & { currentTarget: HTMLInputElement }) {
    offscreen?.disconnect();
    offscreen = undefined;
    if (!Number.isFinite(event.currentTarget.valueAsNumber)) {
      event.currentTarget.value = String(value);
    }
  }

  $effect(() => () => offscreen?.disconnect());
</script>

<label class="field">
  <span class="field-name">{label}</span>
  <span class="wrap" class:money={unit === '$'} class:pct={unit === '%'}>
    {#if unit === '$'}<span class="unit left" aria-hidden="true">$</span>{/if}
    <input
      {id}
      type="number"
      {value}
      {step}
      {min}
      inputmode="decimal"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck={false}
      oninput={onInput}
      onfocus={onFocus}
      onblur={onBlur}
    />
    {#if unit === '%'}<span class="unit right" aria-hidden="true">%</span>{/if}
  </span>
  {#if hint}<span class="hint">{hint}</span>{/if}
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  /* Not `.label` — a global form class owns that name. */
  .field-name {
    font-family: var(--font-body);
    font-weight: 520;
    font-size: 13.5px;
    letter-spacing: -0.005em;
  }
  .wrap {
    position: relative;
    display: block;
  }
  input {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--bg);
    padding: 9px 12px;
    color: var(--text);
    font-family: var(--font-mono);
    font-weight: 480;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .money input {
    padding-left: 26px;
  }
  .pct input {
    padding-right: 26px;
  }
  input:focus {
    border-color: var(--accent);
    outline: 2px solid color-mix(in oklch, var(--accent) 30%, transparent);
    outline-offset: 0;
  }
  .unit {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--faint);
  }
  .unit.left {
    left: 12px;
  }
  .unit.right {
    right: 12px;
  }
  .hint {
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--faint);
    text-wrap: pretty;
  }
</style>
