/* Imports the WordPress blog (reviva.genesisvirtue.com) into Sanity as
   "post" + "postCategory" documents.

     node scripts/import-wp-blog.mjs --uploads <path to wp-content/uploads> [--dry] [--limit N]

   - Reads posts, categories, tags and SEO tags from the live WordPress site.
   - HTML -> Sanity rich text (headings, lists, links, pictures, tables, FAQ).
   - Pictures are uploaded to Sanity (taken from --uploads when the file is
     there, downloaded otherwise).
   - Safe to re-run: documents have fixed ids (wp-post-<slug>, category-<slug>),
     so a second run replaces them instead of duplicating.
   - --dry writes the documents to scripts/.import-preview.json and touches
     nothing in Sanity. Needs SANITY_API_WRITE_TOKEN in .env.local. */

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';
import { parse, HTMLElement, TextNode } from 'node-html-parser';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);
const DRY = flag('dry');
const LIMIT = Number(opt('limit')) || Infinity;
const UPLOADS = opt('uploads');
const SOURCE = 'https://reviva.genesisvirtue.com';

// New posts use the site's newer blog layout (same as 34 existing posts).
const DESIGN = JSON.stringify({ outer: 'main-wrapper', titleClass: 'blog-title', image: 'wrapped' });
const BODY_CLASS = 'rv-offset page-blog12';

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2025-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const key = () => randomBytes(5).toString('hex');

// ---- read the WordPress site ------------------------------------------------------

async function fetchPosts() {
  const out = [];
  for (let page = 1; ; page++) {
    const r = await fetch(`${SOURCE}/wp-json/wp/v2/posts?per_page=20&page=${page}&_embed=1`);
    if (r.status === 400) break; // past the last page
    if (!r.ok) throw new Error(`posts page ${page}: ${r.status}`);
    const rows = await r.json();
    out.push(...rows);
    if (page >= Number(r.headers.get('x-wp-totalpages'))) break;
  }
  return out;
}

const decode = (s) => parse(`<p>${s}</p>`).text.replace(/\s+/g, ' ').trim();

/** The page's own <title> and meta description (what Rank Math put there). */
async function seoOf(link) {
  const html = await (await fetch(link)).text();
  const root = parse(html, { blockTextElements: { script: false, style: false } });
  const title = root.querySelector('title')?.text.trim();
  const description = root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
  return { title: title && decode(title), description: description && decode(description) };
}

// ---- pictures ------------------------------------------------------------------------

const assetByUrl = new Map();
async function uploadImage(url) {
  if (assetByUrl.has(url)) return assetByUrl.get(url);
  const rel = decodeURIComponent(new URL(url).pathname).split('/wp-content/uploads/')[1];
  const local = UPLOADS && rel ? path.join(UPLOADS, rel) : null;
  let buf;
  if (local && existsSync(local)) buf = readFileSync(local);
  else {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`picture ${r.status}: ${url}`);
    buf = Buffer.from(await r.arrayBuffer());
  }
  const ref = DRY
    ? `image-${createHash('sha1').update(buf).digest('hex')}-0x0-${path.extname(url).slice(1) || 'png'}`
    : (await client.assets.upload('image', buf, { filename: path.basename(rel ?? url) }))._id;
  assetByUrl.set(url, ref);
  return ref;
}
const imageField = (ref) => ({ _type: 'image', asset: { _type: 'reference', _ref: ref } });

// ---- links ---------------------------------------------------------------------------------

let postSlugs = new Set(); // WordPress posts + posts already in Sanity
let pagePaths = new Set(); // pages already in Sanity
const SITE_HOSTS = /^(www\.)?(reviva\.genesisvirtue\.com|revivaskinandsurgery\.com)$/;
const unresolved = new Set();

/** Old WordPress address -> this site's address. null = drop the link (in-page anchor). */
function rewriteHref(href) {
  if (!href || href.startsWith('#')) return null;
  if (/^(tel:|mailto:)/i.test(href)) return { href, external: false };
  let u;
  try {
    u = new URL(href, SOURCE);
  } catch {
    return null;
  }
  if (!SITE_HOSTS.test(u.hostname)) return { href: u.href, external: true };
  let p = u.pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return { href: '/', external: false };
  const last = p.split('/').pop().replace(/\.html$/, '');
  if (postSlugs.has(last)) return { href: `/blog/${last}`, external: false };
  const bare = p.replace(/\.html$/, '');
  if (pagePaths.has(bare)) return { href: bare, external: false };
  if (LINK_FIXES[last]) return { href: LINK_FIXES[last], external: false };
  unresolved.add(href);
  return { href: bare, external: false };
}
// WordPress addresses that have no post of the same name -> the matching page on this site.
const LINK_FIXES = {
  'skin-barrier-repair-how-damaged-sensitive-skin-works': '/blog/skin-barrier-repair',
  'skin-barrier-repair-how-dermatologist-guided-care-helps-damaged-sensitive-skin': '/blog/skin-barrier-repair',
  'best-sunscreen-for-noida-weather-how-to-choose-spf-for-pollution-heat-and-indian-skin': '/blog/best-sunscreen-for-noida',
  pigmentation: '/pigmentation-treatment',
  'hifu-skin-tightening': '/hifu-face-lift',
  'glutathione-skin-brightening': '/skin-brightening',
  'laser-hair-reduction-sessions': '/laser-hair-reduction',
  'skin-tightening-treatment-cost-noida': '/hifu-face-lift',
};

