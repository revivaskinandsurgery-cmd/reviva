/* Tidies the Google title + description of the imported blog posts: titles
   short enough not to be cut off in search results (about 60 characters,
   keyword first), descriptions 100-175 characters.

     node scripts/seo-posts.mjs [--dry] */

import { existsSync } from 'node:fs';
import { createClient } from '@sanity/client';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const DRY = process.argv.includes('--dry');
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2025-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const BRAND = ' | Reviva';
const PLACE = /(Noida|Ghaziabad|NCR|Raj Nagar Extension|Sector 76)/;
const STOP = /\s+(and|or|which|how|what|when|why|for|in|with|at|the|of|to|a|—|–)$/i;

function seoTitle(title) {
  const fit = (t) => (t.length + BRAND.length <= 62 ? t + BRAND : t);
  if (title.length <= 66) return fit(title);
  // Keep the first part ("Botox and Dermal Fillers in Noida: How ... Are Planned") and its place name.
  const m = title.match(/^[^:?]+[?]?/);
  let head = m[0].trim();
  if (head.length >= 14 && head.length < title.length) {
    if (!PLACE.test(head) && PLACE.test(title)) head = head.replace(/[?]$/, '') + ' in ' + title.match(PLACE)[1];
    return fit(head);
  }
  if (head.length === title.length && title.length <= 72) return title;
  // Short first part: cut the whole title at a natural break before ~60 characters.
  const cut = title.slice(0, 61);
  const lower = cut.toLowerCase();
  const breaks = [' and ', ' or ', ' which ', ' how ', ' what ', ' when ', ' why ', ' for ', ' in ', ' with ', '—'].map((w) => lower.lastIndexOf(w)).filter((i) => i >= 30);
  let out = breaks.length ? cut.slice(0, Math.max(...breaks)) : cut.slice(0, cut.lastIndexOf(' '));
  while (STOP.test(out)) out = out.replace(STOP, '');
  return out.replace(/[, ;:]+$/, '').trim();
}

/** Whole sentences of the first real paragraph, up to 155 characters. */
function description(body) {
  const text =
    (body ?? [])
      .filter((b) => b._type === 'block' && !b.listItem && b.style === 'normal')
      .map((b) => (b.children ?? []).map((c) => c.text ?? '').join('').replace(/\s+/g, ' ').trim())
      .find((t) => t.length >= 90 && !/^by /i.test(t)) ?? '';
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [text];
  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length > 155) break;
    out += s;
  }
  out = out.trim();
  if (out.length >= 110) return out;
  const cut = text.slice(0, 154);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s-]+$/, '') + '…';
}

const posts = await client.fetch(`*[_type == "post" && _id match "wp-post-*"]{ _id, title, metaDescription, "body": body[0...8] }`);
const tx = client.transaction();
for (const p of posts) {
  const set = { seoTitle: seoTitle(p.title) };
  const d = p.metaDescription ?? '';
  if (d.length < 100 || d.length > 175) set.metaDescription = description(p.body);
  tx.patch(p._id, (x) => x.set(set));
  if (DRY) console.log(set.seoTitle.length, set.seoTitle, set.metaDescription ? `\n    [${set.metaDescription.length}] ${set.metaDescription}` : '');
}
if (!DRY) await tx.commit();
console.log(`${posts.length} posts ${DRY ? '(dry run)' : 'saved'}`);
