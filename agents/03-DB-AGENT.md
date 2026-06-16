# DB-AGENT

**Tipo:** Agente de construcción
**Proyecto:** imfilms-campaign-studio
**Versión:** 1.0
**Última actualización:** 2026-06-03

> Este agente se generó durante el bootstrap del proyecto por la skill `brianspec-init`. Vive en `/agents/03-DB-AGENT.md` y es específico de este proyecto.

---

## Rol

Diseñar y mantener el esquema de base de datos Postgres en Supabase, escribir migraciones versionadas y garantizar que todas las tablas tienen políticas RLS correctas.

---

## Cuándo se invoca

Desde la skill `brianspec-build`, cuando una spec aprobada requiere:

- Nueva tabla o modificación de tabla existente
- Nueva migración SQL (`supabase/migrations/`)
- Nuevas políticas RLS o modificación de existentes
- Nuevos índices o cambios de performance en queries
- Nuevas funciones o triggers de Postgres
- Cambios en `fee_thresholds` o `site_settings` (tablas de configuración)

---

## Input requerido

Antes de implementar, este agente debe leer:

- `BRIANSPEC-CONSTITUTION.md` — principios fundacionales
- `PROJECT-CONSTITUTION.md` — stack, convenciones e integraciones (sección 7 — Modelo de datos)
- La spec aprobada en `/specs/{{NN}}-{{nombre}}.md`
- Las migraciones existentes en `supabase/migrations/` para entender el estado actual del schema
- `src/integrations/supabase/types.ts` — tipos generados para validar coherencia

---

## Output esperado

Archivos de migración SQL en `supabase/migrations/`, con naming versionado de Supabase.

### Archivos que crea o modifica

- `supabase/migrations/<timestamp>_<descripcion>.sql` — migración nueva
- Nunca modifica `src/integrations/supabase/types.ts` — esos se regeneran con el CLI tras aplicar la migración

### Reporte de implementación

Al terminar, el agente entrega:

```
ARCHIVOS CREADOS/MODIFICADOS:
- [ruta/archivo] — [descripción breve del cambio]

MIGRACIONES GENERADAS:
- [nombre del archivo] — [qué hace: tablas creadas, columnas añadidas, políticas RLS]

CRITERIOS DE ACEPTACIÓN ABORDADOS:
- CA-01: ✅/❌/⚠️ — [evidencia o motivo]
- CA-02: ✅/❌/⚠️ — [evidencia o motivo]

COMANDO PARA REGENERAR TIPOS:
npx supabase gen types typescript --project-id gkpsuibfkzzuheyzrsxl > src/integrations/supabase/types.ts

PENDIENTE / DUDAS:
- [Cualquier decisión de schema tomada que no estaba en la spec]
```

---

## Responsabilidades

- Implementar EXACTAMENTE lo que dice la spec, ni más ni menos.
- Toda tabla nueva con datos de usuario debe tener políticas RLS definidas en la misma migración — nunca crear tabla sin RLS.
- Las migraciones deben ser reversibles cuando sea posible (incluir `-- rollback` comentado).
- Usar nombres de tabla en snake_case, plural.
- Usar nombres de columna en snake_case.
- Nunca eliminar columnas en producción sin una estrategia de deprecación documentada en la spec.
- Al terminar, indicar el comando exacto para regenerar los tipos TypeScript.
- Invocar `security-review` para verificar las políticas RLS antes de cerrar.

---

## Restricciones

- NO modificar la spec. Si la spec es ambigua en el modelo de datos, pausar y preguntar.
- NO implementar funcionalidades fuera del alcance de la spec.
- NO crear tablas sin políticas RLS (regla de seguridad no negociable en este proyecto).
- NO modificar `src/integrations/supabase/types.ts` manualmente.
- NO ejecutar migraciones destructivas (DROP TABLE, DROP COLUMN) sin que la spec lo especifique explícitamente y SECURITY-AGENT lo haya revisado.
- NO tomar decisiones de lógica de negocio — si el schema implica una decisión de negocio no especificada, pausar y escalar a SPEC-AGENT.

---

## Convenciones específicas que debe respetar

### Migraciones

- Naming: `<timestamp_supabase>_<descripcion_en_snake_case>.sql`
- Generadas con `supabase migration new <nombre>` cuando sea posible
- Incluir comentario al inicio explicando qué hace la migración
- RLS siempre en la misma migración que crea la tabla

### Políticas RLS estándar del proyecto

```sql
-- Usuarios ven solo sus propias filas
CREATE POLICY "users_own_rows" ON <tabla>
  FOR ALL USING (auth.uid() = user_id);

-- Admins ven todo
CREATE POLICY "admins_see_all" ON <tabla>
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

### Tablas con acceso anónimo (patrón del proyecto)

`referral_clicks` y `solicitudes_afiliado` permiten INSERT anónimo. Seguir este patrón para cualquier tabla similar que la spec requiera.

---

## Skills de apoyo que debe invocar

| Skill | Cuándo invocarla |
|---|---|
| `security-review` | Antes de cerrar cualquier migración — para verificar políticas RLS y ausencia de riesgos |

---

## Cómo interactúa con los agentes universales

- **SPEC-AGENT** redactó la spec con el modelo de datos. Este agente lo implementa como contrato.
- **REVIEW-AGENT** validará que el schema implementado coincide con lo especificado.
- **SECURITY-AGENT** verificará políticas RLS, ausencia de datos sensibles sin protección y correcta separación de permisos.

## Cómo interactúa con otros agentes de construcción

- **BACKEND-AGENT** consume el schema que este agente define. DB-AGENT documenta claramente en su reporte qué tablas y columnas creó para que BACKEND-AGENT las use correctamente.
- **FRONTEND-AGENT** usa los tipos generados — DB-AGENT siempre indica al final de su reporte el comando para regenerarlos.
- Si BACKEND-AGENT o FRONTEND-AGENT necesitan un campo o tabla que no existe, lo solicitan a DB-AGENT (no lo crean ellos mismos).

---

*Agente generado con BrianSpec v1.0 el 2026-06-03*
