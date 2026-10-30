/* Puts the clinic addresses exactly as they are in the Google Business Profile
   everywhere in Sanity, and links them to the Google Maps listings.

     node scripts/update-addresses.mjs [--dry]

   Updates: Site Settings (address, Google Maps link, coordinates), the
   Contact page, the Noida landing page, the Noida page's Google text, and
   the address lines inside the blog posts. Opening hours are NOT touched
   here (they come from the Google Business Profile separately). */

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

// As written in the Google Business Profile.
const NOIDA = 'Gate No 4, Shop No 14 Ground Floor, Market, Amarpali Silicon City, Sector 76, Noida, Uttar Pradesh 201316';
const GHAZIABAD = 'Shop No.S-1, ground floor, quantum homes, Raj Nagar Extension, Ghaziabad, Uttar Pradesh 201003';
// The clinics' Google Maps share links (they open the Google listing) and the listing coordinates.
const MAP = { noida: 'https://maps.app.goo.gl/oryJZZWTJUrodyWL7', ghaziabad: 'https://maps.app.goo.gl/uGRdHKQP13mucXw39' };
const GEO = { noida: [28.5681651, 77.3832994], ghaziabad: [28.7001353, 77.427272] };

// Older ways the same two addresses were written in the imported posts.
const OLD_NOIDA = /(?:S No\.?[- ]?14,?(?: GF| Ground Floor)?,?\s*)?(?:Street 76 Market,?\s*)?Amrapali Silicon City,?\s*Gate No\.?[- ]?4,?\s*Sector[ -]?76,?\s*Noida(?:,\s*Uttar Pradesh)?(?:\s*\d{6})?/i;
const OLD_GHAZIABAD = /(?:Shop (?:No\.? ?)?S-1,?\s*)?Ground Floor,\s*Quantum Homes,\s*Raj Nagar Extension,\s*Ghaziabad(?:,\s*Uttar Pradesh)?(?:\s*\d{6})?/i;

const tx = client.transaction();

// 1) Site Settings
const settings = await client.fetch(`*[_type == "siteSettings"][0]{ _id, locations }`);
for (const loc of settings.locations) {
  const k = loc.name.toLowerCase();
  if (!MAP[k]) continue;
  const base = `locations[_key=="${loc._key}"]`;
  tx.patch(settings._id, (p) =>
    p.set({
      [`${base}.address`]: k === 'noida' ? NOIDA : GHAZIABAD,
      [`${base}.mapUrl`]: MAP[k],
      [`${base}.latitude`]: GEO[k][0],
      [`${base}.longitude`]: GEO[k][1],
    }),
  );
}

// 2) Contact page: the two address boxes (the address itself opens Google Maps)
const contact = await client.fetch(`*[_type == "page" && path == "/contact"][0]{ _id, "block": blocks[_type == "contactSection"][0]{ _key, details } }`);
for (const d of contact.block.details) {
  const base = `blocks[_key=="${contact.block._key}"].details[_key=="${d._key}"]`;
  if (/^GHAZIABAD ADDRESS/i.test(d.label)) tx.patch(contact._id, (p) => p.set({ [`${base}.value`]: GHAZIABAD, [`${base}.href`]: MAP.ghaziabad }));
  if (/^NOIDA ADDRESS/i.test(d.label)) tx.patch(contact._id, (p) => p.set({ [`${base}.value`]: NOIDA, [`${base}.href`]: MAP.noida }));
}

// 3) Noida landing page footer
const lp = await client.fetch(`*[_type == "landingPage" && slug.current == "skin-clinic-in-noida"][0]{ _id, "k": sections[_type == "clinicFooter"][0]._key }`);
if (lp?.k) tx.patch(lp._id, (p) => p.set({ [`sections[_key=="${lp.k}"].address`]: `📍 Reviva Skin & Surgery Clinic\n${NOIDA}` }));

// 4) Noida page: Google text uses the same spelling as the Google listing
const noida = await client.fetch(`*[_type == "page" && path == "/noida"][0]{ _id, metaDescription, keywords }`);
if (noida) {
  tx.patch(noida._id, (p) =>
    p.set({
      metaDescription: (noida.metaDescription ?? '').replace(/Amrapali/g, 'Amarpali'),
      keywords: (noida.keywords ?? []).map((w) => w.replace(/Amrapali/g, 'Amarpali')),
    }),
  );
}

// 5) Address lines inside the blog posts
const posts = await client.fetch(`*[_type == "post" && !(_id in path("drafts.**"))]{ _id, "slug": slug.current, body }`);
let changedPosts = 0;
let lines = 0;
const left = [];
for (const post of posts) {
  let changed = false;
  const body = (post.body ?? []).map((b) => {
    if (b._type !== 'block') return b;
    const children = b.children.map((c) => {
      if (c._type !== 'span') return c;
      let t = c.text.replace(OLD_NOIDA, NOIDA).replace(OLD_GHAZIABAD, GHAZIABAD);
      if (t !== c.text) {
        changed = true;
        lines++;
        return { ...c, text: t };
      }
      return c;
    });
    return { ...b, children };
  });
  if (changed) {
    changedPosts++;
    tx.patch(post._id, (p) => p.set({ body }));
  }
  const rest = JSON.stringify(body).match(/.{40}(Amrapali|201017|201301|201003 Raj).{30}/gi);
  if (rest) left.push(`${post.slug}: ${rest[0]}`);
}
console.log(`settings: ${settings.locations.length} locations | contact: ${contact.block.details.length} details | landing: ${lp?.k ? 'yes' : 'no'} | posts changed: ${changedPosts} (${lines} address lines)`);
if (left.length) console.log(`old address text still found in ${left.length} posts:\n  ` + left.slice(0, 8).join('\n  '));

if (!DRY) {
  await tx.commit();
  console.log('Saved.');
}
