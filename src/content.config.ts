import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const evidence = z.enum(['measured', 'self-reported', 'not yet measured']);

const work = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/work' }),
  schema: () =>
    z.object({
      title: z.string(),
      order: z.number(),
      kind: z.string(),
      tagline: z.string(),
      /** The same idea for a non-technical reader (home page "explain it like a friend"). */
      plain: z.string(),
      status: z.object({ label: z.string(), tone: z.enum(['live', 'preview', 'research']) }),
      role: z.string(),
      dates: z.string(),
      stack: z.array(z.string()),
      links: z.array(z.object({ label: z.string(), href: z.string().optional() })),
      highlights: z.array(z.object({ text: z.string(), evidence })),
      results: z.array(z.object({ value: z.string(), label: z.string(), evidence })),
      limits: z.array(z.string()),
      try: z.string(),
      next: z.string(),
    }),
});

export const collections = { work };
