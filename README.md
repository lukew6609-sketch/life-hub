# Life Hub

Personal organiser: bills, subscriptions, insurance renewals, cars (MOT/tax), documents with AI extraction, an AI assistant that has read everything, gas & electric tariffs, warranties, lent/borrowed items and key dates.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres, Auth, Storage, RLS) · Vercel · Vercel AI Gateway (Claude)

## Environment
| Var | |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `AI_MODEL` | optional, default `anthropic/claude-sonnet-5.5` |

AI calls go through Vercel AI Gateway, which authenticates automatically on Vercel (OIDC). Locally, run `vercel env pull` or set `AI_GATEWAY_API_KEY`.

## Security
- Every table has row-level security: only the owner can read/write their rows.
- Files are in a private `documents` bucket, stored under `<user_id>/…`.
- Sign-ups are locked after the first account. To let someone else in (e.g. a partner), add their email to `public.allowed_signups` in the Supabase SQL editor.
- The calendar feed (`/api/calendar/<token>.ics`) is protected by a random token you can reset in Settings.

## Database
Schema lives in `supabase/migrations/`.
