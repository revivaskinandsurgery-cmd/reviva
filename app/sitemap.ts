import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/lib/content';

/* /sitemap.xml, built from Sanity: every page and blog post that is not
   hidden from Google, with its real last-edited date. Google ignores
   priority and changefreq, so only the address and date are listed. */
export const dynamic = 'force-dynamic';

const SITE = 'https://revivaskinandsurgery.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = (await getSitemapEntries()).sort((a, b) => a.path.localeCompare(b.path));
  return entries.map(({ path, updatedAt }) => ({
    url: SITE + (path === '/' ? '/' : path),
    lastModified: updatedAt,
  }));
}
