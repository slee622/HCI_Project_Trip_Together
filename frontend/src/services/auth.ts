import { Platform } from 'react-native';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const SESSION_STORAGE_KEY = 'trip_together.auth_session';
let inMemorySession: AuthSession | null = null;

interface WebStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number | null;
  user: AuthUser;
}

function getStorage(): WebStorageLike | null {
  if (Platform.OS !== 'web') {
    return null;
  }

  try {
    const candidate = (globalThis as any)?.localStorage;
    if (!candidate) return null;
    return candidate as WebStorageLike;
  } catch {
    return null;
  }
}

function getHeaders(accessToken?: string): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function parseJson(response: Response): Promise<any> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error_description ||
      payload?.msg ||
      payload?.error ||
      `Authentication request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function mapSession(payload: any): AuthSession {
  if (!payload?.access_token || !payload?.refresh_token || !payload?.user?.id) {
    throw new Error('Invalid auth session returned from Supabase');
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : null,
    user: {
      id: payload.user.id,
      email: payload.user.email ?? null,
    },
  };
}

export function isAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getAuthConfigError(): string | null {
  if (isAuthConfigured()) {
    return null;
  }

  return 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY';
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  if (!isAuthConfigured()) {
    throw new Error(getAuthConfigError() || 'Auth is not configured');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const payload = await parseJson(response);
  return mapSession(payload);
}

export async function signUpWithPassword(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthSession | null> {
  if (!isAuthConfigured()) {
    throw new Error(getAuthConfigError() || 'Auth is not configured');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      email,
      password,
      data: displayName ? { display_name: displayName } : undefined,
    }),
  });

  const payload = await parseJson(response);

  if (payload?.session?.access_token && payload?.session?.refresh_token && payload?.user?.id) {
    return mapSession({
      ...payload.session,
      user: payload.user,
    });
  }

  return null;
}

export async function signOut(accessToken: string): Promise<void> {
  if (!isAuthConfigured()) {
    return;
  }

  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: getHeaders(accessToken),
  });
}

export async function getStoredSession(): Promise<AuthSession | null> {
  const storage = getStorage();
  if (!storage) return inMemorySession;

  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return inMemorySession;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user?.id) {
      storage.removeItem(SESSION_STORAGE_KEY);
      inMemorySession = null;
      return null;
    }
    inMemorySession = parsed as AuthSession;
    return inMemorySession;
  } catch {
    storage.removeItem(SESSION_STORAGE_KEY);
    inMemorySession = null;
    return null;
  }
}

export async function persistSession(session: AuthSession): Promise<void> {
  inMemorySession = session;
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function clearStoredSession(): Promise<void> {
  inMemorySession = null;
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(SESSION_STORAGE_KEY);
}
