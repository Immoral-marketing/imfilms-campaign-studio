# SPEC-05: Panel usuario — "Recomienda y gana" + mini landing afiliados

**Versión:** 1.0
**Estado:** aprobada
**Tipo de proyecto:** web-app
**Última actualización:** 2026-06-03
**Owner:** Gregory

---

## Descripción

Añadir al dropdown de usuario en la navbar una opción "Recomienda y gana" con icono de dinero, y crear una mini landing page en `/recomienda` que invite a los usuarios a unirse al programa de afiliados. Estándar visual Awwwards.

## Criterios de aceptación

- [ ] CA-01: El dropdown de usuario en NavbarAdmin tiene la opción "Recomienda y gana" con icono DollarSign
- [ ] CA-02: La opción navega a `/recomienda`
- [ ] CA-03: Existe la página `/recomienda` con diseño premium (nivel Awwwards)
- [ ] CA-04: La landing explica el programa de afiliados: cómo funciona, cuánto se gana, CTA para unirse
- [ ] CA-05: El CTA de la landing lleva a `/afiliado` (portal de afiliado existente)
- [ ] CA-06: La ruta `/recomienda` está registrada en App.tsx
