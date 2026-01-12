import { getRecentPosts, getRawPostBySlug, type Post } from '$lib/utils/posts';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';

const siteUrl = 'https://martinemde.com';
const siteTitle = 'Martin Emde';
const siteDescription = 'Blog posts by Martin Emde';

export async function GET() {
  const posts = await getRecentPosts(20);
  const buildDate = new Date();
  const latestPostDate = posts.length > 0 ? convertToUtcDate(posts[0].date) : buildDate;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:source="https://source.scripting.com/">
	<channel>
		<title>${siteTitle}</title>
		<description>${siteDescription}</description>
		<link>${siteUrl}</link>
		<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
		<source:self>${siteUrl}/rss.xml</source:self>
		<pubDate>${latestPostDate.toUTCString()}</pubDate>
		<lastBuildDate>${buildDate.toUTCString()}</lastBuildDate>
    ${await feedItems(posts)}
	</channel>
</rss>`.trim();

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=0, s-maxage=3600'
    }
  });
}

async function feedItems(posts: Post[]): Promise<string> {
  const items = await Promise.all(posts.map(createFeedItem));
  return items.join('');
}

async function createFeedItem(post: Post): Promise<string> {
  const htmlContent = await convertMarkdownToHtml(post.slug);
  const rawMarkdown = getRawPostBySlug(post.slug);
  const pubDate = convertToUtcDate(post.date);

  // Convert relative image URL to absolute
  const absoluteImageUrl = post.image ? makeAbsoluteUrl(post.image) : '';

  // Prepend header image if exists (no inline styles for validator compatibility)
  const imageHtml = absoluteImageUrl
    ? `<img src="${escapeXml(absoluteImageUrl)}" alt="${escapeXml(post.title)}" />`
    : '';
  const fullContent = makeUrlsAbsolute(imageHtml + htmlContent);

  // Get markdown content without frontmatter for source:markdown
  const markdownContent = rawMarkdown
    ? rawMarkdown.replace(/^---[\s\S]*?---\n/, '').trim()
    : '';

  return `
		<item>
			<title>${escapeXml(post.title)}</title>
			<description>${escapeXml(post.description || '')}</description>
			<link>${siteUrl}/blog/${post.slug}</link>
			<guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
			<pubDate>${pubDate.toUTCString()}</pubDate>
			${absoluteImageUrl ? `<enclosure url="${escapeXml(absoluteImageUrl)}" type="image/jpeg" length="0"/>` : ''}
			<content:encoded><![CDATA[${fullContent}]]></content:encoded>
			${markdownContent ? `<source:markdown><![CDATA[${markdownContent}]]></source:markdown>` : ''}
		</item>`;
}

async function convertMarkdownToHtml(slug: string): Promise<string> {
  const rawContent = getRawPostBySlug(slug);
  if (!rawContent) return '';

  const contentWithoutFrontmatter = rawContent.replace(/^---[\s\S]*?---\n/, '');

  const result = await unified()
    .use(remarkParse)
    .use(remarkHtml)
    .process(contentWithoutFrontmatter);

  const html = String(result);

  // Escape ]]> within CDATA by replacing it with ]]]]><![CDATA[>
  return html.replace(/\]\]>/g, ']]]]><![CDATA[>');
}

function convertToUtcDate(localDate: Date): Date {
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();

  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function makeAbsoluteUrl(url: string): string {
  // If already absolute, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If relative, prepend site URL
  return url.startsWith('/') ? `${siteUrl}${url}` : `${siteUrl}/${url}`;
}

function makeUrlsAbsolute(html: string): string {
  // Convert relative URLs in src and href attributes to absolute
  return html
    .replace(/src="\/([^"]*)"/g, `src="${siteUrl}/$1"`)
    .replace(/href="\/([^"]*)"/g, `href="${siteUrl}/$1"`);
}
