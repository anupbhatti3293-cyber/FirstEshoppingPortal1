import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const piId = searchParams.get('piId');
  if (!piId) return NextResponse.json({ success: false, error: 'piId required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, order_token, status')
    .eq('stripe_payment_intent_id', piId)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ success: false, data: null });
  return NextResponse.json({ success: true, data });
}
