# Mijn Aarde — project context

## Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **State/data**: TanStack Query v5, react-router-dom v6
- **Backend**: Supabase (cloud project `imydpxahnoprqfsjseur`)
- **Rich text**: Tiptap
- **Payments**: Mollie (via Supabase edge functions)
- **Deploy**: Vercel (`bert-maes-projects/mijnaarde`)

## Supabase
- Cloud URL: `https://imydpxahnoprqfsjseur.supabase.co`
- Client: `src/integrations/supabase/client.ts`
- Types: `src/integrations/supabase/types.ts`
- Edge functions: `supabase/functions/` (send-mailing, send-invoice, create-mollie-payment, mollie-webhook, create-admin-account, toggle-admin-role, send-onboarding-email, send-magic-link, check-member-email, reset-admin-password, …)
- Migrations: `supabase/migrations/` (37 files)
- Local Docker stack is **not used** — app talks directly to cloud

## Environment variables (.env)
```
VITE_SUPABASE_PROJECT_ID=imydpxahnoprqfsjseur
VITE_SUPABASE_URL=https://imydpxahnoprqfsjseur.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
```

## Dev commands
```
npm run dev       # start on http://localhost:8080
npm run build     # production build
npm test          # vitest
```

## App structure
- `src/pages/` — one file per page/route
- `src/components/` — shared UI, auth, layout, feature components
- `src/contexts/AuthContext.tsx` — auth state
- `src/hooks/` — custom React hooks
- `src/integrations/supabase/` — generated client + types

## Routes
Public: `/auth`, `/change-password`, `/unsubscribe`, `/events/:id`, `/donate`, `/donate/success`  
Member portal: `/member`  
Admin (require admin role): `/`, `/members`, `/companies`, `/finance/*`, `/mailing/*`, `/events`, `/tools/*`

## GitHub
`https://github.com/bertmaes7/mijnaarde-06044047`
