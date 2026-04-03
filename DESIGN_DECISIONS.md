# DESIGN DECISIONS

| Decision | Chosen Option | Why | Date |
| --- | --- | --- | --- |
| Demo database platform | Supabase Postgres (hosted) | Fast setup, low cost, built-in auth and RLS | 2026-04-03 |
| API architecture | Node + Express + TypeScript | Simple, fast to implement, clear integration layer for RN app | 2026-04-03 |
| Auth mode | Full email/password (Supabase Auth) | Meets identity requirement with persistent user accounts | 2026-04-03 |
| Access control | RLS-first, token passthrough from API | Centralized DB-level protection for group/session data | 2026-04-03 |
| Core data model | Relational schema for groups/sessions/preferences/votes/recommendations | Matches constraints and query patterns for planning flow | 2026-04-03 |
