import { createElement, Fragment, type ReactNode } from 'react';
import { pictureSrc, type Picture } from './image';

/* Sanity rich text (Portable Text) -> React, written for this site's markup:
   paragraph styles map to the original tags/classes, links and "styled"
   annotations keep the attributes they had on the old site, and "\n" inside
   a text span is a <br>. The reverse direction (HTML -> rich text) lives in
   scripts/lib/html-to-rich.mjs. */

export type Span = { _type: 'span'; _key: string; text: string; marks?: string[] };
export type MarkDef = { _key: string; _type: 'link'; href?: string; newTab?: boolean };
export type Block = {
  _type: 'block';
  _key: string;
  style?: string;
  listItem?: 'bullet' | 'number';
  level?: number;
  markDefs?: MarkDef[];
  children?: (Span | { _type: string; _key: string; html?: string })[];
};
export type Figure = Picture & { _type: 'figure'; _key: string; className?: string; caption?: string };
export type RichTable = { _type: 'richTable'; _key: string; hasHeader?: boolean; rows?: { _key: string; cells?: string[] }[] };
export type FaqList = { _type: 'postFaqList'; _key: string; items?: { _key: string; question?: string; answer?: string }[] };
export type RichValue = (Block | Figure | { _type: string; _key: string })[];

// "highlight" = the gold word style (a plain <span>, coloured by the site's
// CSS); "nameHighlight" = the doctor's name style on the clinic pages.
const DECORATOR: Record<string, [string, string?]> = {
  strong: ['strong'],
  em: ['em'],
  underline: ['u'],
  highlight: ['span'],
  nameHighlight: ['span', 'highlight-name'],
};

/** Block styles -> element + class (the old site's paragraph variants). */
export const STYLE_TAG: Record<string, { tag: string; className?: string }> = {
  normal: { tag: 'p' },
  h2: { tag: 'h2' },
  h3: { tag: 'h3' },
  h4: { tag: 'h4' },
  h5: { tag: 'h5' },
  center: { tag: 'p', className: 'center-text' },
  highlight: { tag: 'p', className: 'highlight' },
  centerLine: { tag: 'p', className: 'center-line' },
};

const textWithBreaks = (text: string, key: string): ReactNode =>
  text.includes('\n') ? text.split('\n').flatMap((part, i) => (i ? [<br key={`${key}b${i}`} />, part] : [part])) : text;

/** How a decorator is drawn, when a component wants its own look (e.g. the
    landing page renders the Gold style as a purple <em>). */
export type MarkRenderers = Partial<Record<string, (children: ReactNode, key: string) => ReactNode>>;

/** The inline content of one block (spans + marks) as React nodes. */
export function Inline({ block, marks }: { block: Pick<Block, 'children' | 'markDefs'>; marks?: MarkRenderers }) {
  const defs = new Map((block.markDefs ?? []).map((d) => [d._key, d]));
  const wrap = (mark: string, children: ReactNode, key: string): ReactNode => {
    const custom = marks?.[mark];
    if (custom) return custom(children, key);
    if (DECORATOR[mark]) return createElement(DECORATOR[mark][0], { key, className: DECORATOR[mark][1] }, children);
    const d = defs.get(mark);
    if (!d) return children;
    return createElement('a', { key, href: d.href ?? '', ...(d.newTab ? { target: '_blank', rel: 'noopener' } : {}) }, children);
  };

  // Group neighbouring spans that share a mark so <a>One <strong>two</strong></a> stays one link.
  const render = (kids: Span[], depth: number, keyBase: string): ReactNode[] => {
    const out: ReactNode[] = [];
    let i = 0;
    while (i < kids.length) {
      const mark = kids[i].marks?.[depth];
      if (!mark) {
        out.push(<Fragment key={`${keyBase}${i}`}>{textWithBreaks(kids[i].text, `${keyBase}${i}`)}</Fragment>);
        i++;
        continue;
      }
      let j = i;
      while (j < kids.length && kids[j].marks?.[depth] === mark) j++;
      out.push(wrap(mark, render(kids.slice(i, j), depth + 1, `${keyBase}${i}-`), `${keyBase}${i}m`));
      i = j;
    }
    return out;
  };

  const spans = (block.children ?? []).filter((c): c is Span => c._type === 'span');
  return <>{render(spans, 0, 'k')}</>;
}

