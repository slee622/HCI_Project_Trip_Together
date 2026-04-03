import { createClient } from '@supabase/supabase-js';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { SupabaseAuthProvider } from './services/auth-provider.js';
import { SupabaseTripService } from './services/supabase-trip-service.js';

const adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const authProvider = new SupabaseAuthProvider(adminClient);
const tripService = new SupabaseTripService({
  supabaseUrl: env.supabaseUrl,
  supabaseAnonKey: env.supabaseAnonKey
});

const app = createApp({ authProvider, tripService });

app.listen(env.port, () => {
  console.log(`Backend listening on port ${env.port}`);
});
