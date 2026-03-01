import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export async function PUT(request: NextRequest): Promise<NextResponse> {
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

    const body = await request.json();
    const { firstName, lastName, phone } = body;

    const { data, error } = await supabase
      .from('users')
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
      })
      .eq('id', session.user.id)
      .select('id, email, first_name, last_name, phone')
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
