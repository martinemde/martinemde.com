type UniformInfo = {
  type: number;
  size: number;
};

/**
 * Manages uniform locations and types with caching
 */
export class UniformManager {
  private cache = new WeakMap<WebGLProgram, Map<string, UniformInfo>>();

  /**
   * Get uniform info by name (cached per program)
   */
  getUniformInfo(gl: WebGL2RenderingContext, prog: WebGLProgram, name: string): UniformInfo | null {
    // Get or create cache for this program
    let programCache = this.cache.get(prog);
    if (!programCache) {
      programCache = new Map();
      this.cache.set(prog, programCache);
    }

    if (programCache.has(name)) {
      return programCache.get(name)!;
    }

    const numUniforms = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(prog, i);
      if (info && info.name === name) {
        const uniformInfo = { type: info.type, size: info.size };
        programCache.set(name, uniformInfo);
        return uniformInfo;
      }
    }
    return null;
  }

  /**
   * Set uniform value for a specific program (silently skip if uniform doesn't exist)
   */
  setUniform(
    gl: WebGL2RenderingContext,
    prog: WebGLProgram,
    name: string,
    first: number | number[] | WebGLTexture,
    ...rest: number[]
  ): void {
    const loc = gl.getUniformLocation(prog, name);
    // Silently return if uniform doesn't exist in this shader
    if (loc === null) return;

    const info = this.getUniformInfo(gl, prog, name);
    if (!info) return;

    // Handle textures specially
    if (first instanceof WebGLTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, first);
      gl.uniform1i(loc, 0);
      return;
    }

    // Use the correct uniform function based on the shader's declared type
    switch (info.type) {
      case gl.FLOAT:
        if (typeof first === 'number') gl.uniform1f(loc, first);
        break;
      case gl.FLOAT_VEC2:
        if (Array.isArray(first)) {
          gl.uniform2fv(loc, first);
        } else {
          gl.uniform2f(loc, first, rest[0]);
        }
        break;
      case gl.FLOAT_VEC3:
        if (Array.isArray(first)) {
          gl.uniform3fv(loc, first);
        } else {
          gl.uniform3f(loc, first, rest[0], rest[1]);
        }
        break;
      case gl.FLOAT_VEC4:
        if (Array.isArray(first)) {
          gl.uniform4fv(loc, first);
        } else {
          gl.uniform4f(loc, first, rest[0], rest[1], rest[2]);
        }
        break;
      case gl.INT:
      case gl.BOOL:
      case gl.SAMPLER_2D:
        if (typeof first === 'number') gl.uniform1i(loc, first);
        break;
      case gl.INT_VEC2:
        gl.uniform2iv(loc, Array.isArray(first) ? first : [first, ...rest]);
        break;
      case gl.INT_VEC3:
        gl.uniform3iv(loc, Array.isArray(first) ? first : [first, ...rest]);
        break;
      case gl.INT_VEC4:
        gl.uniform4iv(loc, Array.isArray(first) ? first : [first, ...rest]);
        break;
      default:
        console.warn(`Unsupported uniform type: ${info.type} for ${name}`);
    }
  }

  /**
   * Clear cached uniform info (call when programs are deleted)
   */
  clear(): void {
    // WeakMap will handle cleanup automatically, but we can help by clearing the cache
    this.cache = new WeakMap();
  }
}
