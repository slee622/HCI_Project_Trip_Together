import { RecommendationWithEstimate, UserPreferences } from '../types';
import { AuthSession, getStoredSession } from './auth';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

interface PersistedRecommendation {
  destinationId: string;
  rank: number;
  score: number;
  reason: string;
}

export interface PersistedTripMapMarker {
  markerId: string;
  sourceDestinationId?: string | null;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

function assertConfig(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
}

function getHeaders(session: AuthSession): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
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

async function requireSession(): Promise<AuthSession> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error('No local auth session found. Sign in first.');
  }
  return session;
}

export async function saveTripPreferences(
  tripSessionId: string,
  preferences: UserPreferences
): Promise<void> {
  const session = await requireSession();
  await callRpc<null>(
    'upsert_trip_user_preferences',
    {
      p_trip_session_id: tripSessionId,
      p_adventure: preferences.adventure,
      p_budget: preferences.budget,
      p_setting: preferences.setting,
      p_weather: preferences.weather,
      p_focus: preferences.focus,
    },
    session
  );
}

export async function saveTripRecommendations(
  tripSessionId: string,
  recommendations: RecommendationWithEstimate[]
): Promise<void> {
  const session = await requireSession();

  const payload: PersistedRecommendation[] = recommendations.map((item, index) => ({
    destinationId: item.id,
    rank: index + 1,
    score: item.score,
    reason: item.reason,
  }));

  await callRpc<null>(
    'replace_trip_recommendations',
    {
      p_trip_session_id: tripSessionId,
      p_recommendations: payload,
    },
    session
  );
}

export async function saveSelectedDestination(
  tripSessionId: string,
  destinationId: string | null
): Promise<void> {
  const session = await requireSession();
  await callRpc<null>(
    'set_trip_selected_destination',
    {
      p_trip_session_id: tripSessionId,
      p_destination_id: destinationId,
    },
    session
  );
}

export async function saveTripVote(
  tripSessionId: string,
  destinationId: string,
  vote: -1 | 1
): Promise<void> {
  const session = await requireSession();
  await callRpc<null>(
    'upsert_trip_vote',
    {
      p_trip_session_id: tripSessionId,
      p_destination_id: destinationId,
      p_vote: vote,
    },
    session
  );
}

export async function removeTripVote(
  tripSessionId: string,
  destinationId: string
): Promise<void> {
  const session = await requireSession();
  await callRpc<null>(
    'remove_trip_vote',
    {
      p_trip_session_id: tripSessionId,
      p_destination_id: destinationId,
    },
    session
  );
}

export async function saveCompareDestination(
  tripSessionId: string,
  destinationId: string
): Promise<void> {
  const session = await requireSession();
  await callRpc<null>(
    'upsert_trip_compare_destination',
    {
      p_trip_session_id: tripSessionId,
      p_destination_id: destinationId,
    },
    session
  );
}

export async function removeCompareDestination(
  tripSessionId: string,
  destinationId: string
): Promise<void> {
  const session = await requireSession();
  await callRpc<null>(
    'remove_trip_compare_destination',
    {
      p_trip_session_id: tripSessionId,
      p_destination_id: destinationId,
    },
    session
  );
}

export async function saveTripMapMarker(
  tripSessionId: string,
  marker: {
    markerId: string;
    sourceDestinationId?: string | null;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  }
): Promise<void> {
  const session = await requireSession();
  await callRpc<null>(
    'upsert_trip_map_marker',
    {
      p_trip_session_id: tripSessionId,
      p_marker_id: marker.markerId,
      p_latitude: marker.latitude,
      p_longitude: marker.longitude,
      p_city: marker.city,
      p_state: marker.state,
      p_source_destination_id: marker.sourceDestinationId ?? null,
    },
    session
  );
}

export async function removeTripMapMarker(
  tripSessionId: string,
  markerId: string
): Promise<void> {
  const session = await requireSession();
  await callRpc<null>(
    'remove_trip_map_marker',
    {
      p_trip_session_id: tripSessionId,
      p_marker_id: markerId,
    },
    session
  );
}

export async function saveCustomCompareMarker(
  tripSessionId: string,
  markerId: string
): Promise<void> {
  const session = await requireSession();
  await callRpc<null>(
    'upsert_trip_custom_compare_marker',
    {
      p_trip_session_id: tripSessionId,
      p_marker_id: markerId,
    },
    session
  );
}

export async function removeCustomCompareMarker(
  tripSessionId: string,
  markerId: string
): Promise<void> {
  const session = await requireSession();
  await callRpc<null>(
    'remove_trip_custom_compare_marker',
    {
      p_trip_session_id: tripSessionId,
      p_marker_id: markerId,
    },
    session
  );
}

export interface PersistedVote {
  destinationId: string;
  userId: string;
  vote: -1 | 1;
  updatedAt: string;
}

export async function fetchTripVotes(tripSessionId: string): Promise<PersistedVote[]> {
  assertConfig();
  const session = await requireSession();

  const url =
    `${SUPABASE_URL}/rest/v1/trip_destination_votes` +
    `?trip_session_id=eq.${encodeURIComponent(tripSessionId)}` +
    `&select=destination_id,user_id,vote,updated_at`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch votes (${response.status})`);
  }

  const rows: Array<{
    destination_id: string;
    user_id: string;
    vote: -1 | 1;
    updated_at: string;
  }> = await response.json();

  return rows.map((row) => ({
    destinationId: row.destination_id,
    userId: row.user_id,
    vote: row.vote,
    updatedAt: row.updated_at,
  }));
}
