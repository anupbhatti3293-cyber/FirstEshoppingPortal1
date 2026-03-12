/**
 * Abandoned Cart Recovery Job
 *
 * This module contains the logic for detecting and emailing abandoned carts.
 * It is designed to be called by:
 *   1. A Supabase Edge Function with pg_cron schedule (production)
 *   2. The /api/cron/abandoned-carts route (development / Vercel cron)
 *
 * IMPORTANT: Do NOT use setInterval in Next.js — serverless functions die
 * between cold starts and the interval will silently stop firing.
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  sendAbandonedCartEmail1,
  sendAbandonedCartEmail2,
} from '@/lib/resend';
import type { CartLineItem } from '@/types';

const DELAY_MINUTES = parseInt(process.env.ABANDONED_CART_DELAY_MINUTES || '60');

export async function runAbandonedCartJob(tenantId = 1) {
  const now = new Date();
  const email1Threshold = new Date(now.getTime() - DELAY_MINUTES * 60 * 1000).toISOString();
  const email2Threshold = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // ── Email 1: Send to sessions abandoned > DELAY_MINUTES ago ────────────────
  const { data: email1Sessions } = await supabaseAdmin
    .from('checkout_sessions')
    .select('id, email, cart_snapshot, session_token, currency')
    .eq('tenant_id', tenantId)
    .lt('step_reached', 3)
    .lt('created_at', email1Threshold)
    .is('recovered_at', null)
    .is('abandoned_email_1_sent_at', null)
    .is('unsubscribed_at', null)
    .limit(50);

  for (const session of email1Sessions ?? []) {
    try {
      const cartItems = (session.cart_snapshot ?? []) as CartLineItem[];
      if (cartItems.length === 0) continue;

      await sendAbandonedCartEmail1(
        session.email,
        cartItems,
        session.session_token,
        (session.currency as 'USD' | 'GBP') ?? 'USD'
      );

      await supabaseAdmin
        .from('checkout_sessions')
        .update({ abandoned_email_1_sent_at: now.toISOString() })
        .eq('id', session.id);

      console.log(`[AbandonedCart] Email 1 sent to ${session.email}`);
    } catch (err) {
      console.error(`[AbandonedCart] Failed Email 1 for ${session.email}:`, err);
    }
  }

  // ── Email 2: Send to sessions that got Email 1 > 24hr ago ──────────────────
  const { data: email2Sessions } = await supabaseAdmin
    .from('checkout_sessions')
    .select('id, email, cart_snapshot, session_token, currency, tenant_id')
    .eq('tenant_id', tenantId)
    .lt('step_reached', 3)
    .lt('abandoned_email_1_sent_at', email2Threshold)
    .is('recovered_at', null)
    .is('abandoned_email_2_sent_at', null)
    .is('unsubscribed_at', null)
    .not('abandoned_email_1_sent_at', 'is', null)
    .limit(50);

  for (const session of email2Sessions ?? []) {
    try {
      const cartItems = (session.cart_snapshot ?? []) as CartLineItem[];
      if (cartItems.length === 0) continue;

      // Auto-generate a 10% recovery discount code for this session
      const code = `RECOVER-${session.session_token.substring(0, 8).toUpperCase()}`;
      const existingCode = await supabaseAdmin
        .from('discount_codes')
        .select('id')
        .eq('code', code)
        .eq('tenant_id', session.tenant_id)
        .maybeSingle();

      if (!existingCode.data) {
        await supabaseAdmin.from('discount_codes').insert({
          tenant_id: session.tenant_id,
          code,
          discount_type: 'PERCENTAGE',
          value: 10,
          max_uses: 1,
          per_customer_limit: 1,
          is_active: true,
          expires_at: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(), // 48hr expiry
        });
      }

      await sendAbandonedCartEmail2(
        session.email,
        cartItems,
        session.session_token,
        code,
        (session.currency as 'USD' | 'GBP') ?? 'USD'
      );

      await supabaseAdmin
        .from('checkout_sessions')
        .update({ abandoned_email_2_sent_at: now.toISOString() })
        .eq('id', session.id);

      console.log(`[AbandonedCart] Email 2 sent to ${session.email} with code ${code}`);
    } catch (err) {
      console.error(`[AbandonedCart] Failed Email 2 for ${session.email}:`, err);
    }
  }

  return {
    email1Sent: email1Sessions?.length ?? 0,
    email2Sent: email2Sessions?.length ?? 0,
  };
}
