import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getPostBySlug, validatePostDate } from '$lib/utils/posts';

export const prerender = false;

export const load: PageLoad = async ({ params }) => {
  const { segments } = params;

  // Match pattern: year/month/day/slug or year/month/day/slug.html
  const match = segments.match(/^(\d{4})\/(\d{2})\/(\d{2})\/(.+?)(\.html)?$/);

  if (!match) {
    // Not a valid date-based URL pattern
    throw error(404, 'Page not found');
  }

  const [, year, month, day, slug] = match;

  console.log('Date redirect - slug:', slug, 'date:', `${year}-${month}-${day}`);

  // Try to load the post by slug
  const post = await getPostBySlug(slug);

  if (!post) {
    console.log('Post not found:', slug);
    // No matching post found
    throw error(404, 'Post not found');
  }

  console.log('Post found, metadata date:', post.metadata.date);

  // Validate that the post's date matches the URL date
  if (!validatePostDate(post.metadata, year, month, day)) {
    console.log('Date mismatch - expected:', `${year}-${month}-${day}`, 'got:', post.metadata.date);
    // Date mismatch
    throw error(404, 'Post not found at this URL');
  }

  console.log('Redirecting to:', `/blog/${post.metadata.slug}`);

  // Redirect to the new slug-based URL
  throw redirect(301, `/blog/${post.metadata.slug}`);
};
