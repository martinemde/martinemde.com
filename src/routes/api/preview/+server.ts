import { error, json } from '@sveltejs/kit';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import type { RequestHandler } from './$types';

/**
 * POST /api/preview
 * Convert markdown to HTML for preview
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  // Require authentication
  if (!locals.user) {
    error(401, 'Unauthorized');
  }

  try {
    const { markdown } = await request.json();

    if (typeof markdown !== 'string') {
      error(400, 'Invalid request body. Expected { markdown: string }');
    }

    // Convert markdown to HTML using unified/remark
    const result = await unified().use(remarkParse).use(remarkHtml).process(markdown);

    const html = String(result);

    return json({ html });
  } catch (err) {
    console.error('Preview error:', err);
    error(500, 'Failed to render markdown');
  }
};
