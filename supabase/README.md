# Supabase Setup

1. Create a Supabase project (cloud-hosted).
2. Open SQL Editor and run the migration file in `supabase/migrations/20260403_001_init.sql`.
3. In Supabase project settings, copy:
   - Project URL
   - `anon` key
   - `service_role` key
4. Create `backend/.env` from `backend/.env.example` and set those values.

Optional CLI workflow (if you choose to use Supabase CLI later):

- `supabase migration up`

The migration is the source of truth and should remain repo-tracked.
