import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  PUBLIC_APP_URL: {
    public: true,
    static: true,
    description: 'Absolute HTTP(S) origin used for canonical, feed, and social URLs.',
    schema: (value) => {
      if (!value) throw new Error('PUBLIC_APP_URL must be an absolute HTTP(S) origin');
      const url = new URL(value);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
      ) {
        throw new Error(
          'PUBLIC_APP_URL must be an HTTP(S) origin without credentials, path, query, or fragment'
        );
      }
      return url.origin;
    }
  }
});
