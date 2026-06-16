# Sistema de Afiliados — Imfilms Campaign Studio

> [!IMPORTANT]
> Este documento es la fuente de verdad del sistema de afiliados.
> Contiene el estado exacto de todo lo implementado, las decisiones de diseño tomadas,
> y las instrucciones para continuar el desarrollo.

---

## Contexto del proyecto

| | Proyecto fuente (origen) | Proyecto destino |
|---|---|---|
| **Nombre** | `immoralia-catalogo-procesos` | `Imfilms_Campaign_Studio` |
| **Ruta local** | `C:\Users\cande\OneDrive\Documentos\Greg\catalogo\immoralia-catalogo-procesos` | `C:\Users\cande\OneDrive\Documentos\Greg\Imfilms_Campaign_Studio` |
| **URL** | `procesos.immoralia.es` | `estrenos.imfilms.es` |
| **Framework** | React + Vite + TypeScript + Supabase | React + Vite + TypeScript + Supabase |

El sistema fue portado desde `immoralia-catalogo-procesos` y adaptado al contexto de Imfilms.

---

## Qué es el sistema de afiliados

Un sistema de **referral B2B**: partners (distribuidoras, consultores, etc.) comparten un link personalizado `?ref=slug`. Cuando alguien llega por ese link y contrata un servicio, el partner recibe una **comisión del 10%** del importe cobrado. El pago mínimo para procesar una comisión es **100€**.

---

## Flujo de negocio completo (end-to-end)

### Paso 1: El admin crea un partner

Desde `/campaigns` → tab "Afiliados" → sección "Partners" → botón "Crear partner".

El admin ingresa: nombre, email y slug (ej: `paco-garcia`). Esto llama a la Edge Function `create-partner` que:
1. Verifica que el llamante existe en `super_admins_afiliados`
2. Verifica que el slug no esté en uso
3. Llama a `auth.admin.inviteUserByEmail()` → Supabase envía automáticamente un email de invitación al partner
4. Inserta en la tabla `partners` con `redirectTo: ${SITE_URL}/afiliado`
5. Si falla el INSERT, hace rollback eliminando el usuario Auth creado

El partner recibe el email, hace click en el link, llega a `/afiliado`, establece su contraseña y accede al portal.

### Paso 2: El partner comparte su link

Tiene el link `https://estrenos.imfilms.es/?ref=paco-garcia` y lo comparte por donde quiera: email, redes, WhatsApp, etc.

### Paso 3: Un visitante llega por el link

`ReferralTracker` es un componente invisible montado como primer hijo del router en `App.tsx`. Se ejecuta en cada navegación.

Al detectar `?ref=paco-garcia` en la URL:
1. Llama `setReferralCookie("paco-garcia")` → guarda cookie `imf_ref` en el navegador del visitante durante **30 días**. Si llega otro link de otro partner, el último sobrescribe (último click gana).
2. Llama a la RPC `get_partner_id_by_slug("paco-garcia")` → resuelve el UUID del partner
3. Inserta un registro en `referral_clicks` (solo un contador, sin datos personales del visitante)

El visitante puede cerrar el navegador, volver otro día — la cookie persiste 30 días.

### Paso 4: El visitante completa el QuickWizard

El QuickWizard (`/quick-wizard`) es el formulario para nuevas distribuidoras. Tiene 4 pasos: datos del film, plataformas y presupuesto, fechas, y datos de contacto con verificación de email.

Al hacer click en "Crear cuenta y ver mi presupuesto", `handleCreateAccount` ejecuta esto **en orden**:

```
1. Lee la cookie imf_ref → obtiene "paco-garcia"
2. Llama get_partner_id_by_slug("paco-garcia") → obtiene UUID del partner
3. Llama Edge Function submit-campaign → crea la campaña en Supabase + notificación interna
4. Llama supabase.auth.signUp() → crea cuenta del usuario distribuidor
5. Si el paso 2 devolvió un partner_id:
   → INSERT en solicitudes_afiliado: {
       partner_id,
       datos_formulario: { company, contact, email, film_title },
       estado: 'pendiente'
     }
   → clearReferralCookie() — borra la cookie para que futuros formularios no se atribuyan al mismo partner
6. navigate("/confirmation")
```

**Punto clave:** `solicitudes_afiliado` y la campaña (`campaigns`) son **registros completamente separados**. La solicitud no es la campaña — es un registro que dice "este lead llegó referido por este partner". No están vinculados por FK entre sí. `solicitudes_afiliado` solo trackea el origen del lead.

