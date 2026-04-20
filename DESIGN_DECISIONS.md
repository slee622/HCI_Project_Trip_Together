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

8. **2026-04-05: Startup hydration is done via single RPC payload**
   Trip startup data retrieval is consolidated into `get_my_startup_state` and `get_trip_startup_state` so teammates can hydrate trip session, preferences, votes, recommendations, and selected option in one request. This avoids multi-query startup logic and keeps app-open behavior consistent.

9. **2026-04-05: Authenticated app flow starts at Create Trip homepage**
   After login, users land on a dedicated create-trip screen that captures departure, dates, and invite emails, then creates `trip_groups`, `trip_sessions`, and group invites through Supabase before entering the planner. This keeps MVP onboarding explicit and ensures group/trip persistence starts at app entry.

10. **2026-04-05: Trip origin field expanded for airport or location text**
    `trip_sessions.origin` was relaxed from short code-only length to allow up to 64 characters so users can enter either airport codes or readable location names. This aligns storage constraints with the homepage requirement.

11. **2026-04-05: Trip creation uses RPC instead of direct table insert**
    Homepage trip creation now calls `create_trip_session` so client flow does not depend on direct `trip_sessions` table privileges. This keeps writes consistent with the existing RPC-based group/invite approach and avoids permission errors.

12. **2026-04-05: Current trip list uses dedicated membership-scoped RPC**
    The homepage now calls `list_my_trip_sessions` and renders those results below the create CTA. This keeps retrieval simple for teammates and avoids relying on direct client access patterns for `trip_sessions`.

13. **2026-04-05: Invite inbox is email-scoped with explicit accept/reject actions**
    Pending invites are surfaced via `list_my_pending_group_invites`, showing inviter identity and latest trip details for the group. Accept/reject actions are handled through RPCs so non-members can act on their invite without broad table read/write privileges.

14. **2026-04-05: Startup read RPCs run as `security definer`**
    Trip hydration RPCs were switched to definer mode so loading trip state does not depend on direct authenticated table grants. Authorization still stays explicit through existing membership checks inside the functions.

15. **2026-04-05: Planner view hydrates from persisted startup payload**
    Opening an existing trip now initializes planner preferences, recommendations, selected option, and vote payload from Supabase startup state before any recomputation. This ensures users see persisted trip context immediately when re-entering a trip.

16. **2026-04-05: Planner writes persist through trip-scoped RPCs**
    Slider preference updates, selected destination changes, and refreshed recommendation lists now write back to Supabase through dedicated RPCs keyed by `trip_session_id`. This keeps the persistence path explicit and aligned with the startup hydration schema.

17. **2026-04-05: Compare list persistence uses dedicated trip destination table**
    Added compare spots are stored in `trip_compare_destinations` and read per trip via RPC when opening planner. This avoids overloading votes/selection semantics and keeps compare state independent and explicit.

18. **2026-04-07: Multi-user trip collaboration sync uses Supabase Realtime sockets**
    Planner interactions that can be changed by teammates (`trip_user_preferences`, `trip_compare_destinations`, and `trip_destination_votes`) now update local UI from websocket-driven Realtime events. Pending invite visibility is also realtime via `group_invites` subscription scoped to the signed-in user's email so invitees see incoming trip invites without manual refresh.

19. **2026-04-07: Trip collaboration also emits direct channel broadcasts**
    Planner write actions now send explicit Realtime channel broadcast events (`trip_preference_changed`, compare add/remove, vote add/remove) so teammate UI updates do not depend solely on Postgres publication event delivery timing. Postgres change listeners remain enabled as a secondary sync path.

20. **2026-04-08: Removed unused Sky Scrapper backend service**
    The backend no longer imports or logs Sky Scrapper service configuration because travel routes are wired to Flights Sky. This reduces confusion about active providers and removes dead code surface area.

21. **2026-04-14: RapidAPI rate limits fall back to mock travel data**
    Flights Sky requests now treat HTTP 429 as a temporary outage, disable live calls for a short cooldown window, and fall back to mock results. This keeps the travel planner responsive when RapidAPI quotas are exhausted and avoids repeated error spam during a rate-limit window.

22. **2026-04-19: Only custom map markers are draggable**
    Recommendation markers are now fixed-position so ranked destination pins stay consistent for all users, while custom markers remain draggable for collaborative place annotation. This keeps generated recommendations stable while preserving map editing for user-added locations.

23. **2026-04-14: Airport fallback searches for nearby airports when destination lacks one**
    The `searchAirport()` function now performs a secondary search for nearby airports when the initial query returns a non-airport result (city, town, etc.). When searching "[city] airport" returns an airport result, that airport is used for flight search instead of falling back to a non-airport entity. If no nearby airport is found, the city/town result is used as-is, allowing flight searches to fail gracefully if Flights Sky has no airport mappings for that region.

24. **2026-04-17: Trip map markers persist as collaborative trip state**
    Marker coordinates now persist in a dedicated `trip_map_markers` table (instead of local-only UI state), with trip-scoped RPCs for upsert/list and Supabase Realtime publication enabled for websocket sync. Destination markers use their destination id as marker id for stable coordinate overrides, and users can also add custom markers with generated ids so non-catalog locations can be shared and moved collaboratively across all trip members.

25. **2026-04-20: Compare labels use canonical destination data, not map-marker overrides**
    Planner compare entries now keep city/state labels from persisted destination records (`trip_compare_destinations` + `destinations`) and ignore legacy `trip_map_markers` rows tied to `source_destination_id`. Marker syncing is treated as custom-marker-only state so stale recommendation-marker geocode rows cannot randomly rename compare options across reloads.

26. **2026-04-20: Custom marker compare selections persist in a dedicated trip-scoped table**
    Compare entries for user-added markers now persist via `trip_custom_compare_markers` with dedicated RPCs, instead of broadcast-only local state. This keeps custom compare choices stable across reloads and sessions while preserving destination-compare persistence in `trip_compare_destinations`.

27. **2026-04-20: Voting accepts custom marker compare entries**
    Vote persistence now supports both canonical destination ids and custom marker ids, with custom votes stored in `trip_custom_marker_votes` and startup hydration returning a unified vote list across both tables. This keeps compare voting behavior consistent when users include custom map locations.
