import type { MetadataRoute } from 'next';

/* /robots.txt: everything public may be crawled; the CMS, the API and the
   internal search results may not. */
const SITE = 'https://revivaskinandsurgery.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/studio', '/api/', '/blogs?q='] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