Todo el bloque del referral es fire-and-forget: si falla, el usuario no lo nota y su campaña ya quedó guardada.

### Paso 5: El admin gestiona la solicitud

El admin entra a `/campaigns` → tab "Afiliados" → sección "Solicitudes". Ve la nueva solicitud en estado `pendiente`.

El flujo es:
1. Admin revisa si el lead efectivamente contrató
2. Va actualizando el estado según avanza la negociación: `pendiente → en_proceso → aprobada`
3. Cuando cobran, ingresa el importe en el campo "Importe cobrado (€)"
4. Cambia el estado a `cerrada`
5. **Al guardar:** el trigger en Supabase detecta las condiciones y genera automáticamente la comisión en `comisiones` (10% del importe cobrado)
6. El admin puede marcar la comisión como `pagada` cuando se transfiere el dinero

### Paso 6: El partner ve su dashboard

El partner entra a `/afiliado` y ve:
- Visitas generadas (count real de `referral_clicks`)
- Solicitudes asignadas (count real de `solicitudes_afiliado`)
- Comisión pendiente (suma real de `comisiones` con estado `pendiente`)
- Tabla de solicitudes: solo estado y fecha, sin datos del cliente (confidencialidad)
- Columna "Comisión": muestra el importe si existe, o "—" si no hay comisión aún
- Resumen de comisiones: generada / pagada / pendiente
- Aviso cuando la comisión pendiente es menor a 100€ (mínimo de pago)

---

## Base de datos — tablas

> [!NOTE]
> Los nombres de tablas usan sufijos para evitar colisiones con tablas existentes en Campaign Studio.

| Tabla | Propósito |
|---|---|
| `partners` | Afiliados: `nombre`, `email`, `slug` único, `user_id` de Supabase Auth, `activo` |
| `referral_clicks` | Click tracking anónimo cuando llega un visitante por `?ref=slug` |
| `solicitudes_afiliado` | Leads referidos. Registra el origen del lead, no duplica la campaña. |
| `comisiones` | 10% del `importe_cobrado`. Generada automáticamente por trigger cuando solicitud = `cerrada` |
| `super_admins_afiliados` | Usuarios con permisos totales sobre el sistema de afiliados |

### Estados de `solicitudes_afiliado`
```
pendiente → en_proceso → aprobada → cerrada
```
Al llegar a `cerrada` con `partner_id` e `importe_cobrado > 0`, se genera la comisión automáticamente.

### Estados de `comisiones`
```
pendiente → pagada
```
Solo el Super Admin puede marcar una comisión como `pagada`. No existe estado intermedio.

### Campos de `comisiones`
```sql
id               uuid PK
solicitud_id     uuid FK → solicitudes_afiliado
partner_id       uuid FK → partners
porcentaje       numeric DEFAULT 10
importe_base     numeric   -- = importe_cobrado de la solicitud
importe_comision numeric   -- = importe_base * 0.10
estado           text      -- 'pendiente' | 'pagada'
created_at       timestamptz
pagada_at        timestamptz nullable
```

### Funciones SQL

```sql
-- Resuelve slug → partner_id. SECURITY DEFINER para que anónimos puedan usarla.
get_partner_id_by_slug(p_slug text) RETURNS uuid

-- Verifica si el usuario autenticado es super admin de afiliados.
is_afiliados_admin() RETURNS boolean
```

### Permisos RLS

| Actor | Puede hacer |
|---|---|
| Anónimo (`anon`) | INSERT en `referral_clicks` y `solicitudes_afiliado` |
| Partner autenticado | SELECT solo de sus propios datos (su `user_id` → su `partner_id`) |
| Super admin afiliados | ALL en todas las tablas vía `is_afiliados_admin()` |
| Edge Function | Usa `service_role` key → bypasa RLS completamente |

---

## Cookie de tracking

- **Nombre:** `imf_ref`
- **Duración:** 30 días
- **Semántica:** último click gana (sobrescribe)
- **Se borra:** después de registrar exitosamente la `solicitud_afiliado`
- **Funciones en `src/lib/referral.ts`:**
  - `setReferralCookie(slug)` — guarda o sobrescribe
  - `getReferralSlug()` — lee el slug activo, o `null`
  - `clearReferralCookie()` — borra la cookie

---

## Checkpoints — Fase 1 (completada)

