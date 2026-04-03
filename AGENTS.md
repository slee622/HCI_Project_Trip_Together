# AGENTS

## Operating Rules

- Keep `DESIGN_DECISIONS.md` updated for each major design decision.
- Favor speed-to-demo and low-cost defaults unless a change is explicitly requested.
- Keep backend architecture thin: API orchestration plus data access only.

## Known Mistakes & Resolutions

- Mistake: File generation can become inconsistent when shell quoting is complex.
  Resolution: Prefer deterministic edits (`apply_patch`) and verify critical files with quick readbacks.

## Working Agreements

- Database schema and policy changes must be captured as SQL migrations under `supabase/migrations/`.
- API behavior should be validated with automated tests under `backend/tests/`.
- When a mistake is identified, add a concrete prevention rule here immediately.
