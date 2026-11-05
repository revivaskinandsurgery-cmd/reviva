import { getPageList, getPostCards, getSettings } from '@/lib/content';
import { DOCTOR_NAME } from '@/lib/seo';

/* /llms.txt: a plain-text summary of the site for AI assistants and search
   tools. Built from Sanity on every request, so it always lists the current
   addresses and never a page that is hidden from Google. */
export const dynamic = 'force-dynamic';

const GUIDES = 15;
const shortName = (t: string) => t.split(' | ')[0].split(' – ')[0];
// Pages that are not treatments: shown elsewhere in the file or not useful to an assistant.
const NOT_TREATMENT = /^\/(about|contact|blogs|noida|ghaziabad|treatment|reviews|gallery|sitemap)?$|gallery$/;

export async function GET() {
  const [s, pages, posts] = await Promise.all([getSettings(), getPageList(), getPostCards()]);
  const site = s.siteUrl.replace(/[/]+$/, '');
  const link = (title: string, path: string) => `- [${title}](${site}${path})`;
  const treatments = pages.filter((p) => !NOT_TREATMENT.test(p.path));

  const lines = [
    `# ${s.clinicName}`,
    '',
    `> Dermatologist-led skin, hair, laser and aesthetic clinic with ${s.locations.length} locations in Delhi NCR: ${s.locations.map((l) => l.name).join(' and ')}. Led by ${DOCTOR_NAME}.`,
    '',
    `Website: ${site}/`,
    '',
    '## Clinics',
    ...s.locations.flatMap((l) => [`- ${s.clinicName}, ${l.name}: ${l.address}. Phone ${l.phoneDisplay || l.phoneTel}.${l.hours ? ' Hours: ' + l.hours.split('\n').map((h) => h.trim()).filter(Boolean).join('; ') + '.' : ''} ${site}/${l.name.toLowerCase()}`]),
    ...(s.email ? [`- Email: ${s.email}`] : []),
    '',
    '## Doctor',
    `- ${DOCTOR_NAME}: ${site}/about`,
    '',
    '## Main pages',
    link('Home', '/'),
    link('About', '/about'),
    link('All treatments', '/treatment'),
    link('Contact and booking', '/contact'),
    link('Patient reviews', '/reviews'),
    link('Before and after results', '/gallery'),
    '',
    '## Treatments',
    ...treatments.map((p) => link(shortName(p.title), p.path)),
    '',
    '## Guides',
    ...posts.slice(0, GUIDES).map((p) => link(p.title, p.path)),
    link('All guides', '/blogs'),
    '',
    `Sitemap: ${site}/sitemap.xml`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
