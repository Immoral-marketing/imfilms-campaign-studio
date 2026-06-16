# PROJECT-CONSTITUTION.md

**Proyecto:** imfilms-campaign-studio
**Versión de Constitution del proyecto:** 1.0
**Hereda de:** BRIANSPEC-CONSTITUTION.md v1.0
**Última actualización:** 2026-06-03
**Owner del proyecto:** Gregory (Immoral Group)

> Este archivo se generó durante el bootstrap del proyecto por la skill `brianspec-init`. Define las decisiones fundacionales específicas de este proyecto. Hereda y complementa los principios globales de `BRIANSPEC-CONSTITUTION.md` — nunca los contradice.

---

## 1. Descripción del proyecto

**Tipo de proyecto:** web-app

**Qué problema resuelve:**
Permite a distribuidoras de cine configurar y gestionar campañas publicitarias en redes sociales, con cálculo dinámico de costes, planificación de medios y un programa de partners/afiliados. Elimina la fricción de presupuestar y lanzar campañas publicitarias en un sector donde los procesos son manuales y dispersos.

**Actores principales:**
- **Distribuidoras:** Crean y gestionan campañas para sus películas. Acceden al wizard de configuración, dashboard y detalle de campaña.
- **Administradores Imfilms:** Gestionan todo el sistema — distribuidoras, campañas, partners, configuración de tarifas y ajustes globales.
- **Partners / Afiliados:** Generan referidos a través de links con cookie de tracking. Acceden al portal de afiliado para ver comisiones y estado.

**Alcance del MVP (proyecto completo en producción):**
- Wizard de campañas de 6 pasos (requiere auth)
- Quick-wizard de 4 pasos para usuarios anónimos/nuevos con tracking de referido
- Dashboard principal de campañas (distribuidoras + admin con tab-switching)
- Detalle de campaña (`/campaigns/:id`)
- Panels de administración (`/admin`, `/admin/distributors`, `/admin/partners`)
- Portal de afiliado (`/afiliado`)
- Motor de cálculo de costes con umbrales configurables y modos `additional` / `integrated`
- Sistema de comisiones y afiliados con cookie tracking (30 días)
- Notificaciones por email via Resend

**Fuera de alcance (explícito):**
- Integración directa con plataformas publicitarias (Meta Ads API, Google Ads, etc.) — por ahora el plan se gestiona manualmente
- Pasarela de pago online — la facturación es off-platform
- App móvil nativa

---

## 2. Stack tecnológico

### Lenguajes y runtime

- TypeScript (frontend)
- SQL (Postgres / Supabase)
- JavaScript/TypeScript (Edge Functions en Deno)

### Frameworks y librerías principales

- React 18 + Vite
- Tailwind CSS + shadcn/ui (Radix UI primitives)
- TanStack React Query 5 — todo el server state
- React Router DOM v6
- React Hook Form + Zod — validación de formularios
- GSAP + Lenis — animaciones y smooth scroll
- date-fns — manejo de fechas en formato español (DD/MM/YYYY)
- Sonner — notificaciones toast

### Servicios y plataformas

- Supabase (Postgres + Auth + RLS + Edge Functions + Realtime)
- Resend — email transaccional
- Vercel — hosting y despliegue (Supabase project ID: `gkpsuibfkzzuheyzrsxl`)

### Justificación del stack

Stack decidido deliberadamente como patrón de mercado para web-apps B2B SaaS modernas. Supabase elegido por su combinación de Auth + Postgres + Edge Functions + RLS en un solo servicio sin overhead de infraestructura. React + Vite por velocidad de desarrollo y ecosistema. GSAP específicamente incorporado para animaciones de UI complejas (ej: botón animado de ticket) donde CSS puro no era suficiente.

---

## 3. Integraciones externas

### Skills externas instaladas

