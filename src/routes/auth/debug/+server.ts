import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

/**
 * Debug endpoint to verify environment variables are loaded
 * IMPORTANT: Remove this endpoint before deploying to production!
 */
export const GET: RequestHandler = async () => {
  const checks = {
    SESSION_SECRET: {
      exists: !!env.SESSION_SECRET,
      length: env.SESSION_SECRET?.length || 0,
      valid: (env.SESSION_SECRET?.length || 0) >= 32,
      preview: env.SESSION_SECRET
        ? `${env.SESSION_SECRET.slice(0, 4)}...${env.SESSION_SECRET.slice(-4)}`
        : 'NOT SET'
    },
    GITHUB_CLIENT_ID: {
      exists: !!env.GITHUB_CLIENT_ID,
      preview: env.GITHUB_CLIENT_ID ? `${env.GITHUB_CLIENT_ID.slice(0, 4)}...` : 'NOT SET'
    },
    GITHUB_CLIENT_SECRET: {
      exists: !!env.GITHUB_CLIENT_SECRET,
      preview: env.GITHUB_CLIENT_SECRET ? 'SET (hidden)' : 'NOT SET'
    },
    GITHUB_OWNER: {
      exists: !!env.GITHUB_OWNER,
      value: env.GITHUB_OWNER || 'NOT SET'
    }
  };

  return json(checks, {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
};
