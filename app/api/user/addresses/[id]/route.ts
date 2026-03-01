import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export async function PUT(
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

    const body = await request.json();
    const {
      type,
      isDefault,
      firstName,
      lastName,
      company,
      addressLine1,
      addressLine2,
      city,
      stateProvince,
      postalCode,
      country,
      phone,
    } = body;

    if (isDefault) {
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', session.user.id)
        .eq('type', type);
    }

    const { data, error } = await supabase
      .from('user_addresses')
      .update({
        type,
        is_default: isDefault || false,
        first_name: firstName,
        last_name: lastName,
        company: company || null,
        address_line1: addressLine1,
        address_line2: addressLine2 || null,
        city,
        state_province: stateProvince || null,
        postal_code: postalCode,
        country,
        phone: phone || null,
      })
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to update address' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Address updated successfully',
    });
  } catch (error) {
    console.error('Address update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update address',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

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
      .from('user_addresses')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete address' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    console.error('Address delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete address',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
