# SPEC-01: Demo — Actualización de datos y montos

**Versión:** 1.0
**Estado:** aprobada
**Tipo de proyecto:** web-app
**Última actualización:** 2026-06-03
**Owner:** Gregory

---

## Descripción

La demo interactiva tiene fechas hardcodeadas de 2025 (ya pasadas) y montos de inversión desactualizados. Esta spec actualiza los datos para que la demo sea siempre relevante y comunique correctamente la estructura de precios actual.

## Cambios

1. **Fechas dinámicas** — calculadas relativamente a la fecha actual (siempre futuras)
2. **Montos actualizados** — Conversadora 8.000€, Estándar 15.000€, Agresiva 30.000€
3. **Paso 3** — Añadir rangos de fechas "Campaña completa" y "Entrega de report"
4. **Paso 4** — Eliminar las 3 cards informativas de colores del fondo

## Criterios de aceptación

- [ ] CA-01: Las fechas en paso 1 y paso 3 son siempre futuras respecto a la fecha actual
- [ ] CA-02: El escenario pequeño muestra 8.000€ con label "CONVERSADORA"
- [ ] CA-03: El escenario mediano muestra 15.000€ con label "ESTÁNDAR"
- [ ] CA-04: El escenario grande muestra 30.000€ con label "AGRESIVA"
- [ ] CA-05: Paso 3 incluye sección "Campaña completa" y "Entrega de report"
- [ ] CA-06: Las 3 cards azul/verde/morado del paso 4 han sido eliminadas
- [ ] CA-07: El paso 5 actualiza las referencias a la inversión conversadora a 8.000€
