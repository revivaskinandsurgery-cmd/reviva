import type { SiteSettings } from './types';
import type { RichValue } from './rich';
import { openingHoursSpec } from './hours';

/* Structured data (JSON-LD) for Google, built from Site Settings and the
   page being shown. Only facts that are visible on the site go in here. */

type Json = Record<string, unknown>;

export const plainText = (blocks?: RichValue) =>
  (blocks ?? [])
    .map((b) => ((b as { children?: { text?: string }[] }).children ?? []).map((c) => c.text ?? '').join(''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

export const clinicId = (site: string, name: string) => `${site}/#${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/** The business: one MedicalClinic per location, plus the WebSite. */
export function siteGraph(s: SiteSettings, site: string, logo?: string): Json[] {
  const sameAs = Object.values(s.social).filter((u) => /^https?:\/\//.test(u));
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
    openingHoursSpecification: openingHoursSpec(l.hours || s.hours),
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

/** The main pages of the site (menu + both clinics), so Google knows what the key sections are. */
export function siteNavigation(s: SiteSettings, site: string): Json {
  const items = [
    ...s.nav.filter((n) => n.href && n.href !== '/').map((n) => ({ name: n.label, path: n.href as string })),
    ...s.locations.map((l) => ({ name: `${l.name} clinic`, path: `/${l.name.toLowerCase()}` })),
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Main pages',
    itemListElement: items.map((it, i) => ({
      '@type': 'SiteNavigationElement',
      position: i + 1,
      name: it.name,
      url: site + (it.path.startsWith('/') ? it.path : `/${it.path}`),
    })),
  };
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
