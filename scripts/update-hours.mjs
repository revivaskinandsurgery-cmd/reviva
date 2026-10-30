/* Puts each clinic's opening hours (as in the Google Business Profile) into
   Sanity: Site Settings, the Contact page, the Noida landing page and the
   Contact page's Google description.

     node scripts/update-hours.mjs [--dry] */

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

// Google Business Profile, 30 Oct 2026.
const HOURS = {
  noida: 'Tue–Sun: 11:00 AM – 8:00 PM\nMonday: Closed',
  ghaziabad: 'Fri–Wed: 11:00 AM – 8:00 PM\nThursday: Closed',
};

const tx = client.transaction();

// Site Settings: hours per clinic (the old single line is no longer shown)
const settings = await client.fetch(`*[_type == "siteSettings"][0]{ _id, locations }`);
for (const loc of settings.locations) {
  const h = HOURS[loc.name.toLowerCase()];
  if (h) tx.patch(settings._id, (p) => p.set({ [`locations[_key=="${loc._key}"].hours`]: h }));
}

// Contact page: a note under each address, and the Google description
const contact = await client.fetch(`*[_type == "page" && path == "/contact"][0]{ _id, metaDescription, "block": blocks[_type == "contactSection"][0]{ _key, details } }`);
for (const d of contact.block.details) {
  const base = `blocks[_key=="${contact.block._key}"].details[_key=="${d._key}"]`;
  if (/^GHAZIABAD ADDRESS/i.test(d.label)) tx.patch(contact._id, (p) => p.set({ [`${base}.note`]: HOURS.ghaziabad }));
  if (/^NOIDA ADDRESS/i.test(d.label)) tx.patch(contact._id, (p) => p.set({ [`${base}.note`]: HOURS.noida }));
}
tx.patch(contact._id, (p) => p.set({ metaDescription: contact.metaDescription.replace('Open Mon–Sat.', 'Open six days a week at each clinic.') }));

// Noida landing page footer
const lp = await client.fetch(`*[_type == "landingPage" && slug.current == "skin-clinic-in-noida"][0]{ _id, "k": sections[_type == "clinicFooter"][0]._key }`);
if (lp?.k) tx.patch(lp._id, (p) => p.set({ [`sections[_key=="${lp.k}"].hours`]: '🕐 Tue–Sun: 11AM – 8PM\nMonday: Closed' }));

console.log(`clinics: ${settings.locations.length} | contact notes: yes | landing: ${lp?.k ? 'yes' : 'no'}`);
console.log('new Contact description:', contact.metaDescription.replace('Open Mon–Sat.', 'Open six days a week at each clinic.'));
if (!DRY) {
  await tx.commit();
  console.log('Saved.');
}
