/**
 * Zod schemas for StyleMate AI — all Claude outputs validated before DB write.
 */
import { z } from 'zod';

// ── Single product optimise request ─────────────────────────────────────────
export const OptimiseRequestSchema = z.object({
  productId: z.number().int().positive(),
  market:    z.enum(['US', 'UK', 'BOTH']).default('BOTH'),
});
export type OptimiseRequest = z.infer<typeof OptimiseRequestSchema>;

// ── Bulk optimise request ────────────────────────────────────────────────────
export const BulkOptimiseRequestSchema = z.object({
  productIds: z.array(z.number().int().positive()).min(1).max(50),
  market:     z.enum(['US', 'UK', 'BOTH']).default('BOTH'),
});
export type BulkOptimiseRequest = z.infer<typeof BulkOptimiseRequestSchema>;

// ── Claude output: Title rewriter (F1) ──────────────────────────────────────
export const TitleOutputSchema = z.object({
  title_us: z.string().min(10).max(70),
  title_uk: z.string().min(10).max(70),
});
export type TitleOutput = z.infer<typeof TitleOutputSchema>;

// ── Claude output: Description generator (F2) ───────────────────────────────
export const DescriptionOutputSchema = z.object({
  description_us:       z.string().min(100).max(3000),
  description_uk:       z.string().min(100).max(3000),
  short_description_us: z.string().min(20).max(200),
  short_description_uk: z.string().min(20).max(200),
});
export type DescriptionOutput = z.infer<typeof DescriptionOutputSchema>;

// ── Claude output: SEO metadata (F3) ────────────────────────────────────────
export const SeoOutputSchema = z.object({
  seo_title_us:  z.string().min(10).max(60),
  seo_title_uk:  z.string().min(10).max(60),
  seo_desc_us:   z.string().min(50).max(160),
  seo_desc_uk:   z.string().min(50).max(160),
  tags_us:       z.array(z.string()).min(3).max(10),
  tags_uk:       z.array(z.string()).min(3).max(10),
  faq_us:        z.array(z.object({ q: z.string(), a: z.string() })).length(5),
  faq_uk:        z.array(z.object({ q: z.string(), a: z.string() })).length(5),
});
export type SeoOutput = z.infer<typeof SeoOutputSchema>;

// ── Claude output: Quality score (F4) ───────────────────────────────────────
export const QualityOutputSchema = z.object({
  quality_score:            z.number().int().min(0).max(100),
  description_quality:      z.number().int().min(0).max(25),
  image_quality:            z.number().int().min(0).max(20),
  supplier_reliability:     z.number().int().min(0).max(20),
  review_sentiment:         z.number().int().min(0).max(20),
  market_demand:            z.number().int().min(0).max(15),
  qa_badge:                 z.enum(['none', 'verified', 'qa_approved', 'engineer_tested']),
  improvement_suggestions:  z.array(z.string()).max(5),
});
export type QualityOutput = z.infer<typeof QualityOutputSchema>;

// ── Admin accept/reject/edit payload ────────────────────────────────────────
export const PublishFieldSchema = z.object({
  analysisId: z.number().int().positive(),
  field:      z.enum(['title', 'description', 'seo', 'all']),
  market:     z.enum(['US', 'UK', 'BOTH']).default('BOTH'),
  overrides:  z.record(z.string()).optional(),
});
export type PublishField = z.infer<typeof PublishFieldSchema>;
