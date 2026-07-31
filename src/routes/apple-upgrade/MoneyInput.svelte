<script lang="ts">
  interface Props {
    label: string;
    value: number | null;
    mode?: 'currency' | 'percent' | 'number';
    step?: number;
    min?: number;
    hint?: string;
  }

  let { label, value = $bindable(), mode = 'currency', step, min = 0, hint }: Props = $props();
</script>

<label class="space-y-1">
  <span class="text-sm font-medium text-surface-950-50">{label}</span>
  <div class="relative">
    {#if mode === 'currency'}
      <span
        class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-surface-600-400"
        >$</span
      >
    {/if}
    <input
      type="number"
      bind:value
      {min}
      step={step ?? (mode === 'currency' ? 1 : 0.5)}
      placeholder="0"
      class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 py-2 text-right text-sm text-surface-950-50 tabular-nums {mode ===
      'currency'
        ? 'pr-3 pl-7'
        : mode === 'percent'
          ? 'pr-8 pl-3'
          : 'px-3'}"
    />
    {#if mode === 'percent'}
      <span
        class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-surface-600-400"
        >%</span
      >
    {/if}
  </div>
  {#if hint}
    <span class="block text-xs text-surface-600-400">{hint}</span>
  {/if}
</label>