| # | Checkpoint | Estado | Archivo |
|---|---|---|---|
| CP-01 | Migración SQL v1 | ✅ Ejecutada en Supabase | `supabase/migrations/20260422000000_sistema_afiliados.sql` |
| CP-02 | `referral.ts` (cookie utils) | ✅ | `src/lib/referral.ts` |
| CP-03 | `ReferralTracker.tsx` | ✅ | `src/components/ReferralTracker.tsx` |
| CP-04 | `<ReferralTracker />` montado en `App.tsx` | ✅ | `src/App.tsx` |
| CP-05 | `AfiliadoPage.tsx` — portal completo con datos reales | ✅ | `src/pages/AfiliadoPage.tsx` |
| CP-06 | Ruta `/afiliado` en `App.tsx` | ✅ | `src/App.tsx` |
| CP-07 | Edge Function `create-partner` | ✅ Deployada | `supabase/functions/create-partner/index.ts` |
| CP-08 | Integrar referral en `QuickWizard.tsx` | ✅ | `src/pages/QuickWizard.tsx` |
| CP-09 | Integrar referral en `DemoWizard.tsx` | ❌ No aplica | DemoWizard es tour estático, no crea leads |
| CP-10 | Panel admin de afiliados (`AdminPartners.tsx`) | ✅ | `src/pages/AdminPartners.tsx` |

> [!NOTE]
> **CP-09:** `DemoWizard.tsx` es un tour de demostración con datos pre-cargados que no llama a Supabase. Excluido por decisión de diseño.

---

## Checkpoints — Fase 2 (completada)

| # | Checkpoint | Estado | Archivo |
|---|---|---|---|
| CP-11 | Migración SQL v2: trigger auto-comisión + unique constraint | ✅ Código listo — **pendiente ejecutar en Supabase** | `supabase/migrations/20260422000001_comisiones_trigger.sql` |
| CP-12 | `AdminPartners.tsx`: tab Comisiones — REF, filtros, totales, 2 estados, 10% | ✅ | `src/pages/AdminPartners.tsx` |
| CP-13 | `AdminPartners.tsx`: tab Solicitudes — dropdown partner + quitar botón manual | ✅ | `src/pages/AdminPartners.tsx` |
| CP-13b | `AdminPartners.tsx`: tab Partners — columna Visitas | ✅ | `src/pages/AdminPartners.tsx` |
| CP-14 | (Opcional) email al partner cuando se genera comisión | ⏸ Postergado | — |

---

## Estado final — Fase 2 completada (22/04/2026)

### Lo implementado en Fase 2

**Migración SQL v2 (`20260422000001_comisiones_trigger.sql`):**
- `UNIQUE INDEX` en `comisiones.solicitud_id` — una solicitud, una comisión, sin duplicados
- Función `auto_generate_comision`: crea o actualiza la comisión automáticamente al guardar una solicitud como `cerrada` con partner e importe > 0
- Si la solicitud se re-abre, la comisión vuelve a `pendiente` (nunca se borra el histórico)
- Si la comisión ya está `pagada`, no se toca aunque cambien los datos de la solicitud
- Porcentaje: **10%** (corrección desde el 15% original)

> [!WARNING]
> Esta migración está lista en código pero aún debe ejecutarse manualmente en **Supabase Dashboard → SQL Editor**.

**`AdminPartners.tsx` — cambios en Fase 2:**

Tab **Partners:**
- Nueva columna "Visitas": muestra el count real de clicks recibidos por cada partner

Tab **Solicitudes:**
- Dropdown "Partner asignado" en el modal de edición — permite asignar o reasignar un partner a cualquier solicitud
- Se eliminó el botón manual "Comisión" (reemplazado por el trigger automático)
- Badge "Comisión ✓" en la fila cuando ya existe una comisión generada para esa solicitud
- Aviso en verde dentro del modal cuando la combinación estado+partner+importe va a generar una comisión al guardar

Tab **Comisiones:**
- Nueva columna "REF Solicitud" (referencia legible de la solicitud asociada)
- Filtro por partner (dropdown)
- Filtro por estado: Todos / Pendiente / Pagada
- Botón "Limpiar filtros" cuando hay filtros activos
- Contador de resultados visibles
- Header cambiado de "Comisión (15%)" a "Comisión (10%)"
- Estados simplificados a 2: `confirmada` (legado) se muestra igual que `pendiente`
- Flujo simplificado: un solo botón "Marcar pagada" (eliminado el paso intermedio "Confirmar")
- Totales al pie de tabla: suma de pendiente (amber) y suma de pagado (purple), reactivos a los filtros activos

