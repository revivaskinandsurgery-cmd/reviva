import type { MetadataRoute } from 'next';

/* /robots.txt: everything public may be crawled, by search engines and by AI
   assistants / AI search; the CMS, the API and the internal search results
   may not. Each named crawler gets its own group (a named group replaces the
   "*" group for that crawler, so the blocked paths are repeated). */
const SITE = 'https://revivaskinandsurgery.com';
const BLOCKED = ['/studio', '/api/', '/blogs?q='];
const AI_AND_SEARCH_BOTS = [
  'Googlebot', 'Bingbot', 'Google-Extended', 'Applebot', 'Applebot-Extended',
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'PerplexityBot', 'Perplexity-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: BLOCKED }, ...AI_AND_SEARCH_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow: BLOCKED }))],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
