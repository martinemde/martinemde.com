/**
 * Lookup for the WebP copies written by scripts/optimize-images.ts. The
 * manifest is generated (and ignored), so it's globbed: without it, every
 * image falls back to its original.
 */

export interface OptimizedImage {
  src: string;
  srcset: string;
  sizes: string;
  width: number;
  height: number;
}

const manifests = import.meta.glob<Record<string, OptimizedImage>>(
  '../generated/optimized-images.json',
  { eager: true, import: 'default' }
);
const images: Record<string, OptimizedImage> = Object.values(manifests)[0] ?? {};

/** The optimized copy of a local image path or same-site URL, if one was generated. */
export function optimizedImage(src: string | undefined): OptimizedImage | undefined {
  if (!src) return undefined;
  return images[src.replace(/^https:\/\/martinemde\.com(?=\/)/, '')];
}