| Skill | Para qué sirve | Agentes que la usan |
|---|---|---|
| `emil-design-eng` | Filosofía de pulido UI, micro-interacciones, animación, calidad de front | FRONTEND-AGENT |
| `impeccable` | Diseño visual, jerarquía, pulido de interfaces | FRONTEND-AGENT |
| `design-taste-frontend` | Criterio de taste y calidad visual frontend | FRONTEND-AGENT |
| `gpt-taste` | Criterio de diseño de alto nivel | FRONTEND-AGENT |
| `stitch-design-taste` | Taste visual para composición | FRONTEND-AGENT |
| `design-taste-frontend-v1` | Versión anterior de taste frontend | FRONTEND-AGENT |

### MCPs (Model Context Protocol)

| MCP | Estado | Para qué |
|---|---|---|
| Supabase | ✅ Activo | Queries, migraciones, logs, schema |
| GitHub | ⏳ Pendiente instalar | PRs, issues, commits |
| Vercel | ⏳ Pendiente instalar | Deployments, logs, env vars |

### APIs de terceros

| Servicio | Scope mínimo | Dónde se usa |
|---|---|---|
| Supabase | Service role para Edge Functions, anon key para cliente | Auth, DB, Edge Functions |
| Resend | Envío de emails transaccionales | Edge Function `send-email` |

---

## 4. Herramienta de IA principal

**Copiloto declarado:** Claude Code

**Archivos de contexto generados:**
- `CLAUDE.md` — entrada rápida para Claude Code (fusionado con documentación técnica existente)

---

## 5. Agentes de construcción de este proyecto

Los agentes universales (SPEC, REVIEW, SECURITY) vienen del sistema BrianSpec y operan en cualquier proyecto. Los siguientes agentes de construcción son específicos de este proyecto y viven en `/agents/`:

| Archivo | Agente | Rol |
|---|---|---|
| `/agents/01-FRONTEND-AGENT.md` | FRONTEND-AGENT | Implementar componentes React, páginas y UI |
| `/agents/02-BACKEND-AGENT.md` | BACKEND-AGENT | Implementar Edge Functions, RPCs y lógica de negocio |
| `/agents/03-DB-AGENT.md` | DB-AGENT | Diseñar y mantener esquema Postgres, migraciones y RLS |

---

## 6. Convenciones de código

### Nomenclatura

- **Componentes React:** PascalCase (`CampaignWizard`, `PartnerCard`)
- **Hooks:** camelCase con prefijo `use` (`useCampaignCalculator`, `useAuth`)
- **Archivos de página:** PascalCase en `src/pages/`
- **Utilidades y lib:** camelCase en `src/lib/`
- **Path alias:** `@/` mapea a `src/`

### Estructura de archivos

```
src/
  pages/        # Una página por ruta
  components/   # Componentes reutilizables
  hooks/        # Custom hooks
  lib/          # Utilidades, helpers
  integrations/ # Supabase client y tipos generados
supabase/
  functions/    # Edge Functions (Deno)
  migrations/   # Migraciones SQL versionadas
specs/          # Specs activas (BrianSpec)
specs/archive/  # Specs implementadas y archivadas
agents/         # Agentes de construcción del proyecto
```

### Estilo

- `cn()` de `src/lib/utils.ts` para clases Tailwind condicionales
- `toast()` de Sonner para notificaciones (importar desde `'sonner'`)
- Precios siempre en EUR (€)
- Fechas en formato español DD/MM/YYYY via date-fns
- Sin `dangerouslySetInnerHTML` sin sanitización previa

### Tests

No hay suite de tests configurada actualmente. Ver política en sección 10.

---

## 7. Modelo de datos

### Tablas principales

