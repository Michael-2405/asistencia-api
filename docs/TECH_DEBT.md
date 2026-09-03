# Deuda técnica y pendientes — asistencia-api

Última actualización: 3 de septiembre, 2026

Este documento existe para no perder de vista decisiones deliberadas de alcance y huecos conocidos. Cada ítem indica **por qué** se dejó así, no solo que falta.

## 🔴 Funcionalidad crítica pendiente

- **Módulo `attendance` (core de asistencia diaria)**: el schema (`attendance_records`, `attendance_statuses`, `excuse_reasons`) existe y está sembrado, pero no hay ni un solo caso de uso ni endpoint construido todavía. Es el siguiente bloque de trabajo.
- **Días no laborables a nivel de curso** (`course_non_instructional_days`): la tabla existe desde el diseño original, pero nunca se construyó el endpoint para que un docente marque "hoy no hubo clase" en su curso específico (el caso "tormenta", "emergencia"). Sí existe el calendario oficial global (`official_non_instructional_days`), pero no el ad-hoc por curso.
- **Borrado automático tras suspensión de cuenta (30 días)**: `scheduledDeletionAt` se calcula y se guarda correctamente, pero **nada lo ejecuta**. Requiere un job programado (cron / tarea agendada) que hoy no existe en la infraestructura. Sin esto, una cuenta suspendida queda suspendida indefinidamente hasta que alguien la reactive o se implemente el job.

## 🟠 Seguridad y autorización

- **`POST /school-years` no tiene control de rol**: cualquier docente autenticado puede crear/alterar el calendario global del sistema, porque no existe ningún concepto de "administrador" o "director". Es el primer candidato a restringir cuando exista un sistema de roles.
- **Validación de materia vs. nivel educativo solo ocurre en el cliente**: nada impide, vía llamada directa a la API, crear un curso de nivel `PRIMARY` con una materia marcada como `SECONDARY` — el filtro de opciones es solo del frontend, el backend no lo revalida.
- **Verificación de contraseña en `suspend-account` es un workaround**: usa `auth.api.signInEmail` como proxy para validar la contraseña (no existe un endpoint dedicado de "verificar contraseña sin iniciar sesión" en Better Auth). Funciona, pero es una solución indirecta.
- **Reactivar cuenta no pide confirmación de contraseña** (asimétrico respecto a suspender, que sí la pide). Decisión consciente por ahora, pendiente de revisar.
- **CORS/`trustedOrigins` configurado para un solo origen** (`env.CORS_ORIGIN`) — no está listo para múltiples dominios/frontends si el proyecto crece en esa dirección.

## 🟡 Simplificaciones de dominio conocidas

- **Día ADP (13 de abril)** tratado como no lectivo para *toda* la escuela — en la realidad solo aplica a docentes afiliados al gremio. No existe campo de afiliación sindical en `teacher_profiles`.
- **FK entre `identity.teacher_profiles.subjectId` y `academic.subjects` no existe** — es un UUID suelto sin constraint, decisión deliberada para evitar dependencia circular entre bounded contexts. Revisar cuando ambos contextos se integren más.
- **`updateCourse`/`updateStudent` son reemplazo completo, no PATCH parcial** — el frontend siempre debe enviar todos los campos editables, no solo los que cambiaron.
- **`withdrawStudent` siempre usa la fecha de hoy** — no acepta fecha de retiro retroactiva, aunque el mockup original lo sugería.

## 🔵 Infraestructura / operación

- **Resend en modo sandbox** — el remitente (`onboarding@resend.dev`) solo puede enviar a la cuenta propia hasta verificar un dominio real. Bloqueante antes de producción.
- **Sin tests automatizados** — cero unit tests, cero integration tests, en todo el proyecto.
- **CI no levanta Postgres** — si se agregan tests de integración que toquen la base de datos, hay que sumar un `services: postgres` al workflow de GitHub Actions.
- **Sin observabilidad** (OpenTelemetry) — deprioritizado desde el inicio, no es un olvido.
- **Terraform solo gestiona GitHub** (repos, protección de ramas) — la infraestructura de AWS (ECS, RDS, etc.) no se ha empezado.
- **Sin imagen Docker de la API** — el `docker-compose.yml` actual solo levanta Postgres local, no construye/corre la app.
- **Credenciales de base de datos siguen siendo las de desarrollo local** (`asistencia`/`asistencia`) — falta gestión de secretos real para producción.

## 🧹 Limpieza pendiente

- Bloque grande de código comentado en `server.ts` (rutas del spike original en español) — funcionalmente inerte, pero ensucia el archivo. Candidato a borrar por completo.
