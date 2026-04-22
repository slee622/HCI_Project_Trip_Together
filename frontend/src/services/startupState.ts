import { AuthSession, getStoredSession } from './auth';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

// Please see docs/STARTUP_DATA_RETRIEVAL.md for integration guidance.


export interface StartupGroupMember {
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface StartupPreference {
  userId: string;
  adventure: number;
  budget: number;
  setting: number;
  weather: number;
  focus: number;
  updatedAt: string;
}

export interface StartupDestination {
  id: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  temperatureScore: number;
  budgetScore: number;
  urbanScore: number;
  natureScore: number;
  foodScore: number;
  nightlifeScore: number;
  relaxationScore: number;
  shortDescription: string;
  imageUrl: string | null;
}

export interface StartupRecommendation {
  destinationId: string;
  rank: number;
  score: number;
  reason: string;
  generatedAt: string;
  updatedAt: string;
  destination: StartupDestination;
}

export interface StartupVote {
  destinationId: string;
  userId: string;
  vote: -1 | 1;
  updatedAt: string;
}

export interface StartupSelectedOption {
  destinationId: string;
  selectedBy: string;
  selectedAt: string;
  updatedAt: string;
}

interface StartupCompareDestination {
  id: string;
  city: string;
  state: string;
  shortDescription: string;
}

interface StartupCompareOptionRow {
  destination_id: string;
  added_by: string;
  added_at: string;
  destination: StartupCompareDestination;
}

export interface StartupCompareOption {
  destinationId: string;
  addedBy: string;
  addedAt: string;
  destination: StartupCompareDestination;
}

interface StartupCustomCompareMarkerRow {
  marker_id: string;
  added_by: string;
  added_at: string;
  marker: {
    id: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  };
}

export interface StartupCustomCompareMarker {
  markerId: string;
  addedBy: string;
  addedAt: string;
  marker: {
    id: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  };
}

interface StartupTripMapMarkerRow {
  marker_id: string;
  source_destination_id: string | null;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export interface StartupTripMapMarker {
  markerId: string;
  sourceDestinationId: string | null;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  addedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StartupTripSession {
  id: string;
  groupId: string;
  title: string;
  origin: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  status: 'active' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StartupGroup {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface MyTripSummaryRow {
  id: string;
  group_id: string;
  group_name: string;
  title: string;
  origin: string;
  departure_date: string;
  return_date: string;
  travelers: number;
  status: 'active' | 'archived';
  updated_at: string;
}

export interface MyTripSummary {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  origin: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  status: 'active' | 'archived';
  updatedAt: string;
}

interface PendingInviteRow {
  invite_code: string;
  group_id: string;
  group_name: string;
  invited_email: string | null;
  invited_by_user_id: string;
  invited_by_display_name: string;
  invited_by_handle: string;
  created_at: string;
  expires_at: string | null;
  trip_session_id: string | null;
  trip_title: string | null;
  trip_origin: string | null;
  trip_departure_date: string | null;
  trip_return_date: string | null;
  trip_travelers: number | null;
  trip_status: 'active' | 'archived' | null;
}

export interface PendingGroupInviteTrip {
  tripSessionId: string;
  title: string;
  origin: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  status: 'active' | 'archived';
}

export interface PendingGroupInvite {
  inviteCode: string;
  groupId: string;
  groupName: string;
  invitedEmail: string | null;
  invitedByUserId: string;
  invitedByDisplayName: string;
  invitedByHandle: string;
  createdAt: string;
  expiresAt: string | null;
  trip: PendingGroupInviteTrip | null;
}

export interface StartupState {
  tripSession: StartupTripSession | null;
  group: StartupGroup | null;
  groupMembers: StartupGroupMember[];
  preferences: StartupPreference[];
  recommendations: StartupRecommendation[];
  votes: StartupVote[];
  selectedOption: StartupSelectedOption | null;
  compareOptions?: StartupCompareOption[];
  startupVersion: number;
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

async function fetchRpc<T>(
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

/**
 * Returns startup state for the latest active trip for the signed-in user.
 * Optionally restricts lookup to one group.
 */
export async function getMyStartupState(groupId?: string): Promise<StartupState> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error('No local auth session found. Sign in first.');
  }

  return fetchRpc<StartupState>(
    'get_my_startup_state',
    { p_group_id: groupId ?? null },
    session
  );
}

/**
 * Returns startup state for a known trip session id.
 */
export async function getTripStartupState(tripSessionId: string): Promise<StartupState> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error('No local auth session found. Sign in first.');
  }

  return fetchRpc<StartupState>(
    'get_trip_startup_state',
    { p_trip_session_id: tripSessionId },
    session
  );
}

/**
 * Returns most recently updated trips for the signed-in user.
 */
export async function listMyTripSessions(limit = 10): Promise<MyTripSummary[]> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error('No local auth session found. Sign in first.');
  }

