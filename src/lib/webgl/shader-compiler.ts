/**
 * Compiles a shader from source code
 */
export function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: number
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    const typeName = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
    console.error(`${typeName} shader compilation error:`, log);

    // Show first few lines of shader for context
    const lines = source.split('\n');
    console.error('Shader source (first 20 lines):');
    lines.slice(0, 20).forEach((line, i) => console.error(`${i + 1}: ${line}`));

    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Creates a shader program from vertex and fragment shader sources
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram | null {
  const vs = compileShader(gl, vsSource, gl.VERTEX_SHADER);
  const fs = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);

  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  if (!prog) return null;

  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }

  return prog;
}

/**
 * Wraps a Shadertoy-style fragment shader in WebGL2 boilerplate
 */
export function wrapFragmentShader(frag: string): string {
  // If shader already has #version, use as-is
  if (frag.includes('#version')) {
    return frag;
  }

  // Otherwise wrap in Shadertoy-compatible wrapper
  return `#version 300 es
precision highp float;

uniform vec3 iResolution;
uniform float iTime;
uniform sampler2D iChannel0;
uniform int iFocus;
uniform float iTimeFocus;
uniform vec4 iCurrentCursor;
uniform vec4 iPreviousCursor;
uniform vec4 iCurrentCursorColor;
uniform vec4 iPreviousCursorColor;
uniform float iTimeCursorChange;

out vec4 fragColor;

${frag}

void main() {
	mainImage(fragColor, gl_FragCoord.xy);
}
`;
}
