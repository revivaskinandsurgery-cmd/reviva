/* One-time: writes into every blog post the pages it is shown on
   ("Show this article on these pages"). It copies what the treatment pages
   showed through their category settings, so visitors see no change and
   editors can now see - and change - exactly where each post appears.

     node scripts/attach-posts-to-pages.mjs [--dry] */

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

const pages = await client.fetch(
  `*[_type == "page" && !(_id in path("drafts.**"))]{ _id, path, "topics": array::unique(blocks[_type == "relatedPosts"].categories[]._ref) }`,
);
const posts = await client.fetch(`*[_type == "post" && !(_id in path("drafts.**")) && hideFromBlog != true]{ _id, title, "topics": categories[]._ref }`);

const tx = client.transaction();
let links = 0;
for (const post of posts) {
  const mine = new Set(post.topics ?? []);
  const here = pages.filter((p) => (p.topics ?? []).some((t) => mine.has(t)));
  if (!here.length) continue;
  links += here.length;
  tx.patch(post._id, (x) =>
    x.set({ relatedPages: here.map((p) => ({ _type: 'reference', _key: randomBytes(5).toString('hex'), _ref: p._id })) }),
  );
}
console.log(`${posts.length} posts -> ${links} page links`);
if (!DRY) {
  await tx.commit();
  console.log('Saved.');
}
