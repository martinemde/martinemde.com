<script lang="ts">
  import ShaderCanvas, { type ShaderInfo } from '$lib/components/ShaderCanvas.svelte';
  import { onMount } from 'svelte';

  // Shader configurations with filenames
  const shaderConfigs = [
    { name: 'Focus Cursor', filename: 'focus_cursor.glsl', enabled: true },
    { name: 'Blur Vignette', filename: 'blur_vignette.glsl', enabled: false },
    { name: 'Cursor Smear', filename: 'cursor_smear_rocket.glsl', enabled: true },
    { name: 'CRT Blur', filename: 'blur_crt.glsl', enabled: true },
    { name: 'Cursor Rectangle', filename: 'cursor_rectangle.glsl', enabled: true }
  ];

  let shaders = $state<ShaderInfo[]>([]);
  let cursorColor = $state([0.953, 0.722, 0.529, 1.0]); // Catppuccin Peach
  let prevCursorColor = $state([0.71, 0.733, 0.98, 1.0]); // Catppuccin Lavender

  // Load shader from file
  async function loadShader(filename: string): Promise<string | null> {
    try {
      const response = await fetch(`/shaders/${filename}`);
      if (!response.ok) {
        console.error(`Failed to load shader: ${filename} (${response.status})`);
        return null;
      }
      return await response.text();
    } catch (error) {
      console.error(`Error loading shader ${filename}:`, error);
      return null;
    }
  }

  // Load all shaders on mount
  onMount(async () => {
    const loadedShaders: ShaderInfo[] = [];

    for (const config of shaderConfigs) {
      const code = await loadShader(config.filename);
      if (code) {
        loadedShaders.push({
          name: config.name,
          code,
          enabled: config.enabled
        });
      }
    }

    shaders = loadedShaders;
  });
</script>

<div class="container mx-auto p-8">
  <h1 class="mb-8 h1">Ghostty Shaders</h1>

  <div class="card relative p-4">
    {#if shaders.length > 0}
      <ShaderCanvas
        bind:shaders
        width={800}
        height={600}
        swapColorsOnClick={true}
        className="rounded-lg border-2 border-surface-400-600"
        bind:cursorColor
        bind:prevCursorColor
      />
    {:else}
      <div class="flex h-150 w-200 items-center justify-center rounded-lg bg-surface-100-900">
        <p class="text-surface-600-400">Loading shaders...</p>
      </div>
    {/if}
  </div>

  <div class="mt-8">
    <h2 class="mb-4 h2">Available Uniforms</h2>
    <div class="table-container">
      <table class="table-hover table">
        <thead>
          <tr>
            <th>Uniform</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>iTime</code></td>
            <td>float</td>
            <td>Elapsed time in seconds</td>
          </tr>
          <tr>
            <td><code>iResolution</code></td>
            <td>vec3</td>
            <td>Canvas width, height, aspect ratio</td>
          </tr>
          <tr>
            <td><code>iFocus</code></td>
            <td>int</td>
            <td>1 when focused, 0 when blurred</td>
          </tr>
          <tr>
            <td><code>iTimeFocus</code></td>
            <td>float</td>
            <td>iTime when last focused</td>
          </tr>
          <tr>
            <td><code>iCurrentCursor</code></td>
            <td>vec4</td>
            <td>Current cursor (xy = position, zw = size)</td>
          </tr>
          <tr>
            <td><code>iPreviousCursor</code></td>
            <td>vec4</td>
            <td>Previous cursor (xy = position, zw = size)</td>
          </tr>
          <tr>
            <td><code>iCurrentCursorColor</code></td>
            <td>vec4</td>
            <td>Cursor color (RGBA)</td>
          </tr>
          <tr>
            <td><code>iTimeCursorChange</code></td>
            <td>float</td>
            <td>iTime when cursor last moved</td>
          </tr>
          <tr>
            <td><code>iChannel0</code></td>
            <td>sampler2D</td>
            <td>Background texture (optional)</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
