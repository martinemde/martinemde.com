import type { RequestHandler } from './$types';
import { getAllPosts } from '$lib/utils/posts';
import { VARY_ACCEPT, negotiateContentType } from '$lib/utils/content-negotiation';
import { PUBLIC_APP_URL } from '$env/static/public';

/**
 * Media types this index can serve, in server-preference order.
 * The body is markdown either way; only the label changes.
 */
const MEDIA_TYPES = ['text/plain', 'text/markdown'] as const;

/**
 * GET /llms.txt
 * Returns a plain text markdown list of all blog posts in most recent first order
 */
export const GET: RequestHandler = async ({ request }) => {
  const contentType = negotiateContentType(request.headers.get('accept'), MEDIA_TYPES);

  if (!contentType) {
    return new Response(`Not acceptable: available as ${MEDIA_TYPES.join(' or ')}\n`, {
      status: 406,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        Vary: VARY_ACCEPT
      }
    });
  }

  const posts = await getAllPosts();
  const baseUrl = PUBLIC_APP_URL;

  // Generate markdown content
  let content = '# Martin Emde\n\n';

  for (const post of posts) {
    const url = `${baseUrl}/blog/${post.slug}.txt`;
    content += `- [${post.title}](${url})\n`;
  }

  return new Response(content, {
    headers: {
      'Content-Type': `${contentType}; charset=utf-8`,
      Vary: VARY_ACCEPT
    }
  });
};
