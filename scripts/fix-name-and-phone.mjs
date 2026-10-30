/* Makes the clinic name and the Noida phone number the same everywhere:
   - "Reviva Skin & Hair Clinic" / "Reviva Skin and Hair Clinic" (old WordPress
     wording) -> "Reviva Skin & Surgery Clinic" (the name in Google)
   - the Noida landing page's other number (85956 53559) -> 85958 56844
     (the number in Google and on the website), in links and in the text

     node scripts/fix-name-and-phone.mjs [--dry] */

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

const NAME = 'Reviva Skin & Surgery Clinic';
const OLD_NAME = /Reviva Skin\s*(?:&|&amp;|and)\s*Hair(?:\s+Clinic)?/gi;
const NEW_DIGITS = '8595856844';
// 8595653559 written with any spaces, dashes or +91 around it
const OLD_PHONE = /8\D{0,2}5\D{0,2}9\D{0,2}5\D{0,2}6\D{0,2}5\D{0,2}3\D{0,2}5\D{0,2}5\D{0,2}9/g;

const counts = { name: 0, phone: 0 };
const samples = [];

/** Replaces each digit of the old number with the new one, keeping the spacing: "85956 53559" -> "85958 56844". */
const swapPhone = (match) => {
  let i = 0;
  return match.replace(/\d/g, () => NEW_DIGITS[i++]);
};

function fix(value, path, doc) {
  if (typeof value === 'string') {
    let out = value;
    if (OLD_NAME.test(out)) {
      OLD_NAME.lastIndex = 0;
      out = out.replace(OLD_NAME, () => (counts.name++, NAME));
    }
    OLD_NAME.lastIndex = 0;
    if (/8\D{0,2}5\D{0,2}9\D{0,2}5\D{0,2}6\D{0,2}5\D{0,2}3\D{0,2}5\D{0,2}5\D{0,2}9/.test(out)) {
      out = out.replace(OLD_PHONE, (m) => (counts.phone++, swapPhone(m)));
    }
    if (out !== value && samples.length < 6) samples.push(`${doc._type} ${doc.path || doc.slug?.current || doc._id} ${path}: "${value.slice(0, 70)}" -> "${out.slice(0, 70)}"`);
    return out;
  }
  if (Array.isArray(value)) return value.map((x, i) => fix(x, `${path}[${i}]`, doc));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === '_id' || k === '_type' || k === '_key' || k === '_ref' ? v : fix(v, `${path}.${k}`, doc)]));
  }
  return value;
}

const docs = await client.fetch(`*[_type in ["post","page","landingPage","siteSettings"] && !(_id in path("drafts.**"))]`);
const tx = client.transaction();
let changed = 0;
for (const doc of docs) {
  const patch = {};
  for (const [k, v] of Object.entries(doc)) {
    if (k.startsWith('_')) continue;
    const nv = fix(v, `.${k}`, doc);
    if (JSON.stringify(nv) !== JSON.stringify(v)) patch[k] = nv;
  }
  if (Object.keys(patch).length) {
    changed++;
    tx.patch(doc._id, (p) => p.set(patch));
  }
}
console.log(`${docs.length} documents scanned | ${changed} changed | clinic name replaced ${counts.name}x | phone replaced ${counts.phone}x`);
samples.forEach((s) => console.log('  ', s));
if (!DRY) {
  await tx.commit();
  console.log('Saved.');
}
