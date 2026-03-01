import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const session = await getSession(token);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to remove from wishlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Removed from wishlist',
    });
  } catch (error) {
    console.error('Wishlist delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove from wishlist',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
