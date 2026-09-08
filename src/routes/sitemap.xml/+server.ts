import { getSitemapEntries, type SitemapEntry } from '$lib/utils/sitemap';
import { PUBLIC_APP_URL } from '$env/static/public';

const siteUrl = PUBLIC_APP_URL.replace(/\/$/, '');

/**
 * GET /sitemap.xml
 * Sitemap 0.9 document listing every indexable URL on the site.
 */
export async function GET() {
  const entries = await getSitemapEntries();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(urlElement).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=0, s-maxage=3600'
    }
  });
}

function urlElement(entry: SitemapEntry): string {
  const loc = `  <url>\n    <loc>${escapeXml(siteUrl + entry.path)}</loc>`;
  const lastmod = entry.lastmod ? `\n    <lastmod>${formatLastmod(entry.lastmod)}</lastmod>` : '';
  return `${loc}${lastmod}\n  </url>`;
}

/**
 * W3C Datetime, date precision. Read from local components to match the
 * noon-local normalization applied to post dates, so the day never shifts.
 */
function formatLastmod(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