// ---- HTML -> rich text ---------------------------------------------------------------

const clean = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ');

/** Inline content of an element as spans (+ link definitions). */
function inline(el, ctx, marks = []) {
  const spans = [];
  const walk = (node, ms) => {
    if (node instanceof TextNode) {
      const text = clean(node.text);
      if (text) spans.push({ _type: 'span', _key: key(), text, marks: ms });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName?.toLowerCase();
    if (tag === 'br') return void spans.push({ _type: 'span', _key: key(), text: '\n', marks: ms });
    if (tag === 'img' || tag === 'script' || tag === 'style') return;
    if (tag === 'strong' || tag === 'b') ms = [...ms, 'strong'];
    else if (tag === 'em' || tag === 'i') ms = [...ms, 'em'];
    else if (tag === 'a') {
      const link = rewriteHref(node.getAttribute('href'));
      if (link) {
        const def = { _type: 'link', _key: key(), href: link.href, ...(link.external ? { newTab: true } : {}) };
        ctx.markDefs.push(def);
        ms = [...ms, def._key];
      }
    }
    node.childNodes.forEach((c) => walk(c, ms));
  };
  el.childNodes.forEach((c) => walk(c, marks));

  // Merge neighbours with the same marks; trim the block's ends.
  const merged = [];
  for (const s of spans) {
    const prev = merged[merged.length - 1];
    if (prev && prev.marks.join() === s.marks.join()) prev.text += s.text;
    else merged.push({ ...s });
  }
  if (merged.length) {
    merged[0].text = merged[0].text.replace(/^\s+/, '');
    merged[merged.length - 1].text = merged[merged.length - 1].text.replace(/\s+$/, '');
  }
  return merged.filter((s) => s.text !== '');
}

function textBlock(el, style, extra = {}) {
  const ctx = { markDefs: [] };
  const children = inline(el, ctx);
  if (!children.length) return null;
  const used = new Set(children.flatMap((c) => c.marks));
  return { _type: 'block', _key: key(), style, markDefs: ctx.markDefs.filter((d) => used.has(d._key)), children, ...extra };
}

const text = (el) => clean(el.text).trim();

function table(el) {
  const rows = el.querySelectorAll('tr').map((tr) => ({ _key: key(), cells: tr.querySelectorAll('th,td').map(text) }));
  const hasHeader = el.querySelectorAll('tr')[0]?.querySelectorAll('th').length > 0;
  return { _type: 'richTable', _key: key(), hasHeader, rows };
}

async function figureOf(img, caption) {
  const src = img.getAttribute('src');
  if (!src) return null;
  const url = new URL(src, SOURCE).href;
  return { _type: 'figure', _key: key(), image: imageField(await uploadImage(url)), alt: decode(img.getAttribute('alt') ?? ''), ...(caption ? { caption } : {}) };
}

async function convert(root) {
  const out = [];
  let faq = null;
  const flushFaq = () => {
    faq = null;
  };

  const lists = (listEl, listItem, level) => {
    for (const li of listEl.childNodes.filter((n) => n instanceof HTMLElement && n.tagName.toLowerCase() === 'li')) {
      const nested = li.childNodes.filter((n) => n instanceof HTMLElement && /^(ul|ol)$/i.test(n.tagName));
      const own = new HTMLElement('div', {}, '', null);
      li.childNodes.filter((n) => !nested.includes(n)).forEach((n) => own.appendChild(n.clone()));
      const b = textBlock(own, 'normal', { listItem, level });
      if (b) out.push(b);
      nested.forEach((n) => lists(n, n.tagName.toLowerCase() === 'ol' ? 'number' : 'bullet', level + 1));
    }
  };

  const walk = async (nodes) => {
    for (const n of nodes) {
      if (n instanceof TextNode) {
        const t = clean(n.text).trim();
        if (t) out.push({ _type: 'block', _key: key(), style: 'normal', markDefs: [], children: [{ _type: 'span', _key: key(), text: t, marks: [] }] });
        continue;
      }
      if (!(n instanceof HTMLElement)) continue;
      const tag = n.tagName?.toLowerCase();
      if (tag !== 'details') flushFaq();
      if (tag === 'p') {
        const imgs = n.querySelectorAll('img');
        if (imgs.length && !text(n)) for (const img of imgs) out.push(await figureOf(img));
        else {
          const b = textBlock(n, 'normal');
          if (b) out.push(b);
        }
      } else if (/^h[2-4]$/.test(tag)) {
        const b = textBlock(n, tag);
        if (b) out.push(b);
      } else if (tag === 'ul' || tag === 'ol') lists(n, tag === 'ol' ? 'number' : 'bullet', 1);
      else if (tag === 'table') out.push(table(n));
      else if (tag === 'figure') {
        const t = n.querySelector('table');
        const img = n.querySelector('img');
        if (t) out.push(table(t));
        else if (img) out.push(await figureOf(img, n.querySelector('figcaption') ? text(n.querySelector('figcaption')) : undefined));
      } else if (tag === 'img') out.push(await figureOf(n));
      else if (tag === 'details') {
        if (!faq) out.push((faq = { _type: 'postFaqList', _key: key(), items: [] }));
        const question = text(n.querySelector('summary'));
        n.querySelector('summary').remove();
        faq.items.push({ _type: 'postFaq', _key: key(), question, answer: text(n) });
      } else if (tag === 'div' && /rank-math-toc/.test(n.getAttribute('class') ?? '')) continue; // table of contents
      else if (['script', 'style', 'hr', 'noscript'].includes(tag)) continue;
      else await walk(n.childNodes);
    }
  };
  await walk(root.childNodes);
  return out.filter(Boolean);
}

// ---- documents -----------------------------------------------------------------------------

const words = (blocks) =>
  blocks.reduce((n, b) => n + (b.children ? b.children.map((c) => c.text ?? '').join(' ') : (b.rows ?? []).flatMap((r) => r.cells).join(' ')).split(/\s+/).filter(Boolean).length, 0);
const excerptOf = (html) => {
  const t = decode(html);
  if (t.length <= 220) return t;
  const cut = t.slice(0, 220);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s-]+$/, '') + '…';
};

