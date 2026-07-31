<script lang="ts">
  interface Props {
    label: string;
    value: number;
    /** Shown inside the input. '$' sits left, '%' sits right. */
    unit?: '$' | '%' | '';
    hint?: string;
    step?: number;
    min?: number;
  }

  let { label, value = $bindable(), unit = '$', hint, step = 1, min = 0 }: Props = $props();
</script>

<label class="field">
  <span class="label">{label}</span>
  <span class="wrap" class:money={unit === '$'} class:pct={unit === '%'}>
    {#if unit === '$'}<span class="unit left" aria-hidden="true">$</span>{/if}
    <input type="number" bind:value {step} {min} inputmode="decimal" />
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
  .label {
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
