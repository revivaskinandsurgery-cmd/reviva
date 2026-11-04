import { NextResponse, type NextRequest } from 'next/server';
import { writeClient } from '@/lib/sanity';

/* POST /api/enquiry: validates a lead from the contact form, stores it as an
   "enquiry" in Sanity (Studio → Enquiries) and, when configured, emails it
   via Resend. Answers JSON for the form script; a plain form post (no
   JavaScript) is redirected back to /contact?sent=1. */

const TRACKING = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'referrer', 'landing_page'] as const;

// Best-effort per-instance limit: a person sends one or two, a script sends dozens.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  return recent.length > MAX_PER_WINDOW;
}

// Native digits (Devanagari, Arabic-Indic) to 0-9, so "९८७६…" is a valid number.
const DIGIT_ZEROS = [0x660, 0x6f0, 0x966];
const asciiDigits = (s: string) =>
  s.replace(/[٠-٩۰-۹०-९]/g, (c) => {
    const code = c.charCodeAt(0);
    return String(code - DIGIT_ZEROS.filter((z) => z <= code).pop()!);
  });

/* Obvious keyboard-mash only; ordinary names and sentences never match.
   Returns why it looks automated, or null. */
function junkReason(name: string, email: string, message: string) {
  const midCaps = name.slice(1).replace(/[^A-Z]/g, '').length;
  if (!/\s/.test(name) && name.length >= 15 && midCaps >= 3) return 'name looks random';
  if (/[bcdfghjklmnpqrstvwxz]{6,}/i.test(name)) return 'name has 6+ consonants in a row';
  if (/[A-Za-z]{20,}/.test(message)) return 'message has a 20+ letter "word"';
  if ((email.split('@')[0].match(/\./g) ?? []).length >= 4) return 'email has 4+ dots before @';
  return null;
}

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/contact', req.url), 303);
}

export async function POST(req: NextRequest) {
  const wantsJson =
    (req.headers.get('accept') ?? '').includes('application/json') ||
    (req.headers.get('x-requested-with') ?? '').toLowerCase() === 'xmlhttprequest';

  const respond = (ok: boolean, message: string) =>
    wantsJson
      ? NextResponse.json({ ok, message }, { status: ok ? 200 : 422 })
      : ok
        ? NextResponse.redirect(new URL('/contact?sent=1', req.url), 303)
        : new NextResponse(message, { status: 422 });

  const form = await req.formData();
  // Cut by whole characters so an emoji is never split in half.
  const field = (k: string, max = 500) => Array.from(String(form.get(k) ?? '').trim()).slice(0, max).join('');

  // Honeypot: a hidden input people never see. Bots fill every field; answer as
  // if it worked and store nothing.
  if (field('hp_site') || field('website')) return respond(true, 'Thank you.');

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    console.warn('Enquiry dropped: rate limit', ip);
    return respond(true, 'Thank you.');
  }

  const name = field('full_name', 120) || field('name', 120);
  let phone = asciiDigits(field('phone')).replace(/\D/g, '');
  if (phone.length > 10) phone = phone.slice(-10); // strip leading 91 / 0

  const errors: string[] = [];
  if (name.length < 2) errors.push('Please enter your name.');
  if (!/^[6-9]\d{9}$/.test(phone)) errors.push('Please enter a valid 10-digit mobile number.');
  if (errors.length) return respond(false, errors.join(' '));

  // Keyboard-mash: answer as if it worked, store and email nothing. The reason
  // goes to the server log only, so a wrongly caught lead can be traced there.
  const spamReason = junkReason(name, field('email', 190), field('message', 4000));
  if (spamReason) {
    console.warn('Enquiry dropped as junk:', spamReason, '|', name, '|', phone);
    return respond(true, 'Thank you! We will call you shortly.');
  }

  const doc = {
    _type: 'enquiry',
    name,
    phone,
    email: field('email', 190) || undefined,
    concern: field('concern', 190) || undefined,
    message: field('message', 4000) || undefined,
    status: 'new',
    sourcePage: field('source_page') || req.headers.get('referer') || undefined,
    tracking: Object.fromEntries(TRACKING.map((k) => [k, field(k) || undefined])),
    submittedAt: new Date().toISOString(),
  };

  // A lead must not be lost quietly: fail loudly if it can't be stored.
  if (!writeClient) return respond(false, 'Enquiries are not configured yet. Please call us instead.');
  try {
    await writeClient.create(doc);
  } catch (e) {
    console.error('Enquiry save failed', e);
    return respond(false, 'Something went wrong saving your request. Please call us instead.');
  }

  const to = process.env.LEAD_EMAIL;
  if (to && process.env.RESEND_API_KEY) {
    const body = [
      'New enquiry from the website',
      '',
      `Name    : ${name}`,
      `Phone   : ${phone}`,
      doc.email ? `Email   : ${doc.email}` : '',
      doc.concern ? `Concern : ${doc.concern}` : '',
      `Page    : ${doc.sourcePage ?? ''}`,
      '',
      'Message:',
      doc.message ?? '(none)',
    ].filter((l) => l !== null).join('\n');
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.LEAD_EMAIL_FROM || 'Reviva Website <onboarding@resend.dev>',
        to: to.split(',').map((s) => s.trim()),
        subject: `New enquiry: ${name} (${phone})`,
        text: body,
      }),
    }).catch((e) => console.error('Enquiry email failed', e));
  }

  return respond(true, 'Thank you! We will call you shortly.');
}
