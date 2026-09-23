import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import { markdownBody, type PostMetadata } from './post-model';

export const escapeXml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
      })[char]!
  );
// Posts from before dated permalinks keep their /blog/slug GUIDs so feed
// readers don't show them again as new items.
const DATED_GUIDS_SINCE = new Date('2026-09-23T00:00:00-07:00');

const cdata = (value: string) => value.replace(/\]\]>/g, ']]]]><![CDATA[>');

export async function renderFeedItem(
  post: PostMetadata,
  source: string,
  siteUrl: string
): Promise<string> {
  const url = new URL(post.permalink, siteUrl).href;
  const guid = post.date < DATED_GUIDS_SINCE ? new URL(`/blog/${post.slug}`, siteUrl).href : url;
  const body = markdownBody(source)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .trim();
  const markdown = post.image ? `![](${new URL(post.image, siteUrl).href})\n\n${body}` : body;
  // These are repository-authored Markdown/HTML files already compiled by MDsveX on
  // the site. Retain their HTML (including publisher photos and attributed quotes).
  const result = await unified()
    .use(remarkParse)
    .use(remarkHtml, { sanitize: false })
    .process(markdown);
  const html = String(result).replace(
    /(src|href)="([^"]*)"/g,
    (match, attribute: string, value: string) => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return match;
      return `${attribute}="${escapeXml(new URL(value.replace(/&amp;/g, '&'), url).href)}"`;
    }
  );
  return `<item>
    ${post.title ? `<title>${escapeXml(post.title)}</title>` : ''}
    <description>${escapeXml(html)}</description>
    <link>${escapeXml(url)}</link>
    <guid isPermaLink="true">${escapeXml(guid)}</guid>
    <pubDate>${post.date.toUTCString()}</pubDate>
    ${post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join('')}
    <content:encoded><![CDATA[${cdata(html)}]]></content:encoded>
    <source:markdown><![CDATA[${cdata(markdown)}]]></source:markdown>
  </item>`;
}
