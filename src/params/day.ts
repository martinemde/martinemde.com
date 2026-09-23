import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => /^(0[1-9]|[12]\d|3[01])$/.test(param);
