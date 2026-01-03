<script lang="ts">
	import type { ShaderInfo } from './ShaderCanvas.svelte';

	let {
		shaders = $bindable<ShaderInfo[]>([]),
		show = $bindable(false)
	}: {
		shaders: ShaderInfo[];
		show?: boolean;
	} = $props();

	const toggle = () => {
		show = !show;
	};

	const toggleShader = (index: number) => {
		shaders[index].enabled = !shaders[index].enabled;
	};
</script>

<button
	onclick={toggle}
	class="absolute left-2 top-2 rounded bg-surface-200-800 px-2 py-1 text-xs text-surface-950-50 opacity-50 hover:opacity-100"
	aria-label="Toggle shader selection menu"
>
	☰ shaders
</button>

{#if show}
	<div
		role="region"
		tabindex="-1"
		aria-label="Shader selection menu"
		class="absolute left-2 top-12 max-h-[80%] w-64 overflow-auto rounded-lg border border-surface-300-700 bg-surface-50-950 p-3 shadow-lg"
	>
		<div class="mb-2 flex items-center justify-between border-b border-surface-300-700 pb-2">
			<span class="font-bold text-surface-900-100">Active Shaders</span>
		</div>

		<div class="space-y-1">
			{#each shaders as shader, index (shader.name)}
				<label
					class="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-surface-100-900"
				>
					<input
						type="checkbox"
						class="checkbox"
						checked={shader.enabled}
						onchange={() => toggleShader(index)}
					/>
					<span class="text-sm text-surface-900-100">{shader.name}</span>
				</label>
			{/each}
		</div>
	</div>
{/if}