  const rows = await fetchRpc<MyTripSummaryRow[]>(
    'list_my_trip_sessions',
    { p_limit: limit },
    session
  );

  return (rows || []).map((row) => ({
    id: row.id,
    groupId: row.group_id,
    groupName: row.group_name,
    title: row.title,
    origin: row.origin,
    departureDate: row.departure_date,
    returnDate: row.return_date,
    travelers: row.travelers,
    status: row.status,
    updatedAt: row.updated_at,
  }));
}

/**
 * Returns pending group invites for the signed-in user.
 */
export async function listMyPendingGroupInvites(limit = 10): Promise<PendingGroupInvite[]> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error('No local auth session found. Sign in first.');
  }

  const rows = await fetchRpc<PendingInviteRow[]>(
    'list_my_pending_group_invites',
    { p_limit: limit },
    session
  );

  return (rows || []).map((row) => ({
    inviteCode: row.invite_code,
    groupId: row.group_id,
    groupName: row.group_name,
    invitedEmail: row.invited_email,
    invitedByUserId: row.invited_by_user_id,
    invitedByDisplayName: row.invited_by_display_name,
    invitedByHandle: row.invited_by_handle,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    trip: row.trip_session_id
      ? {
          tripSessionId: row.trip_session_id,
          title: row.trip_title || 'Trip',
          origin: row.trip_origin || 'Unknown',
          departureDate: row.trip_departure_date || '',
          returnDate: row.trip_return_date || '',
          travelers: row.trip_travelers || 1,
          status: row.trip_status || 'active',
        }
      : null,
  }));
}

export async function acceptGroupInvite(inviteCode: string): Promise<string> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error('No local auth session found. Sign in first.');
  }

  return fetchRpc<string>(
    'accept_group_invite',
    { p_invite_code: inviteCode },
    session
  );
}

export async function rejectGroupInvite(inviteCode: string): Promise<string> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error('No local auth session found. Sign in first.');
  }

  return fetchRpc<string>(
    'reject_group_invite',
    { p_invite_code: inviteCode },
    session
  );
}

export async function listTripCompareDestinations(
  tripSessionId: string
): Promise<StartupCompareOption[]> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error('No local auth session found. Sign in first.');
  }

  const rows = await fetchRpc<StartupCompareOptionRow[]>(
    'list_trip_compare_destinations',
    { p_trip_session_id: tripSessionId },
    session
  );

  return (rows || []).map((row) => ({
    destinationId: row.destination_id,
    addedBy: row.added_by,
    addedAt: row.added_at,
    destination: row.destination,
  }));
}

export async function listTripCustomCompareMarkers(
  tripSessionId: string
): Promise<StartupCustomCompareMarker[]> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error('No local auth session found. Sign in first.');
  }

  const rows = await fetchRpc<StartupCustomCompareMarkerRow[]>(
    'list_trip_custom_compare_markers',
    { p_trip_session_id: tripSessionId },
    session
  );

  return (rows || []).map((row) => ({
    markerId: row.marker_id,
    addedBy: row.added_by,
    addedAt: row.added_at,
    marker: row.marker,
  }));
}

export async function listTripMapMarkers(
  tripSessionId: string
): Promise<StartupTripMapMarker[]> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error('No local auth session found. Sign in first.');
  }

  const rows = await fetchRpc<StartupTripMapMarkerRow[]>(
    'list_trip_map_markers',
    { p_trip_session_id: tripSessionId },
    session
  );

  return (rows || []).map((row) => ({
    markerId: row.marker_id,
    sourceDestinationId: row.source_destination_id,
    city: row.city,
    state: row.state,
    latitude: row.latitude,
    longitude: row.longitude,
    addedBy: row.added_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
