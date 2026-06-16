# BrianSpec — Cheat-sheet del equipo

Guía rápida para trabajar en este proyecto con BrianSpec. Si es tu primer día con el sistema, léela entera una vez (5 minutos). Después, tenla a mano.

---

## El ciclo en una frase

> **La spec es el contrato. La IA lo ejecuta. La revisión valida que se cumple. Un humano aprueba.**

```
brianspec-spec     →   brianspec-build    →   [revisión humana]   →   brianspec-archive
(redacta el qué)       (implementa + revisa)    (apruebas y mergeas)     (cierra y archiva)
```

---

## Los 4 comandos

| Skill | Para qué | Cuándo la invocas |
|---|---|---|
| `brianspec-init` | Arranca un proyecto nuevo con BrianSpec | Una vez, al empezar el proyecto |
| `brianspec-spec` | Convierte una idea/transcripción en una spec verificable | Antes de construir cualquier cosa nueva |
| `brianspec-build` | Implementa una spec **aprobada** y la auto-revisa (CA + seguridad) | Cuando la spec está en estado `aprobada` |
| `brianspec-archive` | Cierra la spec, la archiva y actualiza el CHANGELOG | Cuando el PR está mergeado y un humano lo aprobó |

Invócalas en lenguaje natural ("hazme una spec de…", "implementa la spec 03", "archiva la spec 03") o por su nombre.

---

## Reglas de oro (los 11 principios, resumidos)

1. **No se construye sin spec aprobada** (P1). Si te piden "hazlo rápido sin spec", redirige a `brianspec-spec`.
2. **Ante la duda, pregunta con opciones** — no inventes (P2).
3. **El sistema es agnóstico al stack** (P3). El stack lo declara `PROJECT-CONSTITUTION.md`.
4. **Un agente, una responsabilidad** (P4). Quien redacta no implementa; quien implementa no se autoaprueba.
5. **Revisión humana obligatoria** (P5). Los agentes son la primera línea, no la última.
6. **Se verifica CA por CA** (P6). Un CA en ❌ bloquea el merge. Sin excepciones.
7. **Trazabilidad total** (P7). Cada commit referencia su spec; las specs no se borran, se archivan.
8. **Acelera, no frena** (P8). Si una práctica añade fricción sin valor, se cuestiona.
9. **Tests donde aportan valor**, no por ritual (P9).
10. **Specs en español, nombres de skill en inglés** (P10).
11. **Adaptable a tu copiloto** (P11): Claude Code, Codex, Gemini, Cursor.

---

## ¿Necesito una spec para esto?

**SÍ requiere spec** si el cambio:
- Afecta al usuario final o introduce comportamiento nuevo
- Modifica el modelo de datos
- Toca autenticación, autorización o datos sensibles

**NO requiere spec:**
- Hotfixes evidentes (typos, null checks, fix de regresión menor)
- Refactors internos sin cambio funcional
- Cambios de copy sin cambio de comportamiento

(Lo definitivo está en la sección 10 de `PROJECT-CONSTITUTION.md`.)

---

## Cómo escribir un buen criterio de aceptación

Un CA debe poder responderse con **sí/no, sin interpretación**.

- ❌ Mal: "El dashboard funciona bien."
- ✅ Bien: "Dado un usuario autenticado, al abrir `/dashboard` ve sus últimos 10 pedidos ordenados por fecha descendente en menos de 2 segundos."

Si un CA necesita "y" o "además" para describirse, divídelo en dos.

---

## Skills de apoyo (no reinventes la rueda)

BrianSpec **orquesta** skills especializadas; no reimplementa su conocimiento. Las que aplican a este proyecto están listadas en `PROJECT-CONSTITUTION.md` (sección 3). Típicas en web-app:

- **Diseño:** `frontend-design` (criterio de alto nivel), `impeccable` (pulido visual), `emil-design-eng` (micro-interacciones).
- **Stack:** `nextjs-app-router-patterns`, `tailwind-v4-shadcn`, `supabase`, `supabase-postgres-best-practices`, `angular-best-practices-primeng`, `remotion-best-practices` (según lo que use el proyecto).
- **Calidad:** `code-review`, `security-review`, `verify`, `run`.

Si una skill no está instalada: `npx skills add <origen>`. Para restaurar las del proyecto: `npx skills experimental_install` (lee `skills-lock.json`).

---

## Estados de una spec

```
draft  →  aprobada  →  implementada (archivada)
```

- `draft`: en redacción/clarificación. No se implementa.
- `aprobada`: un humano dijo "adelante". Lista para `brianspec-build`.
- `implementada`: construida, revisada, mergeada y archivada en `/specs/archive/`.

---

## Errores típicos a evitar

- Empezar a codear "mientras tanto" sin spec aprobada → rompe P1.
- Aprobar tu propia implementación sin revisión humana → rompe P5.
- Meter en la implementación cosas que no están en la spec ("ya que estoy…") → overengineering, lo caza REVIEW-AGENT.
- Cambiar la spec en caliente durante el build → para y vuelve a `brianspec-spec`.
- Reciclar números de spec → nunca; los huecos son aceptables (P7).

---

## Dónde mirar

| Quiero saber… | Archivo |
|---|---|
| Los principios del sistema | `BRIANSPEC-CONSTITUTION.md` |
| Stack, convenciones y skills de este proyecto | `PROJECT-CONSTITUTION.md` |
| Qué hacen los agentes universales | `.brianspec/agents.md` |
| Los agentes de construcción de este proyecto | `/agents/` |
| Checklists de seguridad | `.brianspec/security-checklists.md` |
| Specs activas / archivadas | `/specs/` y `/specs/archive/` |

---

*BrianSpec — Sistema de Spec-Driven Development de Immoral Group.*
