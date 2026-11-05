import type { Location } from '@/lib/types';

/* Address, phone, opening hours and map of one clinic, shown on its own page
   (/noida, /ghaziabad). Everything comes from Site Settings, so the text
   always matches the structured data (lib/seo.ts). */

const wrap = { maxWidth: 1100, margin: '0 auto', padding: '56px 20px' } as const;
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, alignItems: 'start' } as const;

export function LocationDetails({ l, clinicName }: { l: Location; clinicName: string }) {
  const hours = (l.hours ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
  const map = l.latitude != null && l.longitude != null ? `https://www.google.com/maps?q=${l.latitude},${l.longitude}&z=16&output=embed` : null;
  return (
    <section className="rv-loc" aria-labelledby="clinic-visit" style={wrap}>
      <div style={grid}>
        <div>
          <h2 id="clinic-visit">Visit {clinicName} in {l.name}</h2>
          <address style={{ fontStyle: 'normal', lineHeight: 1.7, margin: '12px 0' }}>
            <strong>{clinicName}, {l.name}</strong>
            <br />
            {l.address}
          </address>
          <p>
            Phone: <a href={`tel:${l.phoneTel}`}>{l.phoneDisplay || l.phoneTel}</a>
          </p>
          {hours.length ? (
            <>
              <h3 style={{ marginTop: 20 }}>Opening hours</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', lineHeight: 1.7 }}>
                {hours.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          ) : null}
          {l.mapUrl ? (
            <p style={{ marginTop: 16 }}>
              <a href={l.mapUrl} target="_blank" rel="noopener">Get directions on Google Maps</a>
            </p>
          ) : null}
        </div>
        {map ? (
          <iframe
            title={`Map of ${clinicName}, ${l.name}`}
            src={map}
            width="600"
            height="400"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ border: 0, width: '100%', height: 360 }}
          ></iframe>
        ) : null}
      </div>
    </section>
  );
}
