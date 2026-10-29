import { defineField, defineType } from 'sanity';
import { TagIcon } from '@sanity/icons/Tag';

/* A blog topic (Acne, Laser Hair Reduction...). Posts point to it, so one
   rename here updates every post. */
export const postCategory = defineType({
  name: 'postCategory',
  title: 'Blog category',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({ name: 'title', title: 'Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Address', type: 'slug', options: { source: 'title', maxLength: 64 }, validation: (r) => r.required() }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
  ],
  orderings: [{ title: 'A–Z', name: 'az', by: [{ field: 'title', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'description' } },
});
