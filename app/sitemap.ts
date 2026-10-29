import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/lib/content';

/* /sitemap.xml, built from Sanity: every page and blog post that is not
   hidden from Google, with its real last-edited date. */
export const dynamic = 'force-dynamic';

const SITE = 'https://revivaskinandsurgery.com';

const priority = (p: string) => (p === '/' ? 1 : /^\/(blogs|treatment|contact|about|noida|ghaziabad)$/.test(p) ? 0.9 : p.startsWith('/blog/') ? 0.7 : 0.8);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = (await getSitemapEntries()).sort((a, b) => a.path.localeCompare(b.path));
  return entries.map(({ path, updatedAt }) => ({
    url: SITE + (path === '/' ? '/' : path),
    lastModified: updatedAt,
    changeFrequency: path.startsWith('/blog/') ? 'monthly' : path === '/blogs' ? 'daily' : 'weekly',
    priority: priority(path),
  }));
}
