# Deuda técnica y pendientes — asistencia-api

Última actualización: 10 de septiembre, 2026 (revisión 3)

## ✅ Resuelto desde la última revisión

- **Bug real corregido**: `meRouter` montado sin prefijo de path interceptaba `401` en rutas completamente ajenas (`/subjects`, etc.) — ahora montado como `app.use("/teachers", meRouter)`.
- **Bug real corregido**: `attendanceRouter` dejó de montarse en `server.ts` durante una reescritura completa del archivo — todas las rutas de asistencia devolvían `404`. Vuelto a montar, y documentado como lección de proceso (ver `CONTEXT.md`, gotcha 12).
- **Endpoint nuevo**: `GET /courses/attendance-status` — agregado para alimentar el Dashboard del frontend, sin necesidad de N requests por curso.

## 🔴 Funcionalidad crítica pendiente

- **Borrado automático tras suspensión de cuenta (30 días)**: sigue sin ningún job programado que lo ejecute. Sin cambios desde la revisión anterior.

## 🟠 Seguridad y autorización

Sin cambios desde la revisión anterior: `POST /school-years` sin control de rol, validación de materia vs. nivel solo en cliente, verificación de contraseña en `suspend-account` vía workaround (`signInEmail` como proxy), reactivar cuenta sin confirmación de contraseña, `trustedOrigins` de un solo origen.

## 🟡 Simplificaciones de dominio conocidas

Sin cambios desde la revisión anterior: `event_type` sin lógica de `COMPLETIVE`/`EXTRAORDINARY`, día ADP simplificado, sin FK entre `teacher_profiles.subjectId` y `academic.subjects`, `updateCourse`/`updateStudent` como reemplazo completo, `withdrawStudent` siempre con fecha de hoy, sistema de alertas y resumen anual sin backend.

## 🔵 Infraestructura / operación

Sin cambios desde la revisión anterior: Resend en modo sandbox, sin tests, CI sin Postgres, sin observabilidad, Terraform solo gestiona GitHub, sin imagen Docker de la API, credenciales de desarrollo local.

## 🧹 Limpieza pendiente

- Bloque de código comentado en `server.ts` (rutas del spike original en español) — confirmar si sigue ahí y borrarlo. **Nota de esta revisión**: dado que `server.ts` ya demostró ser un archivo frágil ante reescrituras completas (ver gotcha 12 en `CONTEXT.md`), cualquier limpieza futura de este archivo debe hacerse por diffs quirúrgicos, revisando con cuidado que ningún router montado se pierda en el proceso.
