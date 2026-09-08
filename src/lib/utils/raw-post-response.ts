import { error } from '@sveltejs/kit';
import { getRawPostBySlug } from './posts';
import { VARY_ACCEPT, negotiateContentType } from './content-negotiation';

/**
 * Media types the raw-post endpoints can serve, in server-preference order.
 * `text/plain` leads so that browsers, which ask for HTML and fall back to a
 * wildcard, keep rendering these URLs inline; an agent that explicitly asks for
 * `text/markdown` is served that instead.
 */
export const RAW_POST_MEDIA_TYPES = ['text/plain', 'text/markdown'] as const;

/**
 * Serve a post's raw markdown, with the content type chosen from `Accept`.
 * Shared by `/blog/[slug].txt` and `/blog/[slug].md`, which differ only in the
 * extension a caller happens to use.
 */
export function rawPostResponse(slug: string, accept: string | null): Response {
  const content = getRawPostBySlug(slug);

  if (!content) {
    throw error(404, `Post not found: ${slug}`);
  }

  const contentType = negotiateContentType(accept, RAW_POST_MEDIA_TYPES);

  // The 406 varies on Accept just as much as a successful body does, so it is
  // built by hand rather than thrown through SvelteKit's error page.
  if (!contentType) {
    return new Response(`Not acceptable: available as ${RAW_POST_MEDIA_TYPES.join(' or ')}\n`, {
      status: 406,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        Vary: VARY_ACCEPT
      }
    });
  }

  return new Response(content, {
    headers: {
      'Content-Type': `${contentType}; charset=utf-8`,
      Vary: VARY_ACCEPT
    }
  });
}
