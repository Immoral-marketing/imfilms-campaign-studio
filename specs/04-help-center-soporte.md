# SPEC-04: Centro de ayuda — Botón Contactar soporte

**Versión:** 1.0
**Estado:** aprobada
**Tipo de proyecto:** web-app
**Última actualización:** 2026-06-03
**Owner:** Gregory

---

## Descripción

El botón de "Contactar soporte" no funciona en el Centro de Ayuda. Esta spec añade un botón funcional que abre un formulario simple (nombre, email, mensaje) y envía el mensaje al equipo de admins via la Edge Function `send-email` existente.

## Criterios de aceptación

- [ ] CA-01: El Centro de Ayuda tiene un botón "Contactar soporte" visible
- [ ] CA-02: Al hacer clic se abre un formulario con campos: asunto y mensaje
- [ ] CA-03: Al enviar, el mensaje llega por email a los admins via Resend
- [ ] CA-04: El formulario muestra confirmación de éxito tras el envío
- [ ] CA-05: El formulario valida que los campos no estén vacíos antes de enviar
