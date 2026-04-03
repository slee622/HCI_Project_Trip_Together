export type GroupRole = 'owner' | 'member';
export type JoinStatus = 'invited' | 'accepted';

export interface TripGroup {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
}

export interface GroupMembership {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  joinStatus: JoinStatus;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripSession {
  id: string;
  groupId: string;
  name: string;
  stage: string;
  startDate: string | null;
  endDate: string | null;
  sourceLocation: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreference {
  id: string;
  sessionId: string;
  userId: string;
  preferenceVector: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  sessionId: string;
  userId: string;
  destinationCode: string;
  destinationName: string | null;
  voteValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface DestinationRecommendation {
  id: string;
  sessionId: string;
  destinationCode: string;
  destinationName: string;
  score: number;
  explanation: string;
  metadata: Record<string, unknown>;
  rank: number | null;
  createdAt: string;
}

export interface SelectedDestination {
  sessionId: string;
  destinationCode: string;
  selectedBy: string;
  selectedAt: string;
  reasoning: string | null;
}

export interface SessionLoadResponse {
  session: TripSession;
  preferences: UserPreference[];
  votes: Vote[];
  recommendations: DestinationRecommendation[];
  selection: SelectedDestination | null;
}
