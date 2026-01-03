<script lang="ts">
  import ShaderCanvas from '$lib/components/ShaderCanvas.svelte';
  import { onMount } from 'svelte';

  type ShaderInfo = {
    name: string;
    filename: string;
    description: string;
    enabled: boolean;
  };

  let shaders = $state<ShaderInfo[]>([
    {
      name: 'Focus Cursor',
      filename: 'focus_cursor.glsl',
      description: 'Zooming cursor highlight on focus',
      enabled: true
    },
    {
      name: 'Blur Vignette',
      filename: 'blur_vignette.glsl',
      description: 'Vignette and bloom when unfocused',
      enabled: false
    },
    {
      name: 'Cursor Smear',
      filename: 'cursor_smear_rocket.glsl',
      description: 'Rocket trail when cursor moves',
      enabled: false
    },
    {
      name: 'CRT Blur',
      filename: 'blur_crt.glsl',
      description: 'Retro CRT effect when unfocused',
      enabled: false
    }
  ]);

  let shaderCode = $state<Map<string, string>>(new Map());
  let cursorColor = $state([0.953, 0.722, 0.529, 1.0]); // Catppuccin Peach
  let imageUrl = $state<string | null>('/images/editor-bg.png');

  // Load shader from file
  async function loadShader(filename: string): Promise<string | null> {
    try {
      const response = await fetch(`/shaders/${filename}`);
      if (!response.ok) {
        console.error(`Failed to load shader: ${filename}`);
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
    for (const shader of shaders) {
      const code = await loadShader(shader.filename);
      if (code) {
        shaderCode.set(shader.filename, code);
      }
    }
    // Trigger reactivity
    shaderCode = new Map(shaderCode);
  });

  // Get active shaders in order
  const activeShaders = $derived(
    shaders
      .filter((s) => s.enabled && shaderCode.has(s.filename))
      .map((s) => shaderCode.get(s.filename)!)
  );

  // Toggle shader enabled state
  function toggleShader(index: number) {
    shaders[index].enabled = !shaders[index].enabled;
  }
</script>

<div class="container mx-auto p-8">
  <h1 class="mb-8 h1">Shader Canvas Demo</h1>

  <div class="mb-6">
    <h2 class="mb-3 h3">Active Shaders</h2>
    <div class="space-y-2">
      {#each shaders as shader, index}
        <label class="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-surface-100-900">
          <input
            type="checkbox"
            class="checkbox"
            checked={shader.enabled}
            onchange={() => toggleShader(index)}
          />
          <div class="flex-1">
            <div class="font-semibold">{shader.name}</div>
            <div class="text-surface-600-400 text-sm">{shader.description}</div>
          </div>
        </label>
      {/each}
    </div>
  </div>

  <div class="mb-4 grid grid-cols-2 gap-4">
    <label class="label">
      <span>Cursor Color</span>
      <input
        type="color"
        value="#f5a97f"
        onchange={(e) => {
          const hex = e.currentTarget.value;
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;
          cursorColor = [r, g, b, 1.0];
        }}
      />
    </label>

    <label class="label">
      <span>Background Image URL</span>
      <input
        class="input"
        type="text"
        placeholder="https://example.com/image.jpg or /path/to/image.jpg"
        value={imageUrl || ''}
        oninput={(e) => {
          const value = e.currentTarget.value.trim();
          imageUrl = value || null;
        }}
      />
    </label>
  </div>

  <div class="card p-4">
    {#if activeShaders.length > 0}
      <ShaderCanvas
        fragmentShaders={activeShaders}
        {imageUrl}
        width={800}
        height={600}
        {cursorColor}
        className="rounded-lg border-2 border-surface-400-600"
      />
    {:else}
      <div class="bg-surface-100-900 flex h-[600px] w-[800px] items-center justify-center rounded-lg">
        <p class="text-surface-600-400">Select at least one shader to see the effect</p>
      </div>
    {/if}
  </div>

  <div class="mt-8">
    <h2 class="mb-4 h2">Instructions</h2>
    <ul class="list">
      <li><strong>Select shaders:</strong> Check/uncheck boxes to enable multiple shaders at once</li>
      <li><strong>Shader order:</strong> Shaders are applied in the order shown (top to bottom)</li>
      <li><strong>Click the canvas</strong> to move the cursor position (affects cursor-based shaders)</li>
      <li><strong>Focus/blur:</strong> Click outside canvas to see unfocus effects (blur shaders)</li>
      <li><strong>Cursor color:</strong> Change the color picker to customize cursor appearance</li>
      <li>
        <strong>Background image:</strong> Change the URL to use a different background (default is editor screenshot)
      </li>
      <li>
        <strong>Multi-pass rendering:</strong> Each shader processes the output of the previous shader
        in sequence
      </li>
    </ul>

    <h3 class="mb-2 mt-6 h3">Shader Descriptions</h3>
    <ul class="list">
      <li><strong>Focus Cursor:</strong> Zooming cursor highlight animation when canvas gains focus</li>
      <li><strong>Blur Vignette:</strong> Vignette and subtle bloom when canvas is unfocused</li>
      <li><strong>Cursor Smear:</strong> Rocket trail effect following cursor movement</li>
      <li><strong>CRT Blur:</strong> Retro CRT monitor effect when unfocused (scan lines, bloom, etc.)</li>
    </ul>
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
