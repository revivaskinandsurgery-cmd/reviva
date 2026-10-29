/* Adds a "Related blog articles" section to the treatment pages, linked to
   the blog categories that fit each treatment. Run again after changing the
   table; the section is replaced, not duplicated. Editors can change it
   per page in Studio (the section "Related blog articles").

     node scripts/add-related-posts.mjs [--dry] */

import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
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

// category slug sets, then the pages that use them
const ACNE = ['acne', 'co2-laser', 'medifacials'];
const HAIR = ['hair-fall-treatment', 'prp-treatments', 'premature-greying'];
const AGEING = ['anti-aging-treatments', 'medifacials', 'bridal-skincare'];
const PIGMENT = ['pigmentation-melasma', 'glutathione', 'medifacials'];
const LASER_HAIR = ['laser-hair-reduction', 'pigmentation-melasma', 'bridal-skincare'];
const FACIALS = ['medifacials', 'carbon-facial', 'bridal-skincare', 'glutathione'];

const PAGES = {
  '/acne': [ACNE, 'Read more about acne treatment'],
  '/acne-treatment': [ACNE, 'Read more about acne treatment'],
  '/acne-scars': [['co2-laser', 'acne', 'medifacials'], 'Read more about acne scar treatment'],
  '/scar-excision': [['co2-laser', 'acne', 'anti-aging-treatments'], 'Read more about scar treatment'],
  '/stretch-marks': [['co2-laser', 'anti-aging-treatments', 'medifacials'], 'Read more about skin treatments'],
  '/alopecia-treatment': [HAIR, 'Read more about hair loss treatment'],
  '/hair': [HAIR, 'Read more about hair loss treatment'],
  '/hair-transplant': [HAIR, 'Read more about hair restoration'],
  '/female-hair-thinning': [HAIR, 'Read more about hair thinning'],
  '/gfc-therapy': [HAIR, 'Read more about hair treatments'],
  '/growth-factors-mesotherapy': [HAIR, 'Read more about hair treatments'],
  '/dutexome-mesotherapy': [HAIR, 'Read more about hair treatments'],
  '/antiageing': [AGEING, 'Read more about anti-ageing treatments'],
  '/skin': [AGEING, 'Read more about skin rejuvenation'],
  '/wrinkle-reduction': [AGEING, 'Read more about wrinkle treatment'],
  '/hifu-face-lift': [AGEING, 'Read more about skin tightening'],
  '/hifu-treatment-in-noida': [AGEING, 'Read more about skin tightening'],
  '/rf-face-tightening': [AGEING, 'Read more about skin tightening'],
  '/thread-lift': [AGEING, 'Read more about non-surgical lifting'],
  '/neck-lines-treatment': [AGEING, 'Read more about neck and chin treatments'],
  '/double-chin-reduction': [AGEING, 'Read more about neck and chin treatments'],
  '/face-lift-fillers': [AGEING, 'Read more about fillers and lifting'],
  '/butox': [AGEING, 'Read more about Botox and fillers'],
  '/lip-fillers': [AGEING, 'Read more about fillers'],
  '/under-eye-fillers': [AGEING, 'Read more about under-eye treatments'],
  '/jawline-enhancement': [AGEING, 'Read more about fillers and contouring'],
  '/cheek-enhancement': [AGEING, 'Read more about fillers and contouring'],
  '/non-surgical-rhinoplasty': [AGEING, 'Read more about fillers'],
  '/laser-hair-removal': [LASER_HAIR, 'Read more about laser hair removal'],
  '/laser-hair-reduction': [LASER_HAIR, 'Read more about laser hair reduction'],
  '/pigmentation-treatment': [PIGMENT, 'Read more about pigmentation treatment'],
  '/melasma-treatment': [PIGMENT, 'Read more about melasma treatment'],
  '/laser-for-pigmentation': [PIGMENT, 'Read more about pigmentation treatment'],
  '/freckles': [PIGMENT, 'Read more about pigmentation treatment'],
  '/dark-lips-treatment': [PIGMENT, 'Read more about pigmentation treatment'],
  '/dark-circles-treatment': [PIGMENT, 'Read more about dark circles and pigmentation'],
  '/underarm': [PIGMENT, 'Read more about pigmentation treatment'],
  '/birth-mark': [PIGMENT, 'Read more about pigmentation treatment'],
  '/skin-brightening': [['glutathione', 'pigmentation-melasma', 'medifacials'], 'Read more about skin brightening'],
  '/body-polishing': [FACIALS, 'Read more about facials and glow treatments'],
  '/hydra-facial': [FACIALS, 'Read more about Hydrafacial and facials'],
  '/medi-facials': [FACIALS, 'Read more about medical facials'],
  '/fire-and-ice-facial': [FACIALS, 'Read more about facials'],
  '/oxygeneo-facial': [FACIALS, 'Read more about facials'],
  '/lumiere-glow-ritual': [FACIALS, 'Read more about glow treatments'],
  '/reviva-glow-infusion': [FACIALS, 'Read more about glow treatments'],
  '/prx-plus-treatment': [FACIALS, 'Read more about skin rejuvenation'],
};

const key = () => randomBytes(5).toString('hex');
const cats = await client.fetch(`*[_type == "postCategory"]{ _id, "slug": slug.current }`);
const catId = new Map(cats.map((c) => [c.slug, c._id]));
const pages = await client.fetch(`*[_type == "page" && !(_id in path("drafts.**"))]{ _id, path, "types": blocks[]._type, "keys": blocks[]._key }`);

const tx = client.transaction();
let n = 0;
for (const p of pages) {
  const row = PAGES[p.path];
  if (!row) continue;
  const [slugs, heading] = row;
  const missing = slugs.filter((s) => !catId.has(s));
  if (missing.length) console.log(`${p.path}: unknown categories ${missing.join(', ')}`);
  const block = {
    _type: 'relatedPosts',
    _key: key(),
    heading,
    limit: 3,
    categories: slugs.filter((s) => catId.has(s)).map((s) => ({ _type: 'reference', _key: key(), _ref: catId.get(s) })),
  };
  const types = p.types ?? [];
  const old = types.indexOf('relatedPosts');
  const patch = (x) => {
    if (old >= 0) return x.set({ [`blocks[_key=="${p.keys[old]}"]`]: block });
    // before the closing call-to-action banner when there is one, else at the end
    return types[types.length - 1] === 'ctaBanner'
      ? x.insert('before', `blocks[_key=="${p.keys[types.length - 1]}"]`, [block])
      : x.append('blocks', [block]);
  };
  tx.patch(p._id, patch);
  n++;
}
const left = pages.filter((p) => !PAGES[p.path] && (p.types ?? []).includes('serviceHero')).map((p) => p.path);
console.log(`${n} pages get "Related blog articles". Treatment pages without one: ${left.join(', ') || 'none'}`);
if (!DRY) {
  await tx.commit();
  console.log('Saved.');
}
