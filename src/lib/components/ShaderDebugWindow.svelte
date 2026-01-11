<script lang="ts">
  type ShaderUniforms = {
    iResolution: number[];
    iTime: number;
    iFocus: number;
    iTimeFocus: number;
    iCurrentCursor: number[];
    iPreviousCursor: number[];
    iCurrentCursorColor: number[];
    iPreviousCursorColor: number[];
    iTimeCursorChange: number;
  };

  let {
    uniforms,
    show = $bindable(false)
  }: {
    uniforms: ShaderUniforms;
    show?: boolean;
  } = $props();

  const toggle = () => {
    show = !show;
  };
</script>

<button
  onclick={toggle}
  class="absolute right-2 bottom-2 rounded bg-surface-200-800 px-2 py-1 text-xs text-surface-950-50 opacity-50 hover:opacity-100"
  aria-label="Toggle debug window"
>
  🐛 debug
</button>

{#if show}
  <div
    role="region"
    tabindex="-1"
    aria-label="Shader debug information"
    class="absolute top-2 right-2 max-h-[80%] w-64 overflow-auto rounded-lg border border-surface-300-700 bg-surface-50-950 p-3 font-mono text-xs shadow-lg"
  >
    <div class="mb-2 flex items-center justify-between border-b border-surface-300-700 pb-2">
      <span class="font-bold text-surface-900-100">Shader Uniforms</span>
    </div>

    <div class="space-y-2 text-surface-800-200">
      <div>
        <div class="font-semibold text-surface-900-100">iResolution</div>
        <div class="text-surface-700-300">
          [{uniforms.iResolution.map((v) => v.toFixed(1)).join(', ')}]
        </div>
      </div>

      <div>
        <div class="font-semibold text-surface-900-100">iTime</div>
        <div class="text-surface-700-300">{uniforms.iTime.toFixed(3)}</div>
      </div>

      <div>
        <div class="font-semibold text-surface-900-100">iFocus</div>
        <div class="text-surface-700-300">{uniforms.iFocus}</div>
      </div>

      <div>
        <div class="font-semibold text-surface-900-100">iTimeFocus</div>
        <div class="text-surface-700-300">{uniforms.iTimeFocus.toFixed(3)}</div>
      </div>

      <div>
        <div class="font-semibold text-surface-900-100">iCurrentCursor</div>
        <div class="text-surface-700-300">
          [{uniforms.iCurrentCursor.map((v) => v.toFixed(1)).join(', ')}]
        </div>
      </div>

      <div>
        <div class="font-semibold text-surface-900-100">iPreviousCursor</div>
        <div class="text-surface-700-300">
          [{uniforms.iPreviousCursor.map((v) => v.toFixed(1)).join(', ')}]
        </div>
      </div>

      <div>
        <div class="font-semibold text-surface-900-100">iCurrentCursorColor</div>
        <div class="text-surface-700-300">
          [{uniforms.iCurrentCursorColor.map((v) => v.toFixed(2)).join(', ')}]
        </div>
      </div>

      <div>
        <div class="font-semibold text-surface-900-100">iPreviousCursorColor</div>
        <div class="text-surface-700-300">
          [{uniforms.iPreviousCursorColor.map((v) => v.toFixed(2)).join(', ')}]
        </div>
      </div>

      <div>
        <div class="font-semibold text-surface-900-100">iTimeCursorChange</div>
        <div class="text-surface-700-300">{uniforms.iTimeCursorChange.toFixed(3)}</div>
      </div>
    </div>
  </div>
{/if}
