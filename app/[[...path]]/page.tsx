import { notFound, permanentRedirect } from 'next/navigation';
import { getDoc, getPostCards, getRedirect, getSettings, toUrlPath } from '@/lib/content';
import { Blocks, WhatsAppButton } from '@/components/blocks';
import { PostView, RelatedPosts } from '@/components/blog';

/* The body between the shared header and footer: a blog post, or a page's
   sections. id="main" is the skip-link target. */

export default async function SitePage({ params }: PageProps<'/[[...path]]'>) {
  const { path } = await params;
  const doc = await getDoc(toUrlPath(path));
  if (!doc) {
    const to = await getRedirect(toUrlPath(path));
    if (to) permanentRedirect(to);
    notFound();
  }
  const settings = await getSettings();

  if (doc.kind === 'post') {
    const cards = await getPostCards();
    const i = cards.findIndex((c) => c.path === doc.path);
    // The articles that share the most pages with this one come first, topped up with the newest.
    const pages = new Set(doc.relatedPageIds ?? []);
    // What an article is about: the words of its tags and title ("laser hair reduction" -> laser, hair, reduction), without very common ones.
    const COMMON = new Set(['noida', 'ghaziabad', 'treatment', 'treatments', 'skin', 'what', 'which', 'with', 'your', 'that', 'from', 'before', 'after', 'does', 'best', 'guide', 'should', 'when', 'about', 'options']);
    const words = (text: string[]) => new Set(text.flatMap((t) => t.toLowerCase().split(/[^a-z0-9]+/)).filter((w) => w.length > 3 && !COMMON.has(w)));
    const mine = words([doc.title, ...(doc.keywords ?? [])]);
    const shared = (c: (typeof cards)[number]) => (c.relatedPageIds ?? []).filter((x) => pages.has(x)).length + 2 * [...words([c.title, ...(c.tags ?? [])])].filter((w) => mine.has(w)).length;
    const others = cards.filter((c) => c.path !== doc.path);
    const related = [...others.filter((c) => shared(c) > 0).sort((x, y) => shared(y) - shared(x)), ...others].filter((c, n, all) => all.indexOf(c) === n).slice(0, 3);
    return (
      <div id="main" tabIndex={-1}>
        <div className="rv-scrim"></div>
        <PostView
          post={doc}
          s={settings}
          latest={cards.filter((c) => c.path !== doc.path).slice(0, 5)}
          prev={i >= 0 ? cards[i + 1] : undefined}
          next={i > 0 ? cards[i - 1] : undefined}
          related={related}
        />
      </div>
    );
  }

  const posts = await getPostCards();
  // Any page an editor chose in a post shows "Related articles", even without that section in its page.
  const hasRelated = doc.blocks?.some((b) => b._type === 'relatedPosts');
  const attached = !hasRelated && posts.some((p) => p.relatedPageIds?.includes(doc._id));
  return (
    <div id="main" tabIndex={-1}>
      <div className="rv-scrim"></div>
      <Blocks blocks={doc.blocks} data={{ posts, pageId: doc._id }} />
      {attached ? <RelatedPosts b={{ _type: 'relatedPosts', _key: 'auto', heading: 'Related articles' }} posts={posts} pageId={doc._id} /> : null}
      {doc.whatsapp !== false ? <WhatsAppButton href={settings.whatsappUrl} /> : null}
    </div>
  );
}
