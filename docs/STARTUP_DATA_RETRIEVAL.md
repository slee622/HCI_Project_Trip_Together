# Startup Data Retrieval

This repo now includes a one-call startup payload for trip state so you can easily restore UI state on app open.

1. `public.get_my_startup_state(p_group_id uuid default null)`
- Use this on app open.
- Returns the latest active trip the current authenticated user can access.
- If no active trip exists, returns an empty payload with `tripSession: null`.

1. `public.get_trip_startup_state(p_trip_session_id uuid)`
- Use this when trip ID is already known.
- Returns full startup state for that trip.

Both functions require an authenticated user and enforce membership checks.

## Returned payload shape

```ts
interface StartupState {
  tripSession: {
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
  } | null;
  group: {
    id: string;
    name: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  groupMembers: Array<{
    userId: string;
    role: 'owner' | 'member';
    joinedAt: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
  preferences: Array<{
    userId: string;
    adventure: number;
    budget: number;
    setting: number;
    weather: number;
    focus: number;
    updatedAt: string;
  }>;
  recommendations: Array<{
    destinationId: string;
    rank: number;
    score: number;
    reason: string;
    generatedAt: string;
    updatedAt: string;
    destination: {
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
    };
  }>;
  votes: Array<{
    destinationId: string;
    userId: string;
    vote: -1 | 1;
    updatedAt: string;
  }>;
  selectedOption: {
    destinationId: string;
    selectedBy: string;
    selectedAt: string;
    updatedAt: string;
  } | null;
  startupVersion: number;
}
```

## Frontend helper (already added)

Use: `frontend/src/services/startupState.ts`

```ts
import { getMyStartupState, getTripStartupState } from '../services/startupState';

// On app open
const state = await getMyStartupState();

// Optional: restrict to a specific group on app open
const stateForGroup = await getMyStartupState(groupId);

// If trip session id is known
const knownTripState = await getTripStartupState(tripSessionId);
```

## Direct Supabase client usage (alternative)

```ts
const { data, error } = await supabase.rpc('get_my_startup_state', {
  p_group_id: null,
});

if (error) throw error;
```

## SQL quick checks

```sql
-- Latest active trip for current user
select public.get_my_startup_state(null);

-- Known trip id
select public.get_trip_startup_state('<trip-session-uuid>'::uuid);
```

## Integration guidance

1. Call `get_my_startup_state` after login/session restore.
2. If `tripSession` is `null`, render empty-state/create-trip flow.
3. If present, hydrate local state from `preferences`, `votes`, `recommendations`, and `selectedOption`.
4. Keep this payload as the single source for initial screen hydration to avoid multiple startup round-trips.
