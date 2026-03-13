import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Missing Supabase environment variables. Using placeholders for build.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getSettings(tenantId: number = 1): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error fetching settings:', error);
    return {};
  }

  const settingsMap: Record<string, string> = {};
  data?.forEach((setting) => {
    settingsMap[setting.key] = setting.value;
  });

  return settingsMap;
}

export async function getSetting(key: string, tenantId: number = 1): Promise<string | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('tenant_id', tenantId)
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }

  return data?.value ?? null;
}

export async function updateSetting(
  key: string,
  value: string,
  tenantId: number = 1
): Promise<boolean> {
  const { error } = await supabase
    .from('settings')
    .upsert(
      {
        tenant_id: tenantId,
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'tenant_id,key',
      }
    );

  if (error) {
    console.error(`Error updating setting ${key}:`, error);
    return false;
  }

  return true;
}
