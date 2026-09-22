import type { RequestHandler } from './$types';
import { calculate } from '$lib/apple-upgrade/calculator';

/** Query parameters are the whole point, so this one cannot be prerendered. */
export const prerender = false;

/**
 * The summary data behind /apple-upgrade, as JSON, for anything that would
 * rather read numbers than scroll a forty-eight month ledger.
 *
 * Called with no parameters it describes itself: the same worked example the
 * summary page prints, plus the full parameter table.
 */
export const GET: RequestHandler = async ({ url, setHeaders }) => {
  const body = calculate(url.searchParams);

  setHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'max-age=0, s-maxage=3600',
    // Public, read-only arithmetic over values the caller supplied. Nothing
    // here is account data, so there is nothing for an origin check to protect.
    'Access-Control-Allow-Origin': '*'
  });

  return new Response(JSON.stringify(body, null, 2));
};
