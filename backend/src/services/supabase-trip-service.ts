import { createClient, SupabaseClient } from '@supabase/supabase-js';

import {
  DestinationRecommendation,
  GroupMembership,
  SelectedDestination,
  SessionLoadResponse,
  TripGroup,
  TripSession,
  UserPreference,
  Vote
} from '../types/domain.js';
import {
  CreateGroupInput,
  CreateSessionInput,
  InviteToGroupInput,
  RecommendationInput,
  SelectionInput,
  TripService,
  VoteInput
} from './trip-service.js';
import { mapSupabaseError } from '../utils/errors.js';

interface SupabaseTripServiceOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export class SupabaseTripService implements TripService {
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;

  constructor(options: SupabaseTripServiceOptions) {
    this.supabaseUrl = options.supabaseUrl;
    this.supabaseAnonKey = options.supabaseAnonKey;
  }

  private clientFor(accessToken: string): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  async createGroup(accessToken: string, userId: string, input: CreateGroupInput): Promise<TripGroup> {
    const db = this.clientFor(accessToken);

    const { data: groupRow, error: groupError } = await db
      .from('trip_groups')
      .insert({
        name: input.name,
        description: input.description ?? null,
        created_by: userId
      })
      .select('*')
      .single();

    if (groupError) {
      throw mapSupabaseError(groupError, 'Failed to create group');
    }

    const { error: membershipError } = await db.from('group_memberships').insert({
      group_id: groupRow.id,
      user_id: userId,
      role: 'owner',
      join_status: 'accepted',
      invited_by: null
    });

    if (membershipError) {
      throw mapSupabaseError(membershipError, 'Group created but owner membership failed');
    }

    return mapTripGroup(groupRow);
  }

  async inviteToGroup(
    accessToken: string,
    actorUserId: string,
    groupId: string,
    input: InviteToGroupInput
  ): Promise<GroupMembership> {
    const db = this.clientFor(accessToken);

    const { data, error } = await db
      .from('group_memberships')
      .upsert(
        {
          group_id: groupId,
          user_id: input.userId,
          role: input.role,
          join_status: 'invited',
          invited_by: actorUserId
        },
        { onConflict: 'group_id,user_id' }
      )
      .select('*')
      .single();

    if (error) {
      throw mapSupabaseError(error, 'Failed to invite user to group');
    }

    return mapMembership(data);
  }

  async joinGroup(accessToken: string, userId: string, groupId: string): Promise<GroupMembership> {
    const db = this.clientFor(accessToken);

    const { data: existing, error: existingError } = await db
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) {
      throw mapSupabaseError(existingError, 'Failed to read group membership');
    }

    if (existing) {
      const { data, error } = await db
        .from('group_memberships')
        .update({ join_status: 'accepted' })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) {
        throw mapSupabaseError(error, 'Failed to accept group invitation');
      }

