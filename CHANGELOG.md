# CHANGELOG

Historial de cambios del proyecto imfilms-campaign-studio.

---

## [0.3.0] — 2026-06-03

### SPEC-01: Demo — actualización de datos
- Fechas de la demo ahora son dinámicas y siempre futuras (relativas a la fecha actual)
- Montos actualizados: Conversadora 8.000€, Estándar 15.000€, Agresiva 30.000€
- Paso 3 añade rangos "Campaña completa" y "Entrega de report"
- Paso 4 elimina las 3 cards informativas de colores

### SPEC-02: Demo — botón "Registra tu estreno"
- Botón persistente en el header de la demo en todos los pasos
- Navega a `/quick-wizard`

### SPEC-03: Centro de ayuda — gestión de vídeos
- Migración `20260603000000_create_help_videos.sql` — tabla `help_videos` con RLS
- `HelpCenter.tsx` actualizado: tab Vídeos muestra iframes reales desde Supabase
- `Admin.tsx` añade tab "Vídeos" con CRUD completo (añadir/editar/borrar)

### SPEC-04: Centro de ayuda — botón Contactar soporte
- `HelpCenter.tsx` añade tab "Soporte" con formulario (asunto + mensaje)
- `send-email` Edge Function añade tipo `support_request` que notifica a todos los admins
- Respuesta automática vía `reply_to` al email del usuario

### SPEC-05: Panel usuario — "Recomienda y gana"
- `NavbarAdmin.tsx` añade opción "Recomienda y gana" con icono DollarSign en dropdown
- Nueva página `src/pages/RecomiendaPage.tsx` en `/recomienda`
- Mini landing con diseño premium: hero, stats, pasos, enlace de referido con copia
- Ruta registrada en `App.tsx`

---

## [0.2.0] — 2026-06-03

### SPEC-00: Emails de Auth gestionados desde el repo

- Nueva Edge Function `supabase/functions/auth-email-hook/index.ts`
- Gestiona los tipos: `signup`, `recovery`, `invite`, `magiclink`, `email_change`
- Plantillas HTML consistentes con el diseño del sistema (fondo oscuro, acento amarillo, logo)
- Envío via Resend desde `updates@estrenos.imfilms.es`
- Verificación de origen via `AUTH_HOOK_SECRET`
- **Paso manual pendiente:** Registrar el hook en Supabase Dashboard → Authentication → Hooks → `send_email`

---

## [0.1.0] — 2026-06-03

### Bootstrap con BrianSpec

- Inicialización del proyecto con el sistema BrianSpec v1.0
- Sembrado de archivos de sistema: `BRIANSPEC-CONSTITUTION.md`, `.brianspec/`, `docs/BRIANSPEC-CHEATSHEET.md`
- Generación de `PROJECT-CONSTITUTION.md` con stack, convenciones y modelo de datos documentados
- Generación de agentes de construcción: `FRONTEND-AGENT`, `BACKEND-AGENT`, `DB-AGENT`
- Actualización de `CLAUDE.md` con referencias al sistema BrianSpec (fusión con documentación existente)
- Creación de estructura `/specs/` y `/specs/archive/`
- Instalación de skills de diseño: `emil-design-eng`, `impeccable`, `design-taste-frontend`, `gpt-taste`, `stitch-design-taste`, `design-taste-frontend-v1`
