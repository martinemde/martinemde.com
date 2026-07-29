<script lang="ts">
  /**
   * A labelled numeric input that keeps `null` for "not set" so callers can fall
   * back to a default while still showing it in the placeholder.
   */
  interface Props {
    label: string;
    value: number | null;
    placeholder?: string | number;
    prefix?: string;
    suffix?: string;
    step?: number;
    min?: number;
    max?: number;
    hint?: string;
  }

  let {
    label,
    value = $bindable(),
    placeholder = '0',
    prefix = '',
    suffix = '',
    step = 1,
    min = 0,
    max,
    hint
  }: Props = $props();
</script>

<label class="field">
  <span class="field-label">{label}</span>
  <span class="field-input" class:has-prefix={!!prefix} class:has-suffix={!!suffix}>
    {#if prefix}<span class="affix affix-pre">{prefix}</span>{/if}
    <input
      type="number"
      bind:value
      placeholder={String(placeholder)}
      {step}
      {min}
      {max}
      inputmode="decimal"
    />
    {#if suffix}<span class="affix affix-post">{suffix}</span>{/if}
  </span>
  {#if hint}<span class="field-hint">{hint}</span>{/if}
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .field-label {
    font-family: var(--font-mono);
    font-weight: 480;
    font-size: 11.5px;
    letter-spacing: 0.02em;
    color: var(--muted);
  }
  .field-input {
    position: relative;
    display: block;
  }
  .affix {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--faint);
    pointer-events: none;
  }
  .affix-pre {
    left: 10px;
  }
  .affix-post {
    right: 10px;
  }
  input {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    padding: 9px 11px;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 13.5px;
    color: var(--text);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .has-prefix input {
    padding-left: 24px;
  }
  .has-suffix input {
    padding-right: 26px;
  }
  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 18%, transparent);
  }
  input::placeholder {
    color: var(--faint);
  }
  /* Hide spinners — they crowd the tabular numbers. */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    appearance: none;
    margin: 0;
  }
  input {
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .field-hint {
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--faint);
    text-wrap: pretty;
  }
</style>
