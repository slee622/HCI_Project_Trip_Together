# Trip Together Backend

Express + TypeScript API layer backed by Supabase Postgres.

## Quick Start

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - `cp .env.example .env`
   - Fill in Supabase URL, anon key, and service role key.
3. Run development server:
   - `npm run dev`

## Scripts

- `npm run dev` starts the backend with watch mode.
- `npm run build` compiles to `dist/`.
- `npm run typecheck` runs TypeScript checks.
- `npm run test` runs API tests.

## API Surface (v1)

- `GET /health`
- `POST /api/groups`
- `POST /api/groups/:groupId/invite`
- `POST /api/groups/:groupId/join`
- `POST /api/sessions`
- `GET /api/sessions/:sessionId`
- `PUT /api/sessions/:sessionId/preferences`
- `GET /api/sessions/:sessionId/preferences`
- `PUT /api/sessions/:sessionId/vote`
- `GET /api/sessions/:sessionId/votes`
- `PUT /api/sessions/:sessionId/recommendations`
- `GET /api/sessions/:sessionId/recommendations`
- `PUT /api/sessions/:sessionId/selection`
- `GET /api/sessions/:sessionId/selection`
