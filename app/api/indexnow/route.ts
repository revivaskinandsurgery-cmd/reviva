import { NextResponse } from 'next/server';

/* IndexNow: tells Bing (and other IndexNow engines) the moment a page changes.
   Set this up once: in Sanity (sanity.io/manage -> API -> Webhooks) add a
   webhook for publish to https://revivaskinandsurgery.com/api/indexnow?secret=<INDEXNOW_SECRET>,
   with the projection  {"path": path, "slug": slug.current, "type": _type},  and set
   INDEXNOW_SECRET in Vercel to the same value. The key file below is public by design. */
const KEY = '8ebed400c9511c3c0c17352e450c81f3';
const SITE = 'https://revivaskinandsurgery.com';

export async function POST(req: Request) {
  const secret = process.env.INDEXNOW_SECRET;
  if (!secret || new URL(req.url).searchParams.get('secret') !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { path?: string; slug?: string; type?: string };
  const path = body.path ?? (body.slug ? (body.type === 'post' ? '/blog/' : '/') + body.slug : null);
  if (!path) return NextResponse.json({ ok: false, error: 'no path' }, { status: 400 });
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: [SITE + (path === '/' ? '/' : path)] }),
  });
  return NextResponse.json({ ok: res.ok, status: res.status });
}
