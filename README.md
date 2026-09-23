# SuperHosur

SuperHosur is an AI-powered local commerce marketplace. This repository contains the verified React foundation and the local Phase 2B database migration set; marketplace workflows will be implemented in later phases.

## Stack

- React + TypeScript
- Vite
- ESLint
- npm
- Supabase JavaScript client

The Supabase client and database migration foundation are present. Authentication screens, storage policies, Edge Functions, AI, payments, maps, and marketplace workflows are intentionally not implemented yet.

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
npm run preview
npm run verify:supabase
```

## Environment

Copy `.env.example` to `.env.local` and provide the Supabase project URL and public anon/publishable key. Only browser-safe values may use the `VITE_` prefix. Never put a service-role key or other server-side secret in frontend environment variables.

## Database

Phase 2B migrations live under `supabase/migrations/`. See [supabase/README.md](supabase/README.md) for table responsibilities, RLS strategy, and the safe workflow for linking and applying migrations to the existing Supabase project.
