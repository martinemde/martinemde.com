/**
 * Writes WebP copies of each raster image under static/images, sized for the
 * content column, into ignored static/optimized/. Uploads stay as-is for feeds
 * and share cards; pages swap in the copies via the manifest.
 *
 * A file sharp can't read is skipped rather than failing the build, so a bad
 * upload just keeps serving its original.
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import sharp from 'sharp';
import type { OptimizedImage } from '../src/lib/utils/images.ts';

// The content column is at most 680px: phones at up to ~2x, desktop at 2x.
const WIDTHS = [800, 1360];
const SIZES = '(min-width: 720px) 680px, 100vw';
const input = resolve('static/images');
const output = resolve('static/optimized');
const manifest = resolve('src/lib/generated/optimized-images.json');

await rm(output, { recursive: true, force: true });

const images: Record<string, OptimizedImage> = {};
for (const entry of await readdir(input, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !/\.(png|jpe?g)$/i.test(entry.name)) continue;
  const file = join(entry.parentPath, entry.name);
  const path = '/' + relative(resolve('static'), file);
  const base = join(output, path.replace(/\.\w+$/, ''));
  try {
    await mkdir(dirname(base), { recursive: true });
    const { width: original } = await sharp(file).metadata();
    const widths = [...new Set(WIDTHS.map((width) => Math.min(width, original)))];
    const copies = [];
    for (const width of widths) {
      const target = `${base}-${width}.webp`;
      const info = await sharp(file).resize({ width }).webp({ quality: 80 }).toFile(target);
      copies.push({ src: '/' + relative(resolve('static'), target), ...info });
    }
    const largest = copies[copies.length - 1];
    images[path] = {
      src: largest.src,
      srcset: copies.map((copy) => `${copy.src} ${copy.width}w`).join(', '),
      sizes: SIZES,
      width: largest.width,
      height: largest.height
    };
  } catch (error) {
    console.warn(`Skipping ${path}: ${(error as Error).message}`);
  }
}

await mkdir(dirname(manifest), { recursive: true });
await writeFile(manifest, JSON.stringify(images, null, 2) + '\n');
