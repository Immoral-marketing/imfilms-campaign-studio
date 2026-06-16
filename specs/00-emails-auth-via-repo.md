# SPEC-00: Emails de Auth gestionados desde el repo

**Versión:** 1.0
**Estado:** implementada
**Tipo de proyecto:** web-app
**Última actualización:** 2026-06-03
**Owner:** Gregory (Immoral Group)

---

## Descripción

Actualmente los emails de registro, confirmación de cuenta y recuperación de contraseña los envía Supabase Auth directamente desde su sistema interno, con plantillas configuradas en el dashboard de Supabase que no están versionadas en el repo. Esto impide controlar el contenido, el dominio del remitente y el diseño de esos emails.

Esta spec mueve todos los emails de Auth al repo: se desactivan los emails automáticos de Supabase y se crean Auth Hooks que interceptan cada evento y los redirigen a la Edge Function `send-email` existente (Resend), usando plantillas HTML versionadas en el código.

---

## Actores

- **Usuario nuevo:** Recibe email de confirmación de cuenta al registrarse.
- **Usuario existente:** Recibe email de recuperación de contraseña cuando lo solicita.
- **Admin Imfilms:** Invita a nuevos usuarios a la plataforma (ya gestionado por `invite-team-member`, pero su email de invitación también pasa a estar versionado).

---

## Flujos principales

### Flujo 1: Confirmación de cuenta (signup)

1. Usuario se registra en la plataforma.
2. Supabase dispara el Auth Hook `send_email` (tipo `signup`).
3. El hook llama a la Edge Function `auth-email-hook`.
4. La Edge Function construye el email de confirmación con la plantilla versionada y el enlace de confirmación que Supabase provee en el payload del hook.
5. Resend envía el email desde `updates@estrenos.imfilms.es`.
6. Usuario recibe email con diseño correcto y dominio correcto.

### Flujo 2: Recuperación de contraseña

1. Usuario solicita reset de contraseña.
2. Supabase dispara el Auth Hook `send_email` (tipo `recovery`).
3. El hook llama a `auth-email-hook`.
4. La Edge Function construye el email de recuperación con la plantilla y el enlace de reset que Supabase provee.
5. Resend envía el email.

### Flujo 3: Magic link / invitación

1. Admin invita a un usuario nuevo (genera un magic link de invitación).
2. Supabase dispara el Auth Hook `send_email` (tipo `invite` o `magiclink`).
3. El hook llama a `auth-email-hook`.
4. La Edge Function construye el email de invitación con la plantilla.
5. Resend envía el email.

---

## Flujos alternativos / Edge cases

- **Hook falla o Resend no disponible:** Supabase reintenta el hook según su política. Si falla definitivamente, el usuario no recibe el email — se debe monitorear en los logs de Supabase.
- **Tipo de email desconocido:** Si el hook recibe un tipo no contemplado, loguear y retornar 200 para no bloquear el flujo de Auth de Supabase.

---

## Criterios de aceptación

- [ ] CA-01: Al registrarse un usuario nuevo, recibe un email de confirmación enviado desde `updates@estrenos.imfilms.es` con el enlace de confirmación funcionando correctamente.
- [ ] CA-02: Al solicitar recuperación de contraseña, el usuario recibe un email con el enlace de reset enviado desde `updates@estrenos.imfilms.es`.
- [ ] CA-03: Los emails tienen el diseño consistente con el resto de emails del sistema (logo Imfilms, tipografía, colores de marca).
- [ ] CA-04: Las plantillas HTML de los emails de auth están versionadas en el repo bajo `supabase/functions/auth-email-hook/`.
- [ ] CA-05: Los emails de Supabase Auth nativos están desactivados (el sistema no envía emails duplicados).
- [ ] CA-06: Si el hook recibe un tipo de email no contemplado, responde 200 sin lanzar error.

---

## Plan de implementación

### Arquitectura propuesta

Se crea una nueva Edge Function `auth-email-hook` que actúa como receptor del Auth Hook de Supabase. Esta función recibe el payload del hook (que incluye el tipo de email y el enlace generado por Supabase), construye el HTML del email con la plantilla correspondiente, y llama directamente a la API de Resend (no a `send-email` para evitar doble hop).

El hook se registra en Supabase Dashboard → Authentication → Hooks → `send_email`.

### Desglose de tareas

**BACKEND-AGENT:**
1. Crear `supabase/functions/auth-email-hook/index.ts` — Edge Function que recibe el payload del Auth Hook de Supabase y envía el email via Resend según el tipo (`signup`, `recovery`, `invite`, `magiclink`, `email_change`).
2. Crear plantillas HTML inline dentro de la Edge Function para cada tipo de email, con el mismo estilo visual que los emails existentes en `send-email/index.ts` (logo, colores, botón CTA).
3. La función debe validar que la petición viene de Supabase (header `x-supabase-signature` o secret compartido via env var `AUTH_HOOK_SECRET`).
4. Registrar en Supabase Dashboard el hook apuntando a la URL de la nueva Edge Function — documentar el paso en este archivo.

**No requiere DB-AGENT** — no hay cambios de schema.

### Dependencias con otras specs

Ninguna. Esta spec es independiente y puede implementarse antes que las demás.

---

## Notas de seguridad

- La Edge Function debe verificar que la petición viene de Supabase antes de procesar (secret compartido en env var).
- El `AUTH_HOOK_SECRET` se almacena como secret de Edge Function en Supabase dashboard, nunca en código.
- El enlace de confirmación/reset lo genera Supabase — la Edge Function solo lo transporta, no lo construye.

---

## Out of scope

- Cambiar el proveedor de email (Resend sigue siendo el proveedor).
- Rediseño visual de las plantillas (se mantiene el estilo actual del sistema).
- Emails de notificación de campañas (ya pasan por el repo).

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---|---|---|---|
| 1.0 | 2026-06-03 | Versión inicial | Gregory |
