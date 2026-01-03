<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { compileShader, createProgram, wrapFragmentShader } from '$lib/webgl/shader-compiler';
  import { UniformManager } from '$lib/webgl/uniform-manager';
  import ShaderDebugWindow from './ShaderDebugWindow.svelte';
  import ShaderSelectionMenu from './ShaderSelectionMenu.svelte';

  export type ShaderInfo = {
    name: string;
    code: string;
    enabled: boolean;
  };

  // Props
  let {
    shaders = $bindable<ShaderInfo[]>([]),
    imageUrl = '/images/editor-bg.png',
    width = 800,
    height = 600,
    cursorColor = $bindable([1.0, 1.0, 1.0, 1.0]),
    prevCursorColor = $bindable([1.0, 1.0, 1.0, 1.0]),
    swapColorsOnClick = false,
    className = ''
  }: {
    shaders?: ShaderInfo[];
    imageUrl?: string | null;
    width?: number;
    height?: number;
    cursorColor?: number[];
    prevCursorColor?: number[];
    swapColorsOnClick?: boolean;
    className?: string;
  } = $props();

  // Filter to only enabled shaders for rendering
  const activeShaderCodes = $derived(
    shaders.filter((s) => s.enabled).map((s) => s.code)
  );

  // State
  let canvas: HTMLCanvasElement | null = $state(null);
  let gl: WebGL2RenderingContext | null = $state(null);
  let programs: WebGLProgram[] = $state([]);
  let backgroundProgram: WebGLProgram | null = $state(null);
  let framebuffers: WebGLFramebuffer[] = $state([]);
  let renderTextures: WebGLTexture[] = $state([]);
  let animationFrameId: number | null = $state(null);
  let startTime = $state(0);
  let focusTime = $state(0);
  let isFocused = $state(false);
  let cursorPos = $state({ x: 0, y: 0, width: 12, height: 18 });
  let prevCursorPos = $state({ x: 0, y: 0, width: 12, height: 18 });
  let cursorChangeTime = $state(0);
  let emptyTexture: WebGLTexture | null = $state(null);
  let imageTexture: WebGLTexture | null = $state(null);
  let showDebug = $state(false);
  let showShaderMenu = $state(false);
  let uniformManager = new UniformManager();

  // Helper to get current uniform values
  const getCurrentUniforms = () => {
    const canvasHeight = canvas?.height || height;
    return {
      iResolution: [canvas?.width || width, canvasHeight, 1.0],
      iTime: (performance.now() - startTime) / 1000.0,
      iFocus: isFocused ? 1 : 0,
      iTimeFocus: focusTime,
      iCurrentCursor: [cursorPos.x, canvasHeight - cursorPos.y, cursorPos.width, cursorPos.height],
      iPreviousCursor: [
        prevCursorPos.x,
        canvasHeight - prevCursorPos.y,
        prevCursorPos.width,
        prevCursorPos.height
      ],
      iCurrentCursorColor: cursorColor,
      iPreviousCursorColor: prevCursorColor,
      iTimeCursorChange: cursorChangeTime
    };
  };

  // Fixed vertex shader for full-screen quad
  const vertexShader = `#version 300 es
		in vec2 position;
		void main() {
			gl_Position = vec4(position, 0.0, 1.0);
		}
	`;

  // Initialize WebGL context
  const initWebGL = (): boolean => {
    if (!canvas) return false;

    const context = canvas.getContext('webgl2');
    if (!context) {
      console.error('WebGL2 not supported');
      return false;
    }

    gl = context;

    // Create a 1x1 black texture for iChannel0 when no texture is provided
    emptyTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, emptyTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return true;
  };

  // Load image and create texture
  const loadImageTexture = async (url: string): Promise<WebGLTexture | null> => {
    if (!gl) return null;

    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous'; // Enable CORS for external images

      image.onload = () => {
        if (!gl) {
          resolve(null);
          return;
        }

        const texture = gl.createTexture();
        if (!texture) {
          resolve(null);
          return;
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        console.log(`Loaded image texture: ${url} (${image.width}x${image.height})`);
        resolve(texture);
      };

      image.onerror = () => {
        console.error(`Failed to load image: ${url}`);
        resolve(null);
      };

      image.src = url;
    });
  };

  // Create framebuffers and textures for multi-pass rendering
  const createRenderTargets = (count: number) => {
    if (!gl || count === 0) return;

    // Clean up old framebuffers and textures
    framebuffers.forEach((fb) => gl?.deleteFramebuffer(fb));
    renderTextures.forEach((tex) => gl?.deleteTexture(tex));
    framebuffers = [];
    renderTextures = [];

    // Create framebuffers for shader chain (need count textures for ping-pong)
    for (let i = 0; i < count; i++) {
      // Create texture to render to
      const texture = gl.createTexture();
      if (!texture) continue;

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // Create framebuffer
      const framebuffer = gl.createFramebuffer();
      if (!framebuffer) continue;

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

      // Check framebuffer status
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.error(`Framebuffer ${i} not complete`);
      }

      renderTextures.push(texture);
      framebuffers.push(framebuffer);
    }

    // Unbind framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };


  // Setup full-screen quad geometry
  const setupGeometry = () => {
    if (!gl || programs.length === 0) return;

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Use first program for attribute location (all programs share same vertex shader)
    const positionLoc = gl.getAttribLocation(programs[0], 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  };


  // Render a shader pass
  const renderPass = (prog: WebGLProgram, targetTexture: WebGLTexture | null) => {
    if (!gl) return;

    const currentTime = (performance.now() - startTime) / 1000.0;
    const canvasHeight = canvas?.height || height;

    gl.useProgram(prog);

    // Update uniforms (pass program to setUniform)
    uniformManager.setUniform(gl, prog, 'iResolution', canvas?.width || width, canvasHeight, 1.0);
    uniformManager.setUniform(gl, prog, 'iTime', currentTime);

    // Set iChannel0 to the target texture (or empty texture if none)
    if (targetTexture) {
      uniformManager.setUniform(gl, prog, 'iChannel0', targetTexture);
    } else if (emptyTexture) {
      uniformManager.setUniform(gl, prog, 'iChannel0', emptyTexture);
    }

    uniformManager.setUniform(gl, prog, 'iFocus', isFocused ? 1 : 0);
    uniformManager.setUniform(gl, prog, 'iTimeFocus', focusTime);

    // Convert cursor Y coordinate from DOM (top-left) to WebGL (bottom-left) coordinate system
    uniformManager.setUniform(
      gl,
      prog,
      'iCurrentCursor',
      cursorPos.x,
      canvasHeight - cursorPos.y,
      cursorPos.width,
      cursorPos.height
    );
    uniformManager.setUniform(
      gl,
      prog,
      'iPreviousCursor',
      prevCursorPos.x,
      canvasHeight - prevCursorPos.y,
      prevCursorPos.width,
      prevCursorPos.height
    );
    uniformManager.setUniform(gl, prog, 'iCurrentCursorColor', ...cursorColor);
    uniformManager.setUniform(gl, prog, 'iPreviousCursorColor', ...prevCursorColor);
    uniformManager.setUniform(gl, prog, 'iTimeCursorChange', cursorChangeTime);

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  // Render frame (multi-pass shader chain)
  const render = () => {
    if (!gl || programs.length === 0) return;

    gl.viewport(0, 0, canvas?.width || width, canvas?.height || height);
    gl.clearColor(0, 0, 0, 1);

    // Start with image texture or empty texture
    let inputTexture = imageTexture || emptyTexture;
    if (!inputTexture) return;

    // Chain shaders: each shader uses the previous shader's output as input
    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];
      const isLastPass = i === programs.length - 1;

      if (isLastPass) {
        // Final pass: render to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT);
        renderPass(program, inputTexture);
      } else {
        // Intermediate pass: render to framebuffer
        const framebuffer = framebuffers[i];
        const outputTexture = renderTextures[i];

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT);
        renderPass(program, inputTexture);

        // Use this pass's output as the next pass's input
        inputTexture = outputTexture;
      }
    }

    animationFrameId = requestAnimationFrame(render);
  };

  // Start rendering
  const start = () => {
    if (!gl || !canvas) return;

    // Clean up old programs
    programs.forEach((prog) => gl?.deleteProgram(prog));
    programs = [];
    uniformManager.clear();

    // Compile all shader programs
    for (let i = 0; i < activeShaderCodes.length; i++) {
      const shaderCode = activeShaderCodes[i];
      const wrappedShader = wrapFragmentShader(shaderCode);
      const program = createProgram(gl, vertexShader, wrappedShader);

      if (!program) {
        console.error(`Failed to create shader program ${i}`);
        continue;
      }

      programs.push(program);
      console.log(`Shader ${i}:`);
    }

    if (programs.length === 0) {
      console.error('No valid shader programs created');
      return;
    }

    // Setup geometry for first program (all programs share the same geometry)
    setupGeometry();

    // Create framebuffers for shader chain (need n-1 framebuffers for n shaders)
    if (programs.length > 1) {
      createRenderTargets(programs.length - 1);
    }

    // Start render loop
    startTime = performance.now();
    focusTime = 0;
    render();
  };

  // Stop rendering
  const stop = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  // Event handlers
  const handleClick = (e: MouseEvent) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Store if we're transitioning from unfocused to focused
    const wasUnfocused = !isFocused;

    // Update cursor position FIRST (before focus animation starts)
    prevCursorPos = { ...cursorPos };
    cursorPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      width: cursorPos.width,
      height: cursorPos.height
    };
    cursorChangeTime = (performance.now() - startTime) / 1000.0;

    // Swap colors if enabled
    if (swapColorsOnClick) {
      const temp = [...cursorColor];
      cursorColor = [...prevCursorColor];
      prevCursorColor = temp;
    }

    // If clicking caused focus transition, set focus time AFTER cursor update
    if (wasUnfocused) {
      isFocused = true;
      focusTime = (performance.now() - startTime) / 1000.0;
    }
  };

  const handleCanvasFocus = () => {
    // Only update if not already handled by click
    if (!isFocused) {
      isFocused = true;
      focusTime = (performance.now() - startTime) / 1000.0;
    }
  };

  const handleCanvasBlur = () => {
    isFocused = false;
  };

  // Lifecycle
  onMount(() => {
    if (!initWebGL()) return;
    start();

    // Add global click handler to detect clicks outside canvas
    const handleGlobalClick = (e: MouseEvent) => {
      if (!canvas) return;

      // Check if click is outside the canvas
      const rect = canvas.getBoundingClientRect();
      const isOutside =
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom;

      if (isOutside && isFocused) {
        isFocused = false;
        canvas.blur();
      }
    };

    document.addEventListener('click', handleGlobalClick);

    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  });

  onDestroy(() => {
    stop();
    if (gl) {
      programs.forEach((prog) => gl?.deleteProgram(prog));
      if (backgroundProgram) gl.deleteProgram(backgroundProgram);
      framebuffers.forEach((fb) => gl?.deleteFramebuffer(fb));
      renderTextures.forEach((tex) => gl?.deleteTexture(tex));
      if (emptyTexture) gl.deleteTexture(emptyTexture);
      if (imageTexture) gl.deleteTexture(imageTexture);
    }
  });

  // Load image texture when imageUrl changes
  $effect(() => {
    const url = imageUrl;

    if (url && gl) {
      loadImageTexture(url).then((texture) => {
        // Clean up old texture if it exists
        if (imageTexture && gl) {
          gl.deleteTexture(imageTexture);
        }
        imageTexture = texture;
      });
    } else {
      // Clear image texture if URL is null
      if (imageTexture && gl) {
        gl.deleteTexture(imageTexture);
        imageTexture = null;
      }
    }
  });

  // Restart when active shaders change (using untrack to avoid infinite loops)
  $effect(() => {
    // Track shader dependencies
    const currentShaderCodes = activeShaderCodes;

    // Use untrack to prevent infinite loops from start() modifying state
    if (currentShaderCodes.length > 0 && gl) {
      untrack(() => {
        stop();
        start();
      });
    }
  });
</script>

<div class="relative inline-block">
  <canvas
    bind:this={canvas}
    {width}
    {height}
    class={className}
    onclick={handleClick}
    tabindex="0"
    onfocus={handleCanvasFocus}
    onblur={handleCanvasBlur}
  ></canvas>

  <!-- Shader selection menu -->
  {#if shaders.length > 0}
    <ShaderSelectionMenu
      bind:shaders
      bind:cursorColor
      bind:prevCursorColor
      bind:show={showShaderMenu}
    />
  {/if}

  <!-- Debug window -->
  <ShaderDebugWindow uniforms={getCurrentUniforms()} bind:show={showDebug} />
</div>

<style>
  canvas {
    display: block;
  }
</style>