async function main() {
  console.log('Reading WordPress…');
  const wp = (await fetchPosts()).slice(0, LIMIT);
  console.log(`${wp.length} posts`);

  {
    const have = await client.fetch(`{ "posts": *[_type == "post"].slug.current, "pages": *[_type == "page"].path }`);
    postSlugs = new Set(have.posts);
    pagePaths = new Set(have.pages);
  }
  wp.forEach((p) => postSlugs.add(p.slug));

  const categories = new Map(); // slug -> doc
  const docs = [];
  for (const [i, p] of wp.entries()) {
    const terms = p._embedded?.['wp:term'] ?? [];
    const cats = (terms[0] ?? []).filter((c) => c.slug !== 'uncategorized');
    for (const c of cats)
      categories.set(c.slug, { _id: `category-${c.slug}`, _type: 'postCategory', title: decode(c.name), slug: { _type: 'slug', current: c.slug }, ...(c.description ? { description: decode(c.description) } : {}) });

    const body = await convert(parse(p.content.rendered, { blockTextElements: { script: false, style: false } }));
    const seo = await seoOf(p.link);
    const media = p._embedded?.['wp:featuredmedia']?.[0];
    const title = decode(p.title.rendered);
    docs.push({
      _id: `wp-post-${p.slug}`,
      _type: 'post',
      title,
      slug: { _type: 'slug', current: p.slug },
      author: 'Reviva',
      publishedAt: p.date.slice(0, 10),
      readMinutes: Math.max(1, Math.ceil(words(body) / 200)),
      categories: cats.map((c) => ({ _type: 'reference', _key: key(), _ref: `category-${c.slug}` })),
      tags: (terms[1] ?? []).map((t) => decode(t.name)),
      ...(media?.source_url ? { cover: { _type: 'picture', image: imageField(await uploadImage(media.source_url)), alt: decode(media.alt_text || title) } } : {}),
      excerpt: excerptOf(p.excerpt.rendered),
      body,
      seoTitle: seo.title && seo.title !== title ? seo.title : undefined,
      metaDescription: seo.description,
      noindex: false,
      design: DESIGN,
      bodyClass: BODY_CLASS,
    });
    process.stdout.write(`\r${i + 1}/${wp.length} ${p.slug.slice(0, 60).padEnd(60)}`);
  }
  console.log();

  const all = [...categories.values(), ...docs];
  if (unresolved.size) console.log('Links that point to a page I could not find (kept as /path):\n  ' + [...unresolved].join('\n  '));
  if (DRY) {
    writeFileSync('scripts/.import-preview.json', JSON.stringify(all, null, 2));
    console.log(`Dry run: ${categories.size} categories, ${docs.length} posts, ${assetByUrl.size} pictures -> scripts/.import-preview.json`);
    return;
  }
  for (let i = 0; i < all.length; i += 20) {
    const tx = client.transaction();
    all.slice(i, i + 20).forEach((d) => tx.createOrReplace(d));
    await tx.commit();
  }
  console.log(`Saved ${categories.size} categories and ${docs.length} posts (${assetByUrl.size} pictures) to Sanity.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
