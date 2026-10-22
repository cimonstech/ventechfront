import { supabase } from '@/lib/supabase';

// Authorization header for calls to the backend API. Empty for guests.
export async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}
