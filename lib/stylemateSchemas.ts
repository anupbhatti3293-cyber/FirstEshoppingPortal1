import { z } from 'zod';

// ── Request schemas ────────────────────────────────────────────────
export const OptimiseRequestSchema = z.object({
  productId: z.number().int().positive(),
});

export const BulkOptimiseSchema = z.object({
  productIds: z.array(z.number().int().positive()).min(1).max(50),
});

export const PublishFieldSchema = z.object({
  productId: z.number().int().positive(),
  fields: z.array(
    z.enum([
      'title', 'description', 'short_description',
      'seo_title', 'seo_description', 'tags', 'quality_score', 'qa_badge',
    ])
  ).min(1),
  locale: z.enum(['us', 'uk', 'both']).default('both'),
});

// ── AI output schemas ──────────────────────────────────────────────
// Relaxed limits — AI models vary slightly in output length.
// Validation purpose: ensure shape is correct, not enforce char counts.

export const TitleOutputSchema = z.object({
  us: z.string().min(1),
  uk: z.string().min(1),
});

export const DescriptionOutputSchema = z.object({
  us: z.object({
    full: z.string().min(1),
    short: z.string().min(1),
  }),
  uk: z.object({
    full: z.string().min(1),
    short: z.string().min(1),
  }),
});

export const SeoOutputSchema = z.object({
  us: z.object({
    metaTitle: z.string().min(1),
    metaDescription: z.string().min(1),
    tags: z.array(z.string()).min(1),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).min(1),
  }),
  uk: z.object({
    metaTitle: z.string().min(1),
    metaDescription: z.string().min(1),
    tags: z.array(z.string()).min(1),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).min(1),
  }),
});

export const QualityOutputSchema = z.object({
  score: z.number().min(0).max(100),
  breakdown: z.object({
    descriptionQuality: z.number().min(0).max(25),
    imageQuality: z.number().min(0).max(20),
    supplierReliability: z.number().min(0).max(20),
    reviewSentiment: z.number().min(0).max(20),
    marketDemand: z.number().min(0).max(15),
  }),
  badge: z.enum(['none', 'verified', 'qa_approved', 'engineer_tested']),
  notes: z.string().optional(),
});

export type OptimiseRequest = z.infer<typeof OptimiseRequestSchema>;
export type TitleOutput = z.infer<typeof TitleOutputSchema>;
export type DescriptionOutput = z.infer<typeof DescriptionOutputSchema>;
export type SeoOutput = z.infer<typeof SeoOutputSchema>;
export type QualityOutput = z.infer<typeof QualityOutputSchema>;
export type PublishField = z.infer<typeof PublishFieldSchema>;
