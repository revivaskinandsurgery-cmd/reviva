import type { SiteSettings } from './types';
import type { RichValue } from './rich';

/* Structured data (JSON-LD) for Google, built from Site Settings and the
   page being shown. Only facts that are visible on the site go in here. */

type Json = Record<string, unknown>;

export const plainText = (blocks?: RichValue) =>
  (blocks ?? [])
    .map((b) => ((b as { children?: { text?: string }[] }).children ?? []).map((c) => c.text ?? '').join(''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const DAYS: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** "Mon–Sat: 11:00 AM – 1:00 PM, 5:00 PM – 7:30 PM" -> openingHoursSpecification. */
function openingHours(hours: string): Json[] | undefined {
  const m = hours.match(/^\s*([A-Za-z]{3})\w*\s*[–-]\s*([A-Za-z]{3})\w*\s*:\s*(.+)$/);
  if (!m) return undefined;
  const from = ORDER.indexOf(m[1].toLowerCase());
  const to = ORDER.indexOf(m[2].toLowerCase());
  if (from < 0 || to < from) return undefined;
  const to24 = (t: string) => {
    const x = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!x) return null;
    const h = (Number(x[1]) % 12) + (x[3].toUpperCase() === 'PM' ? 12 : 0);
    return `${String(h).padStart(2, '0')}:${x[2]}`;
  };
  const slots = [...m[3].matchAll(/(\d{1,2}:\d{2}\s*[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s*[AP]M)/gi)];
  const days = ORDER.slice(from, to + 1).map((d) => DAYS[d]);
  const spec = slots.flatMap((s) => {
    const [opens, closes] = [to24(s[1]), to24(s[2])];
    return opens && closes ? [{ '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens, closes }] : [];
  });
  return spec.length ? spec : undefined;
}


export const clinicId = (site: string, name: string) => `${site}/#${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/** The business: one MedicalClinic per location, plus the WebSite. */
export function siteGraph(s: SiteSettings, site: string, logo?: string): Json[] {
  const sameAs = Object.values(s.social).filter((u) => /^https?:\/\//.test(u));
  const hours = openingHours(s.hours);
  const clinics = s.locations.map((l) => ({
    '@context': 'https://schema.org',
    '@type': ['MedicalClinic', 'Dermatology'],
    '@id': clinicId(site, l.name),
    name: `${s.clinicName} – ${l.name}`,
    alternateName: s.clinicName,
    url: site + '/',
    logo,
    image: logo,
    telephone: l.phoneTel,
    email: s.email || undefined,
    medicalSpecialty: 'Dermatology',
    address: {
      '@type': 'PostalAddress',
      streetAddress: l.address.replace(/,[ ]*(Noida|Ghaziabad).*$/i, ''),
      addressLocality: l.name,
      addressRegion: 'Uttar Pradesh',
      postalCode: l.address.match(/\b\d{6}\b/)?.[0],
      addressCountry: 'IN',
    },
    areaServed: [l.name, 'Delhi NCR'],
    openingHoursSpecification: hours,
    geo: l.latitude != null && l.longitude != null ? { '@type': 'GeoCoordinates', latitude: l.latitude, longitude: l.longitude } : undefined,
    hasMap: l.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.clinicName} ${l.address}`)}`,
    sameAs: sameAs.length ? sameAs : undefined,
  }));
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site}/#website`,
    url: site + '/',
    name: s.clinicName,
    inLanguage: 'en-IN',
    publisher: s.locations[0] ? { '@id': clinicId(site, s.locations[0].name) } : undefined,
  };
  return [...clinics, website];
}

export function breadcrumbs(site: string, trail: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: site + (t.path === '/' ? '/' : t.path) })),
  };
}

export function faqPage(items: { question?: string; answer?: string }[]): Json | null {
  const qa = items.filter((i) => i.question && i.answer);
  if (!qa.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map((q) => ({ '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.answer } })),
  };
}

export function blogPosting(s: SiteSettings, site: string, p: { url: string; title: string; description?: string; image?: string; published?: string; modified?: string; keywords?: string[]; section?: string; words?: number }): Json {
  const publisher = s.locations[0] ? { '@id': clinicId(site, s.locations[0].name) } : { '@type': 'Organization', name: s.clinicName };
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: { '@type': 'WebPage', '@id': p.url },
    headline: p.title.slice(0, 110),
    description: p.description,
    image: p.image ? [p.image] : undefined,
    datePublished: p.published,
    dateModified: p.modified ?? p.published,
    author: { '@type': 'Organization', name: s.clinicName, url: site + '/' },
    publisher,
    keywords: p.keywords?.length ? p.keywords.join(', ') : undefined,
    articleSection: p.section,
    wordCount: p.words,
    inLanguage: 'en-IN',
  };
}

/** A treatment page as a service of the clinic. */
export function service(s: SiteSettings, site: string, p: { url: string; name: string; description?: string }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: p.name,
    description: p.description,
    url: p.url,
    serviceType: p.name,
    provider: s.locations.map((l) => ({ '@id': clinicId(site, l.name) })),
    areaServed: [...s.locations.map((l) => l.name), 'Delhi NCR'],
  };
}
