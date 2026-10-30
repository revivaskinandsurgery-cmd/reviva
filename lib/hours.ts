/* Clinic opening hours, written one rule per line in Site Settings:

     Tue–Sun: 11:00 AM – 08:00 PM
     Monday: Closed

   Ranges may wrap past Sunday ("Fri–Wed"), "Closed" days are skipped, and a
   day may have two slots ("Mon–Sat: 11 AM – 1 PM, 5 PM – 7:30 PM"). The text
   is shown as written; this turns it into Google's openingHoursSpecification. */

type Json = Record<string, unknown>;

const DAYS: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** "11:00 AM" / "8 pm" -> "11:00" / "20:00". */
function to24(t: string): string | null {
  const x = t.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!x) return null;
  const h = (Number(x[1]) % 12) + (x[3].toUpperCase() === 'PM' ? 12 : 0);
  return `${String(h).padStart(2, '0')}:${x[2] ?? '00'}`;
}

export function openingHoursSpec(text?: string): Json[] | undefined {
  const spec: Json[] = [];
  for (const line of (text ?? '').split(/\n|;/)) {
    const m = line.match(/^\s*([A-Za-z]{3})[A-Za-z]*(?:\s*[–-]\s*([A-Za-z]{3})[A-Za-z]*)?\s*:\s*(.+)$/);
    if (!m || /closed/i.test(m[3])) continue;
    const from = ORDER.indexOf(m[1].toLowerCase());
    const to = m[2] ? ORDER.indexOf(m[2].toLowerCase()) : from;
    if (from < 0 || to < 0) continue;
    // Friday to Wednesday wraps over the end of the week.
    const length = ((to - from + 7) % 7) + 1;
    const dayOfWeek = Array.from({ length }, (_, i) => DAYS[ORDER[(from + i) % 7]]);
    for (const slot of m[3].matchAll(/(\d{1,2}(?::\d{2})?\s*[AP]M)\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*[AP]M)/gi)) {
      const [opens, closes] = [to24(slot[1]), to24(slot[2])];
      if (opens && closes) spec.push({ '@type': 'OpeningHoursSpecification', dayOfWeek, opens, closes });
    }
  }
  return spec.length ? spec : undefined;
}
