import type { Metadata } from 'next';
import Script from 'next/script';
import { notFound, permanentRedirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SiteScript } from '@/components/SiteScript';
import { getDoc, getRedirect, getSettings, toUrlPath } from '@/lib/content';
import { absoluteImage } from '@/lib/image';
import { blogPosting, breadcrumbs, faqPage, plainText, service, siteGraph } from '@/lib/seo';
import type { FaqList } from '@/lib/rich';
import type { FaqBlock } from '@/components/blocks/treatment';

/* Root layout for every public page: the site-wide <head> (fonts,
   stylesheets, Google Analytics / Tag Manager from Site Settings) and the
   header and footer. Per-page tags (title, description, canonical, social
   sharing, robots) come from generateMetadata. */

// Rendered on every request from live Sanity content (no cache).
export const dynamic = 'force-dynamic';

/* The site script, versioned per deploy so browsers fetch a fixed copy
   at once (/assets/*.js is cached for a year). */
const SCRIPT_VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'dev';

const STYLESHEETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/remixicon@4.3.0/fonts/remixicon.css',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap',
  `/assets/css/style.css?v=${SCRIPT_VERSION}`,
  `/assets/css/responsive.css?v=${SCRIPT_VERSION}`,
  `/assets/css/articles.css?v=${SCRIPT_VERSION}`,
  `/assets/css/gallery.css?v=${SCRIPT_VERSION}`,
];

/** "Acne Treatment in Noida | Reviva" -> "Acne Treatment in Noida". */
const shortName = (t: string) => t.split(' | ')[0].split(' – ')[0];

export async function generateMetadata({ params }: LayoutProps<'/[[...path]]'>): Promise<Metadata> {
  const { path } = await params;
  const urlPath = toUrlPath(path);
  const [doc, s] = await Promise.all([getDoc(urlPath), getSettings()]);
  if (!doc) return {};
  const site = s.siteUrl.replace(/[/]+$/, '');
  const url = site + (urlPath === '/' ? '/' : urlPath);
  const post = doc.kind === 'post' ? doc : null;
  // A post is shared with its own cover picture unless it has a share image.
  const image = absoluteImage(doc.shareImage, site) ?? absoluteImage(post?.cover, site) ?? absoluteImage(s.shareImage, site);
  const imageAlt = post?.cover?.alt || doc.title || s.clinicName;
  return {
    metadataBase: new URL(site),
    title: doc.headTitle,
    description: doc.metaDescription || undefined,
    keywords: doc.keywords?.length ? doc.keywords : undefined,
    authors: [{ name: s.clinicName, url: site }],
    publisher: s.clinicName,
    alternates: { canonical: url },
    robots: {
      index: !doc.noindex,
      follow: true,
      googleBot: { index: !doc.noindex, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
    },
    verification: s.googleVerification ? { google: s.googleVerification } : undefined,
    // Square PNG + ICO icons (Google needs a multiple of 48px; a WebP-only favicon shows a grey globe).
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '32x32 48x48' },
        { url: '/favicon-48x48.png', type: 'image/png', sizes: '48x48' },
        { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
        { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
      ],
      shortcut: '/favicon.ico',
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
    openGraph: {
      type: post ? 'article' : 'website',
      locale: 'en_IN',
      siteName: s.clinicName,
      title: doc.headTitle,
      description: doc.metaDescription || undefined,
      url,
      images: image ? [{ url: image, alt: imageAlt }] : undefined,
      ...(post
        ? { publishedTime: post.publishedAt, modifiedTime: post._updatedAt, authors: [s.clinicName], tags: post.keywords }
        : {}),
    },
    twitter: { card: 'summary_large_image', title: doc.headTitle, description: doc.metaDescription || undefined, images: image ? [image] : undefined },
  };
}

export default async function SiteLayout({ children, params }: LayoutProps<'/[[...path]]'>) {
  const { path } = await params;
  const urlPath = toUrlPath(path);
  const [page, s] = await Promise.all([getDoc(urlPath), getSettings()]);
  if (!page) {
    const to = await getRedirect(urlPath);
    if (to) permanentRedirect(to);
    notFound();
  }
  const site = s.siteUrl.replace(/[/]+$/, '');
  const url = site + (urlPath === '/' ? '/' : urlPath);
  // Tag Manager containers: the main one, then any extra ones (each listed once).
  const gtmIds = [...new Set([s.gtmId, ...(s.extraGtmIds ?? [])].map((id) => id?.trim()).filter((id): id is string => /^GTM-[A-Z0-9]+$/.test(id ?? '')))];

  // Structured data for Google: the clinics + website on every page, then what this page is.
  const jsonLd: (object | null)[] = [...siteGraph(s, site, absoluteImage({ src: s.logo }, site))];
  if (page.kind === 'post') {
    const body = page.body ?? [];
    const faqs = [...(page.faqs ?? []), ...body.filter((b): b is FaqList => b._type === 'postFaqList').flatMap((f) => f.items ?? [])];
    const words = plainText(body).split(' ').length;
    jsonLd.push(
      breadcrumbs(site, [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blogs' }, { name: page.title, path: urlPath }]),
      blogPosting(s, site, {
        url,
        title: page.title,
        description: page.metaDescription || page.excerpt,
        image: absoluteImage(page.shareImage, site) ?? absoluteImage(page.cover, site),
        published: page.publishedAt,
        modified: page._updatedAt,
        keywords: page.keywords,
        words,
      }),
      faqPage(faqs),
    );
  } else if (urlPath !== '/') {
    const blocks = page.blocks ?? [];
    const faqs = blocks.filter((b) => b._type === 'faq').flatMap((b) => ((b as unknown as FaqBlock).items ?? []).map((i) => ({ question: i.question, answer: plainText(i.answer) })));
    jsonLd.push(breadcrumbs(site, [{ name: 'Home', path: '/' }, { name: shortName(page.title), path: urlPath }]), faqPage(faqs));
    if (blocks.some((b) => b._type === 'serviceHero')) jsonLd.push(service(s, site, { url, name: shortName(page.title), description: page.metaDescription }));
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {STYLESHEETS.map((href) => (
          <link rel="stylesheet" href={href} key={href} />
        ))}
        {jsonLd.filter(Boolean).map((data, i) => (
          <script type="application/ld+json" key={i} dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, String.raw`<`) }} />
        ))}
      </head>
      <body className={page.bodyClass || undefined} suppressHydrationWarning>
        {gtmIds.map((id) => (
          <noscript key={id}>
            <iframe src={`https://www.googletagmanager.com/ns.html?id=${id}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
          </noscript>
        ))}
        <Header s={s} path={urlPath} />
        {children}
        <Footer s={s} />
        <SiteScript src={`/assets/js/custom.js?v=${SCRIPT_VERSION}`} />
        {s.gaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${s.gaId}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${s.gaId}');`}
            </Script>
          </>
        ) : null}
        {gtmIds.map((id) => (
          <Script id={`gtm-${id}`} key={id} strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`}
          </Script>
        ))}
      </body>
    </html>
  );
}
