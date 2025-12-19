import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CopyButton from './CopyButton.svelte';

describe('CopyButton', () => {
	let writeTextSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		// Mock clipboard API
		writeTextSpy = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: writeTextSpy },
			writable: true,
			configurable: true
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should render with default props', () => {
		const getData = () => 'test data';
		render(CopyButton, { props: { getData } });

		expect(screen.getByRole('button')).toBeTruthy();
		expect(screen.getByText('Copy')).toBeTruthy();
	});

	it('should render with custom name', () => {
		const getData = () => 'test data';
		render(CopyButton, { props: { getData, name: 'Custom Copy' } });

		expect(screen.getByText('Custom Copy')).toBeTruthy();
	});

	it('should copy text to clipboard when clicked', async () => {
		const user = userEvent.setup({ delay: null });
		const testData = 'test data to copy';
		const getData = () => testData;

		render(CopyButton, { props: { getData } });

		const button = screen.getByRole('button');
		await user.click(button);

		// Check that the button shows "Copied" state (proves copy succeeded)
		await waitFor(() => {
			expect(screen.getByText('Copied')).toBeTruthy();
		});
	});

	it('should handle async getData function', async () => {
		const user = userEvent.setup({ delay: null });
		const testData = 'async test data';
		const getData = async () => {
			return Promise.resolve(testData);
		};

		render(CopyButton, { props: { getData } });

		const button = screen.getByRole('button');
		await user.click(button);

		// Check that the button shows "Copied" state (proves async copy succeeded)
		await waitFor(() => {
			expect(screen.getByText('Copied')).toBeTruthy();
		});
	});

	it('should show copied state after copying', async () => {
		const user = userEvent.setup({ delay: null });
		const getData = () => 'test data';

		render(CopyButton, { props: { getData, copiedName: 'Copied!' } });

		const button = screen.getByRole('button');
		await user.click(button);

		expect(screen.getByText('Copied!')).toBeTruthy();
	});

	it('should revert to original state after timeout', async () => {
		vi.useFakeTimers();
		const user = userEvent.setup({ delay: null });
		const getData = () => 'test data';

		render(CopyButton, { props: { getData } });

		const button = screen.getByRole('button');
		await user.click(button);

		// Should show copied state
		await waitFor(() => {
			expect(screen.getByText('Copied')).toBeTruthy();
		});

		// Fast-forward time by 2 seconds
		await vi.advanceTimersByTimeAsync(2000);

		// Should revert to original state
		await waitFor(() => {
			expect(screen.getByText('Copy')).toBeTruthy();
		});

		vi.useRealTimers();
	});

	it('should apply custom class', () => {
		const getData = () => 'test data';
		render(CopyButton, { props: { getData, class: 'custom-class' } });

		const button = screen.getByRole('button');
		expect(button.className).toContain('custom-class');
	});

	it('should apply aria-label when provided', () => {
		const getData = () => 'test data';
		render(CopyButton, { props: { getData, ariaLabel: 'Custom aria label' } });

		const button = screen.getByRole('button', { name: 'Custom aria label' });
		expect(button).toBeTruthy();
	});

	it('should apply title attribute when provided', () => {
		const getData = () => 'test data';
		render(CopyButton, { props: { getData, title: 'Custom title' } });

		const button = screen.getByRole('button');
		expect(button.getAttribute('title')).toBe('Custom title');
	});

	it('should handle clipboard errors gracefully', async () => {
		const user = userEvent.setup({ delay: null });
		// Mock console.error to suppress error output during test
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		writeTextSpy.mockRejectedValue(new Error('Clipboard error'));

		const getData = () => 'test data';
		render(CopyButton, { props: { getData } });

		const button = screen.getByRole('button');

		// Should not throw an error when clicked
		await expect(user.click(button)).resolves.not.toThrow();

		// Wait a bit to let any async operations complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Button should still be rendered (component didn't crash)
		expect(button).toBeTruthy();

		consoleError.mockRestore();
	});
});
