<script lang="ts">
	import type { ShaderInfo } from './ShaderCanvas.svelte';

	let {
		shaders = $bindable<ShaderInfo[]>([]),
		cursorColor = $bindable([1.0, 1.0, 1.0, 1.0]),
		prevCursorColor = $bindable([1.0, 1.0, 1.0, 1.0]),
		show = $bindable(false)
	}: {
		shaders: ShaderInfo[];
		cursorColor?: number[];
		prevCursorColor?: number[];
		show?: boolean;
	} = $props();

	const toggle = () => {
		show = !show;
	};

	const toggleShader = (index: number) => {
		shaders[index].enabled = !shaders[index].enabled;
	};

	// Helper functions for color conversion
	function colorToHex(color: number[]): string {
		const r = Math.round(color[0] * 255)
			.toString(16)
			.padStart(2, '0');
		const g = Math.round(color[1] * 255)
			.toString(16)
			.padStart(2, '0');
		const b = Math.round(color[2] * 255)
			.toString(16)
			.padStart(2, '0');
		return `#${r}${g}${b}`;
	}

	function hexToColor(hex: string): number[] {
		const r = parseInt(hex.slice(1, 3), 16) / 255;
		const g = parseInt(hex.slice(3, 5), 16) / 255;
		const b = parseInt(hex.slice(5, 7), 16) / 255;
		return [r, g, b, 1.0];
	}
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

		<div class="space-y-1 pb-3">
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

		<div class="space-y-2 border-t border-surface-300-700 pt-3">
			<div class="text-xs font-semibold text-surface-900-100">Cursor Colors</div>

			<label class="flex flex-col gap-1">
				<span class="text-xs text-surface-800-200">Current</span>
				<input
					type="color"
					class="h-8 w-full cursor-pointer rounded border border-surface-300-700"
					value={colorToHex(cursorColor)}
					onchange={(e) => (cursorColor = hexToColor(e.currentTarget.value))}
				/>
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-xs text-surface-800-200">Previous (swaps on click)</span>
				<input
					type="color"
					class="h-8 w-full cursor-pointer rounded border border-surface-300-700"
					value={colorToHex(prevCursorColor)}
					onchange={(e) => (prevCursorColor = hexToColor(e.currentTarget.value))}
				/>
			</label>
		</div>
	</div>
{/if}
