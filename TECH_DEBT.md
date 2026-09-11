# Deuda técnica y pendientes — asistencia-api

Última actualización: 3 de septiembre, 2026 (revisión 2)

Este documento existe para no perder de vista decisiones deliberadas de alcance y huecos conocidos. Cada ítem indica **por qué** se dejó así, no solo que falta.

## ✅ Resuelto desde la última revisión

- **Módulo `attendance` construido completo**: `GET /courses/:courseId/attendance`, `POST .../attendance/day` (regla hoy-único, validada también server-side comparando con la fecha real del servidor, no solo confiando en el cliente), `POST .../non-instructional-days`.
- **Días no laborables a nivel de curso**: ya no es solo una tabla sin usar — tiene endpoint real y se combina con el calendario oficial global al calcular los días lectivos del mes.
- **Bloqueo de estudiantes retirados** ahora se valida **también en el backend** (antes solo era una restricción de la UI): `save-daily-attendance.use-case.ts` rechaza con `400` cualquier intento de registrar asistencia para un estudiante cuya `withdrawalDate` ya pasó.
- **Bug real corregido**: `listCourses` no filtraba por `active`, así que un curso "eliminado" (soft delete) seguía apareciendo en la lista indefinidamente.
- **Documentación de traspaso** (`CONTEXT.md`) creada, con arquitectura completa, modelo de dominio, y una sección de gotchas específicos de esta base de código.

## 🔴 Funcionalidad crítica pendiente

- **Borrado automático tras suspensión de cuenta (30 días)**: `scheduledDeletionAt` se calcula y se guarda correctamente, pero **nada lo ejecuta**. Requiere un job programado (cron / tarea agendada) que hoy no existe en la infraestructura.

## 🟠 Seguridad y autorización

- **`POST /school-years` no tiene control de rol**: cualquier docente autenticado puede crear/alterar el calendario global del sistema, porque no existe ningún concepto de "administrador" o "director".
- **Validación de materia vs. nivel educativo solo ocurre en el cliente**: nada impide, vía llamada directa a la API, crear un curso de nivel `PRIMARY` con una materia marcada como `SECONDARY`.
- **Verificación de contraseña en `suspend-account` es un workaround**: usa `auth.api.signInEmail` como proxy para validar la contraseña, no un endpoint dedicado.
- **Reactivar cuenta no pide confirmación de contraseña** (asimétrico respecto a suspender). Decisión consciente por ahora, pendiente de revisar.
- **CORS/`trustedOrigins` configurado para un solo origen** (`env.CORS_ORIGIN`).

## 🟡 Simplificaciones de dominio conocidas

- **`event_type` en `attendance_records`** existe (`REGULAR` por defecto) pero no hay lógica que use `COMPLETIVE`/`EXTRAORDINARY` todavía — decisión explícita de dejarlo fuera de esta pasada, la columna ya está lista para cuando se active.
- **Día ADP (13 de abril)** tratado como no lectivo para *toda* la escuela — en la realidad solo aplica a docentes afiliados al gremio. No existe campo de afiliación sindical en `teacher_profiles`.
- **FK entre `identity.teacher_profiles.subjectId` y `academic.subjects` no existe** — es un UUID suelto sin constraint, decisión deliberada para evitar dependencia circular entre bounded contexts.
- **`updateCourse`/`updateStudent` son reemplazo completo, no PATCH parcial**.
- **`withdrawStudent` siempre usa la fecha de hoy** — no acepta fecha de retiro retroactiva.
- **Sistema de alertas (2+ ausencias, 3+ tardanzas, riesgo de completiva, escalación CONANI)**: no existe ningún backend para esto — deferred explícitamente. Los indicadores visuales que sí existen (punto de "ausencias consecutivas", % de asistencia) se calculan **en el cliente**, sin necesidad de este sistema.
- **Resumen anual de asistencia**: no hay endpoint de agregación de 12 meses — no tiene sentido construirlo todavía con tan poca data real acumulada.

## 🔵 Infraestructura / operación

- **Resend en modo sandbox** — bloqueante antes de producción.
- **Sin tests automatizados** — cero unit tests, cero integration tests.
- **CI no levanta Postgres** — necesario si se agregan tests de integración.
- **Sin observabilidad** (OpenTelemetry) — deprioritizado desde el inicio.
- **Terraform solo gestiona GitHub** — infraestructura de AWS no ha empezado.
- **Sin imagen Docker de la API** — `docker-compose.yml` solo levanta Postgres local.
- **Credenciales de base de datos siguen siendo las de desarrollo local**.

## 🧹 Limpieza pendiente

- Bloque grande de código comentado en `server.ts` (rutas del spike original en español) — confirmar si sigue ahí y borrarlo.