# Design Decisions

1. **Identity uses `auth.users` + `public.profiles`**
   User identity is anchored to Supabase Auth (`auth.users`) and extended with a `profiles` table for `handle`, `display_name`, and avatar metadata. A signup trigger creates the profile automatically so every authenticated user has a persistent app identity.

2. **Group membership is explicit and invite-based**
   Group ownership and membership are separated into `trip_groups`, `group_members`, and `group_invites` so invite/join flows are trackable and auditable. Invite acceptance is handled through a dedicated RPC (`accept_group_invite`) to keep join logic atomic and consistent.

3. **Trip state is normalized by responsibility**
   Persistent trip data is split into focused tables: `trip_sessions`, `trip_user_preferences`, `trip_recommendations`, `trip_destination_votes`, and `trip_selected_destinations`. This keeps each MVP requirement directly mappable to one table instead of storing opaque JSON blobs.

4. **Destination data is first-class in the database**
   A `destinations` table mirrors your current scoring dataset so recommendation/vote rows have foreign-key integrity. Existing `backend/data/destinations.json` is seeded into Supabase via a migration to satisfy MVP data availability immediately.

5. **RLS is group-scoped, not globally open**
   Row Level Security policies use helper functions (`is_group_member`, `is_group_owner`, `is_trip_member`) so users can only access data tied to groups they belong to. This is the minimum secure posture for multi-user collaboration without adding complex role hierarchies.

6. **MVP-first write permissions**
   Recommendation writes are allowed for trip members to avoid blocking the current frontend/backend integration path during MVP. If needed later, this can be tightened to backend/service-role-only writes without changing table structure.

7. **2026-04-05: Frontend login uses Supabase Auth directly**
   The login page calls Supabase Auth endpoints from the Expo client using the public anon key and then gates app access on a stored session. This keeps MVP auth implementation fast and avoids adding a backend auth proxy layer right now.
