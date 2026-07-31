<script lang="ts" generics="T extends string | number">
  interface Option {
    value: T;
    label: string;
    /** Big number under the label — usually the monthly payment. */
    sub?: string;
    /** Small print under that. */
    note?: string;
  }

  interface Props {
    options: Option[];
    value: T | null;
    name: string;
    /** Minimum tile width; the grid fits as many as will go. */
    min?: string;
  }

  let { options, value = $bindable(), name, min = '150px' }: Props = $props();
</script>

<fieldset class="tiles" style="--min: {min}">
  <legend class="sr-only">{name}</legend>
  {#each options as option (option.value)}
    <label class="tile" class:on={value === option.value}>
      <input type="radio" {name} value={option.value} bind:group={value} />
      <span class="label">{option.label}</span>
      {#if option.sub}<span class="sub">{option.sub}</span>{/if}
      {#if option.note}<span class="note">{option.note}</span>{/if}
      <span class="check" aria-hidden="true"></span>
    </label>
  {/each}
</fieldset>

<style>
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(var(--min), 1fr));
    gap: 10px;
    margin: 0;
    border: 0;
    padding: 0;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .tile {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 3px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    padding: 15px 38px 15px 16px;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background 0.15s ease;
  }
  .tile:hover {
    border-color: color-mix(in oklch, var(--accent) 55%, var(--border));
  }
  .tile:focus-within {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .tile.on {
    border-color: var(--accent);
    background: color-mix(in oklch, var(--accent) 9%, var(--surface));
  }

  /* The radio drives everything; it just isn't the thing you look at. */
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .label {
    font-family: var(--font-body);
    font-weight: 560;
    font-size: 14.5px;
    letter-spacing: -0.01em;
    line-height: 1.35;
  }
  .sub {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 17px;
    letter-spacing: -0.02em;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
  .note {
    font-size: 12px;
    line-height: 1.45;
    color: var(--faint);
    text-wrap: pretty;
  }

  .check {
    position: absolute;
    top: 15px;
    right: 14px;
    height: 16px;
    width: 16px;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: var(--bg);
  }
  .tile.on .check {
    border-color: var(--accent);
    background: var(--accent);
  }
  .tile.on .check::after {
    position: absolute;
    top: 3px;
    left: 5.5px;
    height: 7px;
    width: 4px;
    border: solid var(--bg);
    border-width: 0 1.75px 1.75px 0;
    content: '';
    transform: rotate(43deg);
  }
</style>
