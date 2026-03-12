import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/checkout/unsubscribe?token=[sessionToken]
// GDPR + CAN-SPAM: unsubscribe from abandoned cart emails
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse('<html><body><h2>Invalid unsubscribe link.</h2></body></html>', {
      headers: { 'Content-Type': 'text/html' },
      status: 400,
    });
  }

  await supabaseAdmin
    .from('checkout_sessions')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('session_token', token);

  return new NextResponse(
    `<html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2>✅ Unsubscribed</h2>
      <p>You've been removed from cart reminder emails.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://luxehaven.com'}">Return to LuxeHaven</a>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
