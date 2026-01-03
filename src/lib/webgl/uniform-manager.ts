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
	getUniformInfo(
		gl: WebGL2RenderingContext,
		prog: WebGLProgram,
		name: string
	): UniformInfo | null {
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
		...values: any[]
	): void {
		const loc = gl.getUniformLocation(prog, name);
		// Silently return if uniform doesn't exist in this shader
		if (loc === null) return;

		const info = this.getUniformInfo(gl, prog, name);
		if (!info) return;

		// Handle textures specially
		if (values[0] instanceof WebGLTexture) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, values[0]);
			gl.uniform1i(loc, 0);
			return;
		}

		// Use the correct uniform function based on the shader's declared type
		switch (info.type) {
			case gl.FLOAT:
				gl.uniform1f(loc, values[0]);
				break;
			case gl.FLOAT_VEC2:
				if (Array.isArray(values[0])) {
					gl.uniform2fv(loc, values[0]);
				} else {
					gl.uniform2f(loc, values[0], values[1]);
				}
				break;
			case gl.FLOAT_VEC3:
				if (Array.isArray(values[0])) {
					gl.uniform3fv(loc, values[0]);
				} else {
					gl.uniform3f(loc, values[0], values[1], values[2]);
				}
				break;
			case gl.FLOAT_VEC4:
				if (Array.isArray(values[0])) {
					gl.uniform4fv(loc, values[0]);
				} else {
					gl.uniform4f(loc, values[0], values[1], values[2], values[3]);
				}
				break;
			case gl.INT:
			case gl.BOOL:
			case gl.SAMPLER_2D:
				gl.uniform1i(loc, values[0]);
				break;
			case gl.INT_VEC2:
				gl.uniform2iv(loc, values);
				break;
			case gl.INT_VEC3:
				gl.uniform3iv(loc, values);
				break;
			case gl.INT_VEC4:
				gl.uniform4iv(loc, values);
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