### Desvíos corregidos respecto al spec original

**1. Porcentaje de comisión: 15% en lugar de 10%**

Actualmente en `handleCrearComision` ([AdminPartners.tsx:224](../src/pages/AdminPartners.tsx#L224)):
```typescript
importe_comision: sol.importe_cobrado * 0.15
```
Y el encabezado del tab dice "Comisión (15%)". La decisión de negocio es **10%**.

**2. Trigger de comisión: estado `aprobada` en lugar de `cerrada`**

El botón "Comisión" en tab Solicitudes ([AdminPartners.tsx:390](../src/pages/AdminPartners.tsx#L390)):
```typescript
sol.estado === 'aprobada' && sol.importe_cobrado && !tieneComision
```
La regla de negocio correcta es: estado = **`cerrada`** + partner_id + importe_cobrado > 0.

**3. Estados de comisiones: 3 en lugar de 2**

Actualmente: `pendiente → confirmada → pagada` (con botón "Confirmar" y luego "Marcar pagada").
La decisión es simplificar a: **`pendiente → pagada`** (un solo botón "Marcar como pagada").
El estado `confirmada` queda eliminado. Los registros existentes en `confirmada` deben tratarse como `pendiente` a efectos de la UI.

**4. Tab "Comisiones" le faltan features:**
- Columna "REF" de la solicitud (actualmente no aparece)
- Filtro por partner (dropdown)
- Filtro por estado (Pendiente / Pagada / Todos)
- Totales al pie: suma de comisiones pendientes y suma de comisiones pagadas

**5. Creación de comisiones: manual en lugar de automática**

Actualmente el admin hace click en un botón "Comisión" para crear cada comisión. La Fase 2 reemplaza esto por un trigger en Supabase que genera la comisión automáticamente cuando el admin guarda una solicitud con las condiciones cumplidas.

---

## CP-11 — Migración SQL v2 (pendiente)

### Qué hace esta migración

Crear una función PostgreSQL y su trigger para auto-generar/actualizar comisiones.

**Condición de disparo:** `solicitudes_afiliado` es actualizada con:
- `NEW.estado = 'cerrada'`
- `NEW.partner_id IS NOT NULL`
- `NEW.importe_cobrado > 0`

**Comportamiento de la función:**
- Si **no existe** comisión para esa `solicitud_id` → INSERT en `comisiones`
- Si **ya existe** comisión → UPDATE `importe_base` e `importe_comision` (por si el admin editó el importe)
- Si el estado **deja de ser** `cerrada` (re-apertura) → UPDATE estado de la comisión a `pendiente` (no se elimina — no destruir histórico)

**El porcentaje pasa de 15 a 10.** Los registros históricos no se tocan.

```sql
-- Pseudocódigo de la función
CREATE OR REPLACE FUNCTION public.auto_generate_comision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.estado = 'cerrada'
     AND NEW.partner_id IS NOT NULL
     AND NEW.importe_cobrado IS NOT NULL
     AND NEW.importe_cobrado > 0
  THEN
    INSERT INTO public.comisiones (solicitud_id, partner_id, porcentaje, importe_base, importe_comision, estado)
    VALUES (NEW.id, NEW.partner_id, 10, NEW.importe_cobrado, NEW.importe_cobrado * 0.10, 'pendiente')
    ON CONFLICT (solicitud_id) DO UPDATE
      SET importe_base     = EXCLUDED.importe_base,
          importe_comision = EXCLUDED.importe_comision;
  ELSIF NEW.estado <> 'cerrada' THEN
    -- Si la solicitud se re-abre, la comisión vuelve a pendiente pero no se borra
    UPDATE public.comisiones SET estado = 'pendiente'
    WHERE solicitud_id = NEW.id AND estado <> 'pagada';
  END IF;
  RETURN NEW;
END;
$$;
```

> [!WARNING]
> Para que el `ON CONFLICT (solicitud_id)` funcione, la tabla `comisiones` necesita una constraint `UNIQUE(solicitud_id)` — una solicitud solo puede tener una comisión. Añadir en la migración:
> ```sql
> ALTER TABLE public.comisiones ADD CONSTRAINT comisiones_solicitud_id_unique UNIQUE (solicitud_id);
> ```

El trigger se dispara `AFTER UPDATE ON solicitudes_afiliado FOR EACH ROW`.

---

## CP-12 y CP-13 — Cambios en `AdminPartners.tsx` (pendiente)

### Tab "Comisiones" — cambios necesarios

1. **Añadir columna REF** de la solicitud (mismo formato `#XXXXXXXX` que en Solicitudes)
2. **Cambiar estados**: eliminar "Confirmar" (pendiente → confirmada). Solo mostrar botón "Marcar como pagada" cuando `estado = 'pendiente'`
3. **Añadir filtros** sobre la tabla:
   - Dropdown de partner (poblar desde `partners` activos)
   - Dropdown de estado: Todos / Pendiente / Pagada
4. **Añadir fila de totales al pie**: suma de pendientes en amber, suma de pagadas en purple
5. **Actualizar header de columna**: "Comisión (15%)" → "Comisión (10%)"

### Tab "Solicitudes" — cambios necesarios

1. **Cambiar condición del botón "Comisión"**: de `estado === 'aprobada'` a `estado === 'cerrada'`
2. **Eliminar el botón "Comisión"** completamente: con el trigger automático, ya no se necesita. En su lugar mostrar un badge/texto "Comisión generada" si ya existe, o nada si no.

> [!NOTE]
> Al eliminar el botón manual de comisión, el tab "Solicitudes" queda más limpio: solo el botón "Editar" por fila.

---

## Checklist de deploy — Fase 2

- [ ] Ejecutar migración SQL v2 en Supabase Dashboard → SQL Editor
- [ ] Verificar que el trigger funciona: editar una solicitud de prueba a estado `cerrada` con importe y confirmar que aparece en `comisiones`
- [ ] Deploy del código actualizado a Vercel (git push a master → auto-deploy)
- [ ] Confirmar en el portal `/afiliado` que la comisión aparece para el partner de prueba

---

## Notas de diseño

- **`solicitudes_afiliado` ≠ `campaigns`** — son registros completamente separados. La solicitud registra el origen del lead; no está vinculada por FK a la campaña.
- **El admin de afiliados puede ser distinto del admin del sistema** — `super_admins_afiliados` es una tabla independiente de `user_roles`.
- **Las comisiones no se eliminan nunca** — si una solicitud se re-abre, la comisión vuelve a `pendiente` pero el registro se preserva.
- **El partner no ve el importe cobrado total** — solo ve su comisión (10%). El `importe_cobrado` en `solicitudes_afiliado` no se expone en el portal.
- **Pago mínimo 100€** — lógica solo en el frontend (`AfiliadoPage.tsx`). No hay validación en DB.
- **El portal `/afiliado` usa el mismo Supabase Auth** que el resto de la app. Los partners son usuarios Auth normales con registro en `partners`.
- **Wizard.tsx excluido del tracking**: el referral solo aplica en `QuickWizard.tsx` (primer registro de distribuidoras). `Wizard.tsx` es para distribuidoras ya autenticadas.

---

## Archivos clave del sistema

| Archivo | Rol |
|---|---|
| `supabase/migrations/20260422000000_sistema_afiliados.sql` | Tablas, RLS, funciones — Fase 1 |
| `supabase/migrations/20260422000001_comisiones_trigger.sql` | Trigger auto-comisión — Fase 2 (pendiente) |
| `supabase/functions/create-partner/index.ts` | Edge Function: crear partner + invitación |
| `src/lib/referral.ts` | Cookie utils: set/get/clear `imf_ref` |
| `src/components/ReferralTracker.tsx` | Componente invisible: detecta `?ref=` y registra click |
| `src/pages/QuickWizard.tsx` | Punto de conversión: inserta `solicitudes_afiliado` en submit |
| `src/pages/AdminPartners.tsx` | Panel admin: partners, solicitudes, comisiones |
| `src/pages/AfiliadoPage.tsx` | Portal del partner: auth + dashboard con datos reales |

---

## Fix notable aplicado durante el deploy (Fase 1)

La Edge Function retornaba mensajes de error genéricos. Se corrigió en `AdminPartners.tsx` dentro de `handleCreatePartner`:

```typescript
if (error) {
  let realMessage = error.message;
  try {
    const body = await (error as any).context?.json?.();
    if (body?.error) realMessage = body.error;
  } catch { /* ignore */ }
  throw new Error(realMessage);
}
```
