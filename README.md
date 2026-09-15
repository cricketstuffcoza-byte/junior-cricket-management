# Junior Cricket Management (JCM)

A multi-school junior cricket management platform for schools, coaches, scorers, parents and administrators.

## Architecture

- Next.js App Router + TypeScript
- Supabase for authentication and data
- Role-aware portals
- Universal rules-driven scoring engine for O/6, O/7 and O/8
- Backend-authoritative match state with event-based scoring

## Data source

JCM uses the existing production Supabase project as its data source. The legacy application and legacy tables remain untouched.

## Development

Create `.env.local` from `.env.example` and provide the Supabase URL and publishable/anon key.

```bash
npm install
npm run dev
```

## Status

Foundation phase: application shell, authentication flow and role-aware portal routing.

<!-- Cloudflare deployment trigger: 2026-09-15 -->
