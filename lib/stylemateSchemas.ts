import { z } from 'zod';

// ── Request schemas ──────────────────────────────────────────────

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

// ── Claude output schemas (what AI returns) ───────────────────────

export const TitleOutputSchema = z.object({
  us: z.string().max(70),
  uk: z.string().max(70),
});

export const DescriptionOutputSchema = z.object({
  us: z.object({
    full: z.string().min(100).max(2500),
    short: z.string().max(200),
  }),
  uk: z.object({
    full: z.string().min(100).max(2500),
    short: z.string().max(200),
  }),
});

export const SeoOutputSchema = z.object({
  us: z.object({
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(160),
    tags: z.array(z.string()).min(5).max(10),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).length(5),
  }),
  uk: z.object({
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(160),
    tags: z.array(z.string()).min(5).max(10),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).length(5),
  }),
});

export const QualityOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  breakdown: z.object({
    descriptionQuality: z.number().int().min(0).max(25),
    imageQuality: z.number().int().min(0).max(20),
    supplierReliability: z.number().int().min(0).max(20),
    reviewSentiment: z.number().int().min(0).max(20),
    marketDemand: z.number().int().min(0).max(15),
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
