# asistencia-api — Documento de contexto para traspaso

Última actualización: 10 de septiembre, 2026 (revisión 2)

## Qué es este proyecto

Backend de "Cuaderno Digital" — sistema de control de asistencia y (futuro) calificaciones para docentes de escuelas dominicanas. Multi-tenant: cada docente ve solo sus propios cursos y estudiantes.

**Historia relevante**: reescritura completa desde un spike de una sola tabla en español, a dominio en inglés, multi-tenant, arquitectura hexagonal/DDD-lite. Sin código del spike original sobreviviendo.

## Stack técnico

Sin cambios respecto a la revisión anterior: **Node.js + TypeScript**, **Express 5**, **Drizzle ORM** sobre PostgreSQL (schemas `auth`/`identity`/`academic`/`attendance`), **Better Auth**, **Resend**, **Zod**, **Pino**, **Biome**, **Gitleaks + pre-commit**, **GitHub Actions**, **express-rate-limit**, **Terraform** (repo `asistencia-infra`).

## Arquitectura

Sin cambios de fondo — hexagonal/DDD-lite por bounded context, cada uno con su propio schema de Postgres. Ver revisión anterior de este documento para el árbol de carpetas completo (no cambió en esta revisión).

## Modelo de dominio por contexto

Sin cambios de schema en esta revisión — ver revisión anterior para el detalle completo de `auth`/`identity`/`academic`/`attendance`.

## Reglas de negocio clave (RN)

Sin cambios respecto a la revisión anterior. **Reconfirmado explícitamente** durante el refactor visual del frontend: la regla de "solo se puede registrar la asistencia de hoy, una vez" se mantiene — un mockup de diseño nuevo sugería permitir edición de cualquier día pasado, y se decidió **no** adoptarlo, manteniendo la validación server-side existente sin cambios.

## Endpoints existentes — uno nuevo desde la última revisión

```
POST   /teachers/register
GET    /teachers/me
POST   /teachers/me/suspend
POST   /teachers/me/reactivate

ALL    /api/auth/*splat

GET    /subjects
GET    /school-years
POST   /school-years
POST   /courses
GET    /courses?schoolYearId=
PATCH  /courses/:courseId
DELETE /courses/:courseId
POST   /courses/clone
POST   /courses/:courseId/students
GET    /courses/:courseId/students
PATCH  /courses/:courseId/students/:studentId
PATCH  /courses/:courseId/students/:studentId/withdraw
GET    /courses/:courseId/attendance?year=&month=
POST   /courses/:courseId/attendance/day
POST   /courses/:courseId/non-instructional-days
GET    /courses/attendance-status                          ← NUEVO
```

**`GET /courses/attendance-status`** (contexto `attendance`, `get-today-attendance-status.use-case.ts`): devuelve, para todos los cursos activos del docente autenticado, si ya se registró asistencia hoy (`{ courseId, submitted: boolean }[]`). Una sola query SQL con `EXISTS` por fila — evita N+1. Construido específicamente para alimentar el Dashboard del frontend (tarjetas "Registrada ✓ / Pendiente ⚠").

## ⚠️ Gotchas y lecciones aprendidas — dos nuevas desde la última revisión

Además de las 10 ya documentadas (ver revisión anterior: imports relativos en `auth.config.ts`, wildcards de Express 5, métodos renombrados de Better Auth, fechas de Postgres, `db.execute` devuelve `{ rows }`, `baseUrl` deprecado, orden de rutas, `tsc-alias`, extensión `.js` en imports, verificación de contraseña sin sesión):

11. **Un router montado con `app.use(router)` sin prefijo de path, que a su vez tiene `router.use(requireAuth)` sin path dentro, intercepta el tráfico de *toda* la aplicación, no solo sus propias rutas.** Causó que `meRouter` (rutas `/teachers/me`, `/teachers/me/suspend`, etc.) bloqueara con `401` cualquier request a rutas completamente ajenas como `/subjects`, porque Express evalúa el `.use(requireAuth)` interno **antes** de comparar si el path coincide con alguna ruta definida dentro de ese router. Arreglo: montar siempre con prefijo explícito — `app.use("/teachers", meRouter)`, con las rutas internas del router ajustadas a `/me`, `/me/suspend`, etc. (sin repetir `/teachers`).
12. **Reescribir un archivo central completo (`server.ts`) en vez de dar un diff puntual arriesga perder piezas que no estaban a la vista en el momento de la reescritura.** Al reescribir `server.ts` completo para el fix del punto 11, se perdió por completo el montaje de `attendanceRouter` — no estaba mal montado, simplemente dejó de estar en el archivo. El síntoma (`404` en todas las rutas de `/courses/:id/attendance` y `/courses/attendance-status`) tardó varios mensajes en diagnosticarse porque no era evidente que la causa fuera "un router entero ausente" en vez de un problema de lógica interna de esas rutas. **Recomendación permanente**: para `server.ts` y otros archivos que acumulan piezas con el tiempo, preferir diffs puntuales ("agrega esta línea después de X") sobre reescrituras completas del archivo.

## Cómo correr localmente

Sin cambios — ver revisión anterior.

## Deuda técnica y funcionalidad pendiente

Ver `TECH_DEBT.md`.
