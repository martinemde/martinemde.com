import { isHttpError, isRedirect } from '@sveltejs/kit';
import { expect } from 'vitest';

/**
 * Assert that an awaitable value throws a SvelteKit HttpError with the
 * expected status and a body message containing the given substring.
 *
 * Non-HttpError throws are re-thrown so they surface as real test failures.
 */
export async function expectHttpError(
  promise: unknown,
  status: number,
  messageContains: string
): Promise<void> {
  try {
    await promise;
    expect.fail('Expected an HttpError to be thrown');
  } catch (e) {
    if (!isHttpError(e)) throw e;
    expect(e.status).toBe(status);
    expect(e.body.message).toContain(messageContains);
  }
}

/**
 * Assert that an awaitable value throws a SvelteKit Redirect with the
 * expected status. Returns the location for further assertions.
 */
export async function expectRedirect(promise: unknown, status: number = 302): Promise<string> {
  try {
    await promise;
    expect.fail('Expected a redirect to be thrown');
  } catch (e) {
    if (!isRedirect(e)) throw e;
    expect(e.status).toBe(status);
    return e.location;
  }
}