| Tabla | Descripción |
|---|---|
| `profiles` | Perfil de usuario (extiende auth.users) |
| `distributors` | Distribuidoras registradas |
| `films` | Películas asociadas a distribuidoras |
| `campaigns` | Campañas publicitarias |
| `campaign_platforms` | Plataformas y presupuesto por campaña |
| `campaign_addons` | Addons contratados (Adaptación 290€, Microsite 490€, Email+WhatsApp 390€) |
| `campaign_assets` | Assets creativos de campañas |
| `film_edit_proposals` | Propuestas de edición de película |
| `user_roles` | Roles de usuario (admin, distributor) |
| `fee_thresholds` | Umbrales de tarifa para el motor de cálculo |
| `site_settings` | Configuración global del sitio |
| `partners` | Partners/afiliados |
| `referral_clicks` | Clicks de referido (acceso anónimo) |
| `solicitudes_afiliado` | Solicitudes de afiliado (acceso anónimo) |
| `comisiones` | Comisiones generadas por afiliados |
| `super_admins_afiliados` | Super admins del sistema de afiliados |

**Convención:** Todas las tablas con datos de usuario tienen RLS habilitado. Los tipos Supabase se generan automáticamente en `src/integrations/supabase/types.ts` — no editar manualmente.

---

## 8. Convenciones operativas

### Git

- **Naming de ramas:** `feature/descripcion`, `fix/descripcion`, `spec/NN-nombre`
- **Convención de commits:** Cada commit que implementa una spec referencia su número: `feat(spec-03): implementar filtro de campañas`
- **Política de PRs:** Revisión humana obligatoria antes de mergear a main (P5)

### Despliegue

- Vercel para el frontend (auto-deploy en push a main)
- Edge Functions: `supabase functions deploy <nombre>` via Supabase CLI o dashboard
- Variables de entorno: gestionadas en Vercel dashboard y `.env.local` en local

### Variables de entorno

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Secrets de Edge Functions gestionados en Supabase dashboard (no en código).

---

## 9. Restricciones específicas del proyecto

- **RLS obligatorio en todas las tablas nuevas.** Ninguna tabla con datos de usuario se crea sin políticas RLS verificadas por DB-AGENT y SECURITY-AGENT.
- **Sin service role en el cliente.** El service role solo se usa en Edge Functions server-side.
- **Tipos Supabase no se editan manualmente.** Se regeneran con el CLI de Supabase.
- **Budget allocation no puede superar 100%.** Validado via `useConflictDetection` — cualquier cambio en la lógica de plataformas debe mantener esta invariante.
- **Cookie de afiliado:** TTL fijo de 30 días. Cambiar esto requiere spec aprobada.

---

## 10. Cómo aplica BrianSpec a este proyecto

### Comandos disponibles

- `brianspec-spec` → Generar/clarificar specs nuevas
- `brianspec-build` → Implementar specs con revisión automática
- `brianspec-archive` → Cerrar y archivar specs implementadas

### Umbral para spec

**Requiere spec** todo cambio que:
- Afecte al usuario final o introduzca comportamiento nuevo
- Modifique el modelo de datos (tablas, columnas, RLS)
- Toque el motor de cálculo de costes (`useCampaignCalculator`)
- Modifique el sistema de afiliados o comisiones
- Añada o modifique una Edge Function
- Cambie flujos de autenticación o roles

**NO requiere spec:**
- Hotfixes evidentes (typos, null checks, fix de regresión menor)
- Refactors internos sin cambio funcional
- Cambios de copy sin cambio de comportamiento
- Ajustes de estilo/animación menores

### Política de tests

Sin suite automatizada actualmente (P9 — tests donde aportan valor). Para nuevas funcionalidades críticas (motor de cálculo, sistema de afiliados), se recomienda añadir tests unitarios antes de marcar la spec como implementada. No es bloqueante para el MVP actual.

---

## 11. Enmiendas a esta Constitution del proyecto

Esta Constitution puede modificarse cuando una decisión fundacional cambie (cambio de stack mayor, cambio de owner, cambio de alcance). El cambio se versiona en `CHANGELOG.md` y se anuncia al equipo antes de aplicarse.

---

*Proyecto imfilms-campaign-studio — Generado con BrianSpec v1.0 el 2026-06-03*
