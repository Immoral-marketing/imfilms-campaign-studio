# SPEC-03: Centro de ayuda — Sistema de gestión de vídeos

**Versión:** 1.0
**Estado:** aprobada
**Tipo de proyecto:** web-app
**Última actualización:** 2026-06-03
**Owner:** Gregory

---

## Descripción

La sección de vídeos del Centro de Ayuda está vacía con un placeholder. Esta spec implementa un sistema completo: los admins pueden añadir, editar y borrar vídeos via iframe desde el panel de administración, y los usuarios ven los vídeos reales en el Centro de Ayuda.

## Criterios de aceptación

- [ ] CA-01: Tabla `help_videos` creada en Supabase con RLS (lectura pública, escritura solo admins)
- [ ] CA-02: La tab Vídeos del Centro de Ayuda muestra los vídeos guardados como iframes embebidos
- [ ] CA-03: Si no hay vídeos, se muestra un mensaje apropiado (no el placeholder antiguo)
- [ ] CA-04: Los admins pueden añadir un vídeo (título, descripción, URL del iframe, orden)
- [ ] CA-05: Los admins pueden editar título, descripción y URL de un vídeo existente
- [ ] CA-06: Los admins pueden borrar un vídeo con confirmación previa
- [ ] CA-07: La gestión de vídeos está en el panel de admin (`/admin`)
