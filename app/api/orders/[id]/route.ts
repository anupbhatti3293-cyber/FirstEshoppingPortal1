import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      items:order_items(*),
      status_history:order_status_history(*)
    `)
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  return NextResponse.json({ success: true, data });
}
