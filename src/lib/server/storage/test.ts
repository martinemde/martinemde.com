import type { StorageBackend } from './types';

/**
 * In-memory storage backend for testing
 *
 * Stores files and images in memory using Maps. Data is lost when the process ends.
 * Provides additional inspection methods for test assertions.
 */
export class TestStorageBackend implements StorageBackend {
	private files = new Map<string, string>();
	private images = new Map<string, Buffer>();

	async createOrUpdateFile(path: string, content: string, message: string): Promise<void> {
		this.files.set(path, content);
	}

	async fileExists(path: string): Promise<boolean> {
		return this.files.has(path);
	}

	async uploadImage(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
		this.images.set(filename, buffer);
		// Return fake URL for testing
		return `/test-images/${filename}`;
	}

	// Test inspection methods

	/**
	 * Get file content by path (for test assertions)
	 */
	getFile(path: string): string | undefined {
		return this.files.get(path);
	}

	/**
	 * Get all files (for test assertions)
	 */
	getAllFiles(): Map<string, string> {
		return new Map(this.files);
	}

	/**
	 * Get image buffer by filename (for test assertions)
	 */
	getImage(filename: string): Buffer | undefined {
		return this.images.get(filename);
	}

	/**
	 * Get all images (for test assertions)
	 */
	getAllImages(): Map<string, Buffer> {
		return new Map(this.images);
	}

	/**
	 * Clear all stored data (for test cleanup)
	 */
	clear(): void {
		this.files.clear();
		this.images.clear();
	}

	/**
	 * Get count of stored files
	 */
	getFileCount(): number {
		return this.files.size;
	}

	/**
	 * Get count of stored images
	 */
	getImageCount(): number {
		return this.images.size;
	}
}
