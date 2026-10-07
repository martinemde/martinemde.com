import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
  year: (param) => (/^\d{4}$/.test(param) ? param : undefined),
  month: (param) => (/^(0[1-9]|1[0-2])$/.test(param) ? param : undefined),
  day: (param) => (/^(0[1-9]|[12]\d|3[01])$/.test(param) ? param : undefined)
});
