import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/checkout/recover/[token]
// Restores an abandoned cart from recovery email link
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  const { data: session, error } = await supabaseAdmin
    .from('checkout_sessions')
    .select('id, email, cart_snapshot, step_reached, recovered_at, currency')
    .eq('session_token', token)
    .maybeSingle();

  if (error || !session) {
    return NextResponse.json({ error: 'Recovery link not found or expired' }, { status: 404 });
  }

  if (session.recovered_at) {
    return NextResponse.json(
      { error: 'This order has already been completed', alreadyRecovered: true },
      { status: 410 }
    );
  }

  // Mark session as step 2 (they already gave contact info in step 1)
  await supabaseAdmin
    .from('checkout_sessions')
    .update({ step_reached: Math.max(session.step_reached, 2) })
    .eq('session_token', token);

  return NextResponse.json({
    success: true,
    session: {
      email: session.email,
      cartSnapshot: session.cart_snapshot,
      stepReached: Math.max(session.step_reached, 2),
      currency: session.currency,
      sessionToken: token,
    },
  });
}