      return mapMembership(data);
    }

    const { data, error } = await db
      .from('group_memberships')
      .insert({
        group_id: groupId,
        user_id: userId,
        role: 'member',
        join_status: 'accepted',
        invited_by: null
      })
      .select('*')
      .single();

    if (error) {
      throw mapSupabaseError(error, 'Failed to join group');
    }

    return mapMembership(data);
  }

  async createSession(accessToken: string, userId: string, input: CreateSessionInput): Promise<TripSession> {
    const db = this.clientFor(accessToken);

    const { data, error } = await db
      .from('trip_sessions')
      .insert({
        group_id: input.groupId,
        name: input.name,
        start_date: input.startDate ?? null,
        end_date: input.endDate ?? null,
        source_location: input.sourceLocation ?? null,
        created_by: userId
      })
      .select('*')
      .single();

    if (error) {
      throw mapSupabaseError(error, 'Failed to create session');
    }

    return mapSession(data);
  }

  async getSession(accessToken: string, sessionId: string): Promise<SessionLoadResponse | null> {
    const db = this.clientFor(accessToken);

    const { data: sessionRow, error } = await db
      .from('trip_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      throw mapSupabaseError(error, 'Failed to load session');
    }

    if (!sessionRow) {
      return null;
    }

    const [preferences, votes, recommendations, selection] = await Promise.all([
      this.listPreferences(accessToken, sessionId),
      this.listVotes(accessToken, sessionId),
      this.listRecommendations(accessToken, sessionId),
      this.getSelection(accessToken, sessionId)
    ]);

    return {
      session: mapSession(sessionRow),
      preferences,
      votes,
      recommendations,
      selection
    };
  }

  async upsertPreference(
    accessToken: string,
    userId: string,
    sessionId: string,
    preferenceVector: Record<string, unknown>
  ): Promise<UserPreference> {
    const db = this.clientFor(accessToken);

    const { data, error } = await db
      .from('user_preferences')
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          preference_vector: preferenceVector
        },
        { onConflict: 'session_id,user_id' }
      )
      .select('*')
      .single();

    if (error) {
      throw mapSupabaseError(error, 'Failed to upsert preferences');
    }

    return mapPreference(data);
  }

  async listPreferences(accessToken: string, sessionId: string): Promise<UserPreference[]> {
    const db = this.clientFor(accessToken);

    const { data, error } = await db
      .from('user_preferences')
      .select('*')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw mapSupabaseError(error, 'Failed to list preferences');
    }

    return data.map(mapPreference);
  }

  async castVote(accessToken: string, userId: string, sessionId: string, vote: VoteInput): Promise<Vote> {
    const db = this.clientFor(accessToken);

    const { data, error } = await db
      .from('votes')
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          destination_code: vote.destinationCode,
          destination_name: vote.destinationName ?? null,
          vote_value: vote.voteValue
        },
        { onConflict: 'session_id,user_id' }
      )
      .select('*')
      .single();

    if (error) {
      throw mapSupabaseError(error, 'Failed to cast vote');
    }

    return mapVote(data);
  }

  async listVotes(accessToken: string, sessionId: string): Promise<Vote[]> {
    const db = this.clientFor(accessToken);

    const { data, error } = await db
      .from('votes')
      .select('*')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw mapSupabaseError(error, 'Failed to list votes');
    }

    return data.map(mapVote);
  }

  async setRecommendations(
    accessToken: string,
    sessionId: string,
    recommendations: RecommendationInput[]
  ): Promise<DestinationRecommendation[]> {
    const db = this.clientFor(accessToken);

    const { error: deleteError } = await db
      .from('destination_recommendations')
      .delete()
      .eq('session_id', sessionId);

    if (deleteError) {
      throw mapSupabaseError(deleteError, 'Failed to reset recommendations');
    }

    if (recommendations.length === 0) {
      return [];
    }

    const { data, error } = await db
      .from('destination_recommendations')
      .insert(
        recommendations.map((item) => ({
          session_id: sessionId,
          destination_code: item.destinationCode,
          destination_name: item.destinationName,
          score: item.score,
          explanation: item.explanation,
          metadata: item.metadata ?? {},
          rank: item.rank ?? null
        }))
      )
      .select('*');

    if (error) {
      throw mapSupabaseError(error, 'Failed to set recommendations');
    }

    return data.map(mapRecommendation);
  }

  async listRecommendations(accessToken: string, sessionId: string): Promise<DestinationRecommendation[]> {
    const db = this.clientFor(accessToken);

    const { data, error } = await db
      .from('destination_recommendations')
      .select('*')
      .eq('session_id', sessionId)
      .order('rank', { ascending: true, nullsFirst: false });

    if (error) {
      throw mapSupabaseError(error, 'Failed to list recommendations');
    }

    return data.map(mapRecommendation);
  }

  async setSelection(
    accessToken: string,
    userId: string,
    sessionId: string,
    input: SelectionInput
  ): Promise<SelectedDestination> {
    const db = this.clientFor(accessToken);

    const { data, error } = await db
      .from('selected_destination')
      .upsert(
        {
          session_id: sessionId,
          destination_code: input.destinationCode,
          selected_by: userId,
          selected_at: new Date().toISOString(),
          reasoning: input.reasoning ?? null
        },
        { onConflict: 'session_id' }
      )
      .select('*')
      .single();

    if (error) {
      throw mapSupabaseError(error, 'Failed to set selected destination');
    }

    return mapSelection(data);
  }

  async getSelection(accessToken: string, sessionId: string): Promise<SelectedDestination | null> {
    const db = this.clientFor(accessToken);

    const { data, error } = await db
      .from('selected_destination')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) {
      throw mapSupabaseError(error, 'Failed to load selected destination');
    }

    if (!data) {
      return null;
    }

    return mapSelection(data);
  }
}

function mapTripGroup(row: any): TripGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

function mapMembership(row: any): GroupMembership {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    role: row.role,
    joinStatus: row.join_status,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSession(row: any): TripSession {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    stage: row.stage,
    startDate: row.start_date,
    endDate: row.end_date,
    sourceLocation: row.source_location,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPreference(row: any): UserPreference {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    preferenceVector: row.preference_vector,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapVote(row: any): Vote {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    destinationCode: row.destination_code,
    destinationName: row.destination_name,
    voteValue: row.vote_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapRecommendation(row: any): DestinationRecommendation {
  return {
    id: row.id,
    sessionId: row.session_id,
    destinationCode: row.destination_code,
    destinationName: row.destination_name,
    score: Number(row.score),
    explanation: row.explanation,
    metadata: row.metadata,
    rank: row.rank,
    createdAt: row.created_at
  };
}

function mapSelection(row: any): SelectedDestination {
  return {
    sessionId: row.session_id,
    destinationCode: row.destination_code,
    selectedBy: row.selected_by,
    selectedAt: row.selected_at,
    reasoning: row.reasoning
  };
}