const blockText = (b: Block) => (b.children ?? []).map((c) => (c as Span).text ?? '').join('').trim();

/** Address of every h2 / h3 ("Who this guide is for" -> "who-this-guide-is-for"), by block key. */
export function headingIds(value?: RichValue): Map<string, string> {
  const used = new Set<string>();
  const ids = new Map<string, string>();
  for (const b of value ?? []) {
    const block = b as Block;
    if (block._type !== 'block' || (block.style !== 'h2' && block.style !== 'h3')) continue;
    const base = blockText(block).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section';
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    ids.set(block._key, id);
  }
  return ids;
}

/** The article's h2 headings, for an "On this page" list. */
export function outline(value?: RichValue): { id: string; text: string }[] {
  const ids = headingIds(value);
  return (value ?? []).flatMap((b) => ((b as Block).style === 'h2' && ids.has(b._key) ? [{ id: ids.get(b._key)!, text: blockText(b as Block) }] : []));
}

/** A whole rich-text body: paragraphs, headings, lists, figures. */
export function Rich({ value }: { value?: RichValue }) {
  const blocks = value ?? [];
  const ids = headingIds(blocks);
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b._type === 'figure') {
      const f = b as Figure;
      const img = <img key={f._key} src={pictureSrc(f)} alt={f.alt ?? ''} className={f.className} />;
      out.push(f.caption ? <figure key={f._key}>{img}<figcaption>{f.caption}</figcaption></figure> : img);
      continue;
    }
    if (b._type === 'richTable') {
      const t = b as RichTable;
      const [head, ...rest] = t.rows ?? [];
      const row = (r: { _key: string; cells?: string[] }, cell: 'th' | 'td') => <tr key={r._key}>{(r.cells ?? []).map((c, j) => createElement(cell, { key: j }, c))}</tr>;
      out.push(
        <div className="table-scroll" key={t._key} style={{ overflowX: 'auto' }}>
          <table>
            {t.hasHeader !== false && head ? <thead>{row(head, 'th')}</thead> : null}
            <tbody>{(t.hasHeader !== false ? rest : t.rows ?? []).map((r) => row(r, 'td'))}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (b._type === 'postFaqList') {
      out.push(
        <div className="post-faq" key={b._key}>
          {((b as FaqList).items ?? []).map((it) => (
            <details key={it._key}>
              <summary>{it.question}</summary>
              <p>{it.answer}</p>
            </details>
          ))}
        </div>,
      );
      continue;
    }
    if (b._type !== 'block') continue;
    const block = b as Block;
    if (block.listItem) {
      const type = block.listItem;
      const items: Block[] = [];
      while (i < blocks.length && (blocks[i] as Block).listItem === type) items.push(blocks[i++] as Block);
      i--;
      out.push(
        createElement(
          type === 'number' ? 'ol' : 'ul',
          { key: block._key },
          items.map((it) => (
            <li key={it._key}>
              <Inline block={it} />
            </li>
          )),
        ),
      );
      continue;
    }
    if (block.style === 'spacer') {
      out.push(<br key={block._key} />);
      continue;
    }
    if (block.style === 'plain') {
      out.push(
        <Fragment key={block._key}>
          <Inline block={block} />
        </Fragment>,
      );
      continue;
    }
    const { tag, className } = STYLE_TAG[block.style ?? 'normal'] ?? STYLE_TAG.normal;
    out.push(createElement(tag, { key: block._key, className, id: ids.get(block._key) }, <Inline block={block} />));
  }
  return <>{out}</>;
}

/** A plain text field where line breaks are <br>s. */
export function Lines({ text }: { text?: string }) {
  return <>{textWithBreaks(text ?? '', 'l')}</>;
}
