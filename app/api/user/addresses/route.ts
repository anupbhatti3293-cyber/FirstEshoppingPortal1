import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

const TENANT_ID = 1;

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('tenant_id', TENANT_ID)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch addresses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Address fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch addresses',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
      .insert({
        tenant_id: TENANT_ID,
        user_id: session.user.id,
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
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to create address' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Address created successfully',
    });
  } catch (error) {
    console.error('Address create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create address',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
