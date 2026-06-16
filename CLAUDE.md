# CLAUDE.md

Archivo de entrada rápida para Claude Code en el proyecto **imfilms-campaign-studio**.

## Sistema BrianSpec

Este proyecto usa **BrianSpec** — Spec-Driven Development de Immoral Group.

**Lee estos archivos antes de cualquier tarea:**
- `BRIANSPEC-CONSTITUTION.md` — principios globales del sistema (inmutables)
- `PROJECT-CONSTITUTION.md` — stack, convenciones, agentes y restricciones de este proyecto
- `/specs/` — specs activas. Si hay una spec en estado `aprobada`, úsala como contrato
- `.brianspec/agents.md` — los 3 agentes universales (SPEC, REVIEW, SECURITY)

**Comandos disponibles:**
- `brianspec-spec` → redactar o clarificar una spec nueva
- `brianspec-build` → implementar una spec aprobada (con revisión automática de CAs y seguridad)
- `brianspec-archive` → cerrar y archivar una spec implementada

**Agentes de construcción de este proyecto** (en `/agents/`):
- `01-FRONTEND-AGENT` — componentes React, páginas, UI (usa `emil-design-eng`, `impeccable`, `design-taste-frontend`)
- `02-BACKEND-AGENT` — Edge Functions, RPCs, lógica de negocio
- `03-DB-AGENT` — schema Postgres, migraciones, RLS

**Skills de diseño instaladas** (invocar desde FRONTEND-AGENT):
- `emil-design-eng` — micro-interacciones y calidad de front
- `impeccable` — pulido visual e interfaces
- `design-taste-frontend` — taste visual frontend
- `gpt-taste`, `stitch-design-taste`, `design-taste-frontend-v1` — criterio de diseño adicional

---

## What This App Does

**Imfilms Campaign Studio** is a B2B campaign management platform for film distributors. It lets studios configure and manage advertising campaigns across social media platforms, with dynamic cost calculation, media planning, and an affiliate partner program.

Live: https://estrenos.imfilms.es

## Commands

```bash
npm run dev       # Dev server on port 8080
npm run build     # Production build
npm run build:dev # Dev build
npm run lint      # ESLint check
npm run preview   # Preview production build
```

No test suite is configured.

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix UI primitives)
- Supabase (Postgres + RLS + Edge Functions + Realtime)
- TanStack React Query 5 — all server state
- React Router DOM v6
- React Hook Form + Zod — form validation
- GSAP + Lenis — animations and smooth scroll
- Resend — transactional email

## Architecture

### Routing (`src/App.tsx`)
Single BrowserRouter. All providers live here: QueryClient, Tooltip, Chat listeners. Routes are not code-split. Key routes:
- `/wizard` — Full 6-step campaign builder (requires auth)
- `/quick-wizard` — Lightweight 4-step form (anonymous/new users, includes referral tracking)
- `/campaigns` — Main dashboard (distributors + admin with tab-switching)
- `/campaigns/:id` — Campaign detail
- `/admin`, `/admin/distributors`, `/admin/partners` — Admin panels
- `/afiliado` — Affiliate partner portal

### Authentication (`src/hooks/useAuth.ts`)
Supabase Auth with email/password. Session stored in localStorage with auto token refresh. User roles come from the `user_roles` table. The hook returns `{ user, distributor, loading, isAdmin, isDistributor }`.

### Data Fetching
Direct Supabase client calls (`supabase.from().select()...`). No abstraction layer — queries live inside hooks or components. Complex operations use Supabase RPC or Edge Functions. React Query handles caching and invalidation.

### Cost Calculation Engine (`src/hooks/useCampaignCalculator.ts`)
Central to the business logic. Computes campaign fees from tiered thresholds stored in the `fee_thresholds` Supabase table (also has a `DEFAULT_THRESHOLDS` fallback). Two fee modes: `additional` (fees outside the budget) vs `integrated` (fees absorbed into budget). Addons (Adaptación 290€, Microsite 490€, Email+WhatsApp 390€) are priced separately.

### Form State / Draft Persistence
Wizard form state auto-saves to `localStorage` under key `imfilms_wizard_draft`. On reload, the wizard restores from this draft.

### Affiliate/Referral System (`src/lib/referral.ts`)
Cookie-based tracking via `imf_ref` cookie (30-day TTL). The `create-partner` Edge Function runs as SECURITY DEFINER. Tables: `partners`, `referral_clicks`, `solicitudes_afiliado`, `comisiones`, `super_admins_afiliados`.

## Database Conventions

All user-facing tables have RLS enabled. Users see only their own rows; admins see all. Anonymous users can write to `referral_clicks` and `solicitudes_afiliado`. Edge Functions use the service role to bypass RLS when needed.

Core tables: `profiles`, `distributors`, `films`, `campaigns`, `campaign_platforms`, `campaign_addons`, `campaign_assets`, `film_edit_proposals`, `user_roles`, `fee_thresholds`, `site_settings`.

Migrations live in `supabase/migrations/`. Supabase types are auto-generated at `src/integrations/supabase/types.ts` — don't edit manually.

## Key Conventions

- **Path alias:** `@/` maps to `src/`
- **Currency:** All prices in EUR (€)
- **Dates:** Spanish format (DD/MM/YYYY) via date-fns
- **Styling:** Use `cn()` from `src/lib/utils.ts` for conditional Tailwind classes
- **Notifications:** Use `toast()` from Sonner (imported as `import { toast } from 'sonner'`)
- **New pages:** Create in `src/pages/`, add `<Route>` in `App.tsx`
- **Conflict detection:** Platform budget allocation is validated to not exceed 100% via `useConflictDetection`

## Edge Functions

Located in `supabase/functions/`. Key ones:
- `submit-campaign` — Creates campaign + triggers email notifications
- `create-partner` — Affiliate partner onboarding (SECURITY DEFINER)
- `send-email` — Resend API wrapper
- `invite-team-member`, `make-admin`, `delete-user` — User management

## Deployment

Hosted on Vercel (`vercel.json` present). Supabase project ID: `gkpsuibfkzzuheyzrsxl`. Edge Functions deployed via Supabase CLI or dashboard.
