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

export interface CreateGroupInput {
  name: string;
  description?: string;
}

export interface InviteToGroupInput {
  userId: string;
  role: 'owner' | 'member';
}

export interface CreateSessionInput {
  groupId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  sourceLocation?: string;
}

export interface VoteInput {
  destinationCode: string;
  destinationName?: string;
  voteValue: number;
}

export interface RecommendationInput {
  destinationCode: string;
  destinationName: string;
  score: number;
  explanation: string;
  metadata?: Record<string, unknown>;
  rank?: number;
}

export interface SelectionInput {
  destinationCode: string;
  reasoning?: string;
}

export interface TripService {
  createGroup(accessToken: string, userId: string, input: CreateGroupInput): Promise<TripGroup>;
  inviteToGroup(
    accessToken: string,
    actorUserId: string,
    groupId: string,
    input: InviteToGroupInput
  ): Promise<GroupMembership>;
  joinGroup(accessToken: string, userId: string, groupId: string): Promise<GroupMembership>;
  createSession(accessToken: string, userId: string, input: CreateSessionInput): Promise<TripSession>;
  getSession(accessToken: string, sessionId: string): Promise<SessionLoadResponse | null>;
  upsertPreference(
    accessToken: string,
    userId: string,
    sessionId: string,
    preferenceVector: Record<string, unknown>
  ): Promise<UserPreference>;
  listPreferences(accessToken: string, sessionId: string): Promise<UserPreference[]>;
  castVote(accessToken: string, userId: string, sessionId: string, vote: VoteInput): Promise<Vote>;
  listVotes(accessToken: string, sessionId: string): Promise<Vote[]>;
  setRecommendations(
    accessToken: string,
    sessionId: string,
    recommendations: RecommendationInput[]
  ): Promise<DestinationRecommendation[]>;
  listRecommendations(accessToken: string, sessionId: string): Promise<DestinationRecommendation[]>;
  setSelection(
    accessToken: string,
    userId: string,
    sessionId: string,
    input: SelectionInput
  ): Promise<SelectedDestination>;
  getSelection(accessToken: string, sessionId: string): Promise<SelectedDestination | null>;
}
