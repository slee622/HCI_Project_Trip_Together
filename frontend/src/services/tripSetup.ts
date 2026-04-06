import { AuthSession, getStoredSession } from './auth';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export interface CreateTripInput {
  origin: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  groupName?: string;
  tripTitle?: string;
  inviteEmails?: string[];
}

export interface CreateTripResult {
  groupId: string;
  tripSessionId: string;
  invites: Array<{ email: string; inviteCode: string }>;
}

function assertConfig(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
}

function getHeaders(session: AuthSession, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function callRpc<T>(
  rpcName: string,
  payload: Record<string, unknown>,
  session: AuthSession
): Promise<T> {
  assertConfig();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: getHeaders(session),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data?.message || data?.hint || data?.error || `Failed RPC ${rpcName} (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

function normalizeInviteEmails(inviteEmails?: string[]): string[] {
  if (!inviteEmails) return [];

  return [...new Set(
    inviteEmails
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  )];
}

export async function createTripWithGroup(input: CreateTripInput): Promise<CreateTripResult> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error('No local auth session found. Sign in first.');
  }

  const origin = input.origin.trim();
  if (!origin) {
    throw new Error('Origin is required.');
  }

  if (!input.departureDate || !input.returnDate) {
    throw new Error('Departure and return dates are required.');
  }

  if (input.returnDate <= input.departureDate) {
    throw new Error('Return date must be after departure date.');
  }

  const travelers = Math.max(1, input.travelers || 1);
  const groupName = (input.groupName || `${origin} Trip Group`).trim();
  const tripTitle = (input.tripTitle || `${origin} Trip`).trim();
  const inviteEmails = normalizeInviteEmails(input.inviteEmails);

  const groupId = await callRpc<string>(
    'create_group_with_owner',
    { p_name: groupName },
    session
  );

  const tripSessionId = await callRpc<string>(
    'create_trip_session',
    {
      p_group_id: groupId,
      p_title: tripTitle,
      p_origin: origin,
      p_departure_date: input.departureDate,
      p_return_date: input.returnDate,
      p_travelers: travelers,
    },
    session
  );
  const invites: Array<{ email: string; inviteCode: string }> = [];

  for (const email of inviteEmails) {
    const inviteCode = await callRpc<string>(
      'create_group_invite',
      {
        p_group_id: groupId,
        p_invited_email: email,
        p_expires_in_days: 14,
      },
      session
    );
    invites.push({ email, inviteCode });
  }

  return {
    groupId,
    tripSessionId,
    invites,
  };
}
