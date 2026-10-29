import { defineArrayMember, defineField, defineType, type CustomValidator } from 'sanity';
import { ComposeIcon } from '@sanity/icons/Compose';

/* A blog post, shown at /blog/<address>. The breadcrumb, quick answer,
   "On this page" list, related articles, consultation box, previous / next
   links and the sidebar are added automatically (their texts are in Site
   Settings → Blog). A new post only needs the fields marked required. */

/** The newer article layout (same as the imported posts). Set automatically on new posts. */
const DESIGN = JSON.stringify({ outer: 'main-wrapper', titleClass: 'blog-title', image: 'wrapped' });
const BODY_CLASS = 'rv-offset page-blog12';

/** A check that is skipped for posts hidden from the blog (older posts). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unlessHidden = (check: (value: any) => true | string): CustomValidator<any> => (value, ctx) =>
  (ctx.document as { hideFromBlog?: boolean } | undefined)?.hideFromBlog ? true : check(value);

export const post = defineType({
  name: 'post',
  title: 'Blog post',
  type: 'document',
  icon: ComposeIcon,
  groups: [
    { name: 'content', title: 'Post', default: true },
    { name: 'seo', title: 'Google (SEO)' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The big heading of the article. Start with the main search phrase, e.g. "Acne Treatment in Noida: …".',
      validation: (r) => r.required().max(110).warning('Long titles are cut off on the blog page (best: under 80 characters).'),
    }),
    defineField({
      name: 'categories',
      title: 'Category',
      type: 'array',
      group: 'content',
      description: 'Choose the topic. Treatment pages show the articles of their topic as "Related articles".',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'postCategory' }] })],
      validation: (r) => r.unique().custom(unlessHidden((v) => (v && v.length ? true : 'Choose a category (add new ones under Blog → Categories).'))),
    }),
    defineField({
      name: 'relatedPages',
      title: 'Show on these treatment / service pages',
      type: 'array',
      group: 'content',
      description:
        'Optional. Pick the treatment pages (e.g. Acne Treatment, Laser Hair Removal) where this article should appear under "Related articles". It is also shown on the pages of its category.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'page' }], options: { filter: 'count(blocks[_type == "serviceHero"]) > 0' } })],
      validation: (r) => r.unique(),
    }),
    defineField({
      name: 'cover',
      title: 'Cover picture',
      type: 'picture',
      group: 'content',
      description: 'Shown on the blog page and at the top of the article. Best size 1200 × 675. Describe it in "Alt text".',
      validation: (r) =>
        r.custom(unlessHidden((v) => (v?.image?.asset ? (v.alt?.trim() ? true : 'Describe the picture in "Alt text" (needed for Google and screen readers).') : 'Add a cover picture.'))),
    }),
    defineField({
      name: 'excerpt',
      title: 'Summary (shown on the blog page)',
      type: 'text',
      rows: 3,
      group: 'content',
      description: '1–2 sentences, 80–250 characters. Also used as the Google description if you leave that empty.',
      validation: (r) => r.custom(unlessHidden((v) => (!v || v.trim().length < 80 ? 'Write a summary of at least 80 characters.' : v.length > 300 ? 'Keep the summary under 300 characters.' : true))),
    }),
    defineField({
      name: 'body',
      title: 'Article',
      type: 'richText',
      group: 'content',
      description:
        'Open with a 2–3 sentence direct answer (it is shown in the "Quick answer" box). Use Heading 2 for sections (they build the "On this page" list), Heading 3 for sub-sections. The "+" menu adds pictures, tables and FAQ questions.',
      validation: (r) => r.custom(unlessHidden((v) => (v && v.length >= 3 ? true : 'The article is empty or too short.'))),
    }),
    defineField({ name: 'tags', title: 'Tags (keywords)', type: 'array', group: 'content', description: 'Search phrases this article is about, e.g. "acne treatment in Noida". Used as keywords for Google.', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' } }),
    defineField({ name: 'author', title: 'Author', type: 'string', group: 'content', initialValue: 'Reviva' }),
    defineField({
      name: 'reviewedBy',
      title: 'Medically reviewed by (optional)',
      type: 'string',
      group: 'content',
      description: 'e.g. Dr. Aarushi Tyagi, MD. Shown under the title only when filled in - fill it only if that doctor really reviewed the article.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Date',
      type: 'date',
      group: 'content',
      options: { dateFormat: 'D MMM YYYY' },
      initialValue: () => new Date().toISOString().slice(0, 10),
      description: 'Posts are listed newest first. Use today or an earlier date (a future date shows the post early).',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'readMinutes', title: 'Reading time (minutes)', type: 'number', group: 'content', description: 'Leave empty - it is calculated from the article.', validation: (r) => r.min(1).max(60) }),

    defineField({
      name: 'slug',
      title: 'Page address',
      type: 'slug',
      group: 'seo',
      description: 'The post is at /blog/<this value>. Click Generate; keep it short and lowercase. Do not change it after publishing (the old link would break).',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'seoTitle', title: 'Page title (browser tab / Google)', type: 'string', group: 'seo', description: 'Leave empty to use the post title. Best under 60 characters, main phrase first.', validation: (r) => r.max(70).warning('Over about 60 characters Google cuts the title off.') }),
    defineField({
      name: 'metaDescription',
      title: 'Google description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'Leave empty to use the Summary. Best 120–160 characters.',
      validation: (r) => r.max(175).warning('Over about 160 characters Google cuts the description off.'),
    }),
    defineField({ name: 'shareImage', title: 'Share image (optional)', type: 'picture', group: 'seo', description: 'Shown when this page is shared. Leave empty to use the cover picture.' }),
    defineField({ name: 'noindex', title: 'Hide from Google', type: 'boolean', group: ['content', 'seo'], initialValue: false, description: 'Turn on to keep this article out of Google search results (it can still be opened with its link).' }),
    defineField({ name: 'hideFromBlog', title: 'Hide from the blog page', type: 'boolean', group: 'seo', initialValue: false, description: 'Removes the post from the blog list, sidebar, previous/next links and the sitemap. The address still opens.' }),

    // Page layout of the article: set automatically, not edited.
    defineField({ name: 'design', type: 'string', hidden: true, initialValue: DESIGN }),
    defineField({ name: 'bodyClass', type: 'string', hidden: true, initialValue: BODY_CLASS }),
  ],
  orderings: [{ title: 'Newest first', name: 'newest', by: [{ field: 'publishedAt', direction: 'desc' }] }],
  preview: {
    select: { title: 'title', date: 'publishedAt', media: 'cover.image', category: 'categories.0.title', hidden: 'hideFromBlog' },
    prepare: ({ title, date, media, category, hidden }) => ({ title, subtitle: [date, category, hidden ? 'hidden' : ''].filter(Boolean).join(' · '), media }),
  },
});
