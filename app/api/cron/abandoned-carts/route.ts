import { NextRequest, NextResponse } from 'next/server';
import { runAbandonedCartJob } from '@/lib/abandonedCartJob';

/**
 * GET /api/cron/abandoned-carts
 *
 * Called by Vercel Cron (vercel.json) or Supabase pg_cron Edge Function.
 * Protected by CRON_SECRET to prevent public abuse.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runAbandonedCartJob(1);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[AbandonedCartCron] Error:', err);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
