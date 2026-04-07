import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getStoredSession } from './auth';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

let realtimeClient: SupabaseClient | null = null;

function assertConfig(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
}

function getClient(): SupabaseClient {
  if (realtimeClient) {
    return realtimeClient;
  }

  assertConfig();
  realtimeClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return realtimeClient;
}

export async function getRealtimeClient(): Promise<SupabaseClient> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error('No local auth session found. Sign in first.');
  }

  const client = getClient();
  client.realtime.setAuth(session.accessToken);
  return client;
}

export function removeRealtimeChannel(channel: RealtimeChannel): void {
  if (!realtimeClient) {
    return;
  }
  void realtimeClient.removeChannel(channel);
}
