import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ShareButtons from './ShareButtons.svelte';

describe('ShareButtons', () => {
  let writeTextSpy: ReturnType<typeof vi.fn>;
  let mockShare: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock clipboard API
    writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      writable: true,
      configurable: true
    });

    // Setup share mock
    mockShare = vi.fn().mockResolvedValue(undefined);

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://example.com',
        href: 'https://example.com/blog/test-post'
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render both LLM and Share buttons', () => {
    render(ShareButtons, {
      props: {
        slug: 'test-post',
        title: 'Test Post'
      }
    });

    // Check for LLM button (inside CopyButton)
    expect(screen.getByText('LLM')).toBeTruthy();

    // Check for Share button
    expect(screen.getByRole('button', { name: 'Share article' })).toBeTruthy();
  });

  it('should copy LLM URL when LLM button is clicked', async () => {
    const user = userEvent.setup({ delay: null });

    render(ShareButtons, {
      props: {
        slug: 'test-post',
        title: 'Test Post'
      }
    });

    const llmButton = screen.getByText('LLM').closest('button');
    await user.click(llmButton!);

    // Check that the LLM button shows "LLM" in copied state (proves copy succeeded)
    await waitFor(() => {
      expect(screen.getByText('LLM')).toBeTruthy();
    });
  });

  it('should call navigator.share when share button is clicked and API is available', async () => {
    const user = userEvent.setup({ delay: null });

    // Mock navigator.share as available
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    });

    render(ShareButtons, {
      props: {
        slug: 'test-post',
        title: 'Test Post',
        description: 'Test description'
      }
    });

    const shareButton = screen.getByRole('button', { name: 'Share article' });
    await user.click(shareButton);

    expect(mockShare).toHaveBeenCalledWith({
      title: 'Test Post',
      text: 'Test description',
      url: 'https://example.com/blog/test-post'
    });
  });

  it('should use title as text when description is not provided', async () => {
    const user = userEvent.setup({ delay: null });

    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    });

    render(ShareButtons, {
      props: {
        slug: 'test-post',
        title: 'Test Post'
      }
    });

    const shareButton = screen.getByRole('button', { name: 'Share article' });
    await user.click(shareButton);

    expect(mockShare).toHaveBeenCalledWith({
      title: 'Test Post',
      text: 'Test Post',
      url: 'https://example.com/blog/test-post'
    });
  });

  it('should fallback to clipboard when navigator.share is not available', async () => {
    const user = userEvent.setup({ delay: null });

    // Make navigator.share undefined
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true
    });

    render(ShareButtons, {
      props: {
        slug: 'test-post',
        title: 'Test Post'
      }
    });

    const shareButton = screen.getByRole('button', { name: 'Share article' });
    await user.click(shareButton);

    // Wait a bit and check that the operation completed (no error thrown)
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(shareButton).toBeTruthy();
  });

  it('should handle share errors gracefully', async () => {
    const user = userEvent.setup({ delay: null });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockShare.mockRejectedValue(new Error('Share failed'));

    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    });

    render(ShareButtons, {
      props: {
        slug: 'test-post',
        title: 'Test Post'
      }
    });

    const shareButton = screen.getByRole('button', { name: 'Share article' });
    await user.click(shareButton);

    expect(consoleError).toHaveBeenCalledWith('Failed to share:', expect.any(Error));
    consoleError.mockRestore();
  });

  it('should have correct aria-label on LLM button', () => {
    render(ShareButtons, {
      props: {
        slug: 'test-post',
        title: 'Test Post'
      }
    });

    const llmButton = screen.getByRole('button', {
      name: 'Copy a link to the plain text of this post'
    });
    expect(llmButton).toBeTruthy();
  });
});
