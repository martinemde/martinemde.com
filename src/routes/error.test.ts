import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
// Exercise Kit's real boundary, not a test-only boundary that could hide a
// framework contract change. This internal import intentionally tracks Kit 3.
import Root from '../../node_modules/@sveltejs/kit/src/runtime/components/root.svelte';
import RenderFailure from '#lib/fixtures/errors/RenderFailure.svelte';
import ErrorPage from './+error.svelte';
import { page } from '$app/state';

vi.mock('$app/navigation', () => ({ afterNavigate: vi.fn() }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
vi.mock('$app/state', () => ({
  page: {
    status: 200,
    error: null,
    params: {},
    url: new URL('https://example.com/about')
  }
}));
vi.mock('#lib/auth/state.svelte.ts', () => ({
  authStore: {
    state: { apiKey: null },
    isLoggedIn: false,
    loadFromStorage: vi.fn()
  }
}));

afterEach(() => {
  cleanup();
  Object.assign(page, { status: 200, error: null });
});

describe('Kit render error boundary', () => {
  it.each([200, 404])('handles a render failure when page.status is still %s', (status) => {
    Object.assign(page, {
      status,
      error: status === 404 ? { message: 'Missing page' } : null
    });
    const onerror = vi.fn();
    const props = {
      page,
      components: [],
      tree: { component: RenderFailure, error: ErrorPage, data: {} },
      form: null,
      error: undefined,
      onerror
    };

    render(Root, { props });

    expect(screen.getByRole('heading', { name: '500' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Internal Server Error' })).toBeTruthy();
    expect(screen.queryByText('Render failed')).toBeNull();
    expect(screen.getByText('Something went wrong. Please try again later.')).toBeTruthy();
    expect(onerror).toHaveBeenCalledOnce();
    expect(onerror).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Render failed' }),
      expect.any(Function)
    );
    expect(screen.getByRole('link', { name: 'Go Home' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Connect an LLM' })).toBeNull();
  });

  it('preserves framework 404 errors and their limerick option', () => {
    const error = { message: 'Missing page' };
    Object.assign(page, { status: 404, error });
    render(ErrorPage, { props: { error } });

    expect(screen.getByRole('heading', { name: '404' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Missing page' })).toBeTruthy();
    expect(screen.getByText("The page you're looking for doesn't exist.")).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Connect an LLM' })).toBeTruthy();
  });

  it('preserves sanitized framework 500 errors without the 404 option', () => {
    const error = { message: 'Safe public error' };
    Object.assign(page, { status: 500, error });
    render(ErrorPage, { props: { error } });

    expect(screen.getByRole('heading', { name: '500' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Safe public error' })).toBeTruthy();
    expect(screen.getByText('Something went wrong. Please try again later.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Connect an LLM' })).toBeNull();
  });
});
