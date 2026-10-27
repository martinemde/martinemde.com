import type { RequestHandler } from './$types';
import { getAllPosts, type Post } from '#lib/utils/posts.ts';
import { postNavLabel } from '#lib/utils/post-format.ts';
import { projects } from '#lib/data/projects.ts';
import { PUBLIC_APP_URL } from '$app/env/public';

// Prerendered so the CDN serves a static file instead of running the Worker.
export const prerender = true;

const url = (path: string) => (path.startsWith('/') ? `${PUBLIC_APP_URL}${path}` : path);
const linkText = (text: string) => text.replace(/[\\[\]]/g, '\\$&').replace(/\s+/g, ' ');

/** One line per entry, linking its Markdown view. Untitled entries are named by their time. */
function entryLine(post: Post): string {
  const link = `[${linkText(postNavLabel(post))}](${url(`${post.permalink}.md`)})`;
  // The author's summary, or for an untitled entry the start of what it says.
  const opening = !post.title && post.excerpt.replace(/…$/, '');
  const summary =
    post.description ||
    (opening && opening.length > 160
      ? `${opening.slice(0, 160).replace(/\s+\S*$/, '')}…`
      : opening);
  return `- ${link}${summary ? `: ${summary.replace(/\s+/g, ' ')}` : ''}`;
}

/**
 * GET /llms.txt
 * The site in the llms.txt format: a summary, then sections of links by purpose.
 */
export const GET: RequestHandler = async () => {
  const posts = await getAllPosts();
  const articles = posts.filter((post) => post.type === 'article');
  const entries = posts.filter((post) => post.type !== 'article');

  const content = [
    '# Martin Emde',
    '> Personal site of Martin Emde, AI developer tools engineer at Gusto and former RubyGems team lead. Articles, notes, and bookmarks on developer tools, AI agents, Ruby, and the web. Entries link to their Markdown views.',
    '## About',
    [
      `- [Home](${url('/index.md')}): Recent entries, selected projects, and links elsewhere`,
      `- [About](${url('/about')}): Background and work history`,
      `- [Stream](${url('/stream.md')}): Every entry, grouped by day`,
      `- [Blog](${url('/blog.md')}): Articles only`,
      `- [RSS](${url('/rss.xml')}): Feed of recent entries with full HTML and source Markdown`
    ].join('\n'),
    '## Writing',
    articles.map(entryLine).join('\n'),
    '## Projects',
    projects
      .map(
        (project) => `- [${linkText(project.name)}](${url(project.url)}): ${project.description}`
      )
      .join('\n'),
    '## Notes and bookmarks',
    entries.map(entryLine).join('\n')
  ];

  return new Response(`${content.join('\n\n')}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
};
