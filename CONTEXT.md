# asistencia-api — Documento de contexto para traspaso

Última actualización: 3 de septiembre, 2026

## Qué es este proyecto

Backend de "Registro de Grado Digital" — sistema de control de asistencia escolar para docentes de escuelas públicas dominicanas (MINERD). Multi-tenant: cada docente ve solo sus propios cursos y estudiantes, sin conocimiento de otros docentes.

**Historia relevante**: este proyecto empezó como un spike de una sola tabla de asistencia en español, con una sola sección hardcodeada. Se reescribió completamente (dominio en inglés, multi-tenant, arquitectura hexagonal/DDD-lite) a partir de un documento de especificación más amplio que el usuario compartió a mitad del desarrollo. **No hay código del spike original que sobreviva** — todo lo que existe hoy es la reescritura.

## Stack técnico

- **Node.js + TypeScript**, target ES2023, `module`/`moduleResolution: NodeNext`
- **Express 5** (no Express 4 — sintaxis de wildcards distinta, ver "Gotchas")
- **Drizzle ORM** sobre PostgreSQL, con **schemas de Postgres como namespace de bounded context**: `auth`, `identity`, `academic`, `attendance`
- **Better Auth** para autenticación completa (email/password, verificación, 2FA TOTP+backup codes, recuperación de contraseña, gestión de sesiones)
- **Resend** para envío de emails (modo sandbox actualmente — solo envía al correo de la cuenta propia)
- **Zod** para validación de entrada
- **Pino** + `pino-http` + `pino-pretty` (dev) para logging estructurado
- **Biome** como linter/formatter único (no ESLint)
- **Gitleaks** + **pre-commit** (framework Python) para escaneo de secretos
- **GitHub Actions** para CI (typecheck, lint/format, build, Gitleaks)
- **express-rate-limit** — limitador general + uno estricto en `/teachers/register`
- **Terraform** (repo separado `asistencia-infra`) gestiona el repo de GitHub y protección de ramas

## Arquitectura

Hexagonal / DDD-lite, organizado por **bounded contexts** que son literalmente schemas de Postgres:

```
src/
  contexts/
    identity/        → schema "auth" (Better Auth) + schema "identity" (teacher_profiles)
    academic/         → schema "academic"
    attendance/        → schema "attendance"
  shared/
    config/env.ts       → validación de entorno con Zod, falla rápido si falta algo
    db/client.ts          → conexión Drizzle
    logger/logger.ts        → pino
    errors/app-error.ts       → jerarquía de errores de dominio
    http/                      → respond.ts (formato estándar), validate.middleware.ts
    middleware/                  → require-auth, check-not-suspended, error-handler, not-found, rate-limit
  server.ts
```

Cada contexto sigue: `domain/` (vacío por ahora, no hubo necesidad de lógica de dominio pura separada) → `application/` (casos de uso + schemas Zod) → `infrastructure/` (schema de Drizzle, rutas HTTP, adaptadores externos como Better Auth).

## Formato de respuesta estándar (todas las rutas propias, NO las de Better Auth)

```ts
// Éxito
{ status: "success", data: T, message?: string, meta?: PaginationMeta }
// Error
{ status: "error", error: { code: string, message: string, details?: unknown } }
```

Los errores de negocio son excepciones tipadas (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `AccountSuspendedError` — todas extienden `AppError`), capturadas por `errorHandlerMiddleware` al final del pipeline. Express 5 reenvía automáticamente excepciones de handlers `async` al middleware de error — **no hace falta `try/catch` en las rutas ni un wrapper `asyncHandler`**.

**Importante**: las rutas de Better Auth (`/api/auth/*`) usan **su propio formato de respuesta**, no el envoltorio de arriba. El frontend usa el cliente oficial `better-auth/react` para esas, y un cliente HTTP propio para el resto.

## Modelo de dominio por contexto

### `auth` (gestionado 100% por Better Auth, nunca editado a mano)
`user`, `session`, `account`, `verification`, `two_factor`. El archivo `auth.schema.ts` se **regenera** con `npx auth generate` — nunca se edita directamente.

### `identity`
- `teacher_profiles`: `userId` (FK a `auth.user.id`, tipo `text` no `uuid`), `cedula`, `educationLevel` (PRIMARY/SECONDARY), `isHomeroomTeacher`, `subjectId` (UUID suelto, **sin FK real** a `academic.subjects` — deliberado, para evitar dependencia circular entre contexts), `suspendedAt`, `scheduledDeletionAt`.

### `academic`
- `subjects` (catálogo de materias)
- `school_years` (año escolar, con validación de solapamiento de fechas al crear)
- `official_non_instructional_days` (calendario oficial MINERD, global por año escolar)
- `courses` (pertenece a un `userId`, referencia `schoolYearId` + `subjectId` opcional)
- `course_non_instructional_days` (calendario ad-hoc por curso — "hoy no hubo clase por tormenta")
- `students` (pertenece a `courseId`, `orderNumber` único por curso, `active`/`withdrawalDate` para retiro)

### `attendance`
- `attendance_statuses` (catálogo: P/T/A/E)
- `excuse_reasons` (catálogo, no usado activamente en lógica todavía)
- `attendance_records` (studentId + courseId + date + eventType [default 'REGULAR', columna lista para Completiva/Extraordinaria pero sin lógica que la use aún] + statusCode)

## Reglas de negocio clave (RN)

- **Número de orden del estudiante**: asignado alfabéticamente en la carga inicial; un estudiante nuevo a mitad de año siempre va al final (`MAX(order_number)+1`), nunca se renumera. Implementado con reintento ante condición de carrera (`23505` de Postgres como última defensa).
- **`assertCourseOwnership`**: si un curso no existe O no es del usuario, devuelve **404 en ambos casos** — nunca 403 — para no filtrar la existencia de cursos ajenos por enumeración.
- **Asistencia**: solo se puede registrar la fecha de **hoy**, una sola vez (`409` en reintento, validado también server-side comparando con la fecha real del servidor, no solo confiando en el cliente).
- **Estudiante retirado**: nunca puede recibir asistencia en fechas ≥ su `withdrawalDate`, validado server-side (no solo en la UI).
- **Calendario de días lectivos** = unión de `official_non_instructional_days` (global) + `course_non_instructional_days` (ad-hoc del curso específico).
- **Suspensión de cuenta**: pide confirmación de contraseña (verificada reutilizando `auth.api.signInEmail` como proxy, sin crear sesión real), cierra todas las sesiones (`auth.api.revokeSessions`), guarda `scheduledDeletionAt` (+30 días) — **pero no hay ningún job que ejecute el borrado real**, es deuda técnica pendiente.
- **Reactivación de cuenta**: no pide contraseña (asimétrico respecto a suspender, decisión consciente pendiente de revisión).

## Endpoints existentes

```
POST   /teachers/register                                  (público, transacción compensatoria Better Auth + teacher_profiles)
GET    /teachers/me                                          (requiere sesión)
POST   /teachers/me/suspend                                    (requiere sesión + contraseña)
POST   /teachers/me/reactivate                                   (requiere sesión)

ALL    /api/auth/*splat                                            (Better Auth: login, 2FA, password reset, sessions, etc.)

GET    /subjects                                                     (público)
GET    /school-years                                                   (público)
POST   /school-years                                                     (requiere sesión — SIN control de rol, cualquier docente puede crear años escolares, deuda conocida)
POST   /courses                                                             (requiere sesión + no suspendida)
GET    /courses?schoolYearId=                                                 (ídem)
PATCH  /courses/:courseId                                                       (ídem)
DELETE /courses/:courseId                                                         (ídem, soft delete)
POST   /courses/clone                                                               (ídem)
POST   /courses/:courseId/students                                                    (ídem)
GET    /courses/:courseId/students                                                       (ídem)
PATCH  /courses/:courseId/students/:studentId                                              (ídem)
PATCH  /courses/:courseId/students/:studentId/withdraw                                       (ídem)
GET    /courses/:courseId/attendance?year=&month=                                              (ídem)
POST   /courses/:courseId/attendance/day                                                         (ídem)
POST   /courses/:courseId/non-instructional-days                                                   (ídem)
```

## ⚠️ Gotchas y lecciones aprendidas (leer antes de tocar código)

1. **`auth.config.ts` solo acepta imports relativos con extensión `.js`, nunca el alias `@/`.** El CLI de Better Auth (`npx auth generate`, y cualquier herramienta que lea este archivo con `jiti`) no entiende el alias de TypeScript — y el problema se propaga transitivamente a *cualquier archivo que `auth.config.ts` importe*, no solo al archivo mismo.
2. **Express 5 cambió la sintaxis de wildcards**: `/api/auth/*` ya no es válido, debe ser `/api/auth/*splat` (el wildcard necesita nombre).
3. **Better Auth renombra métodos entre versiones sin aviso previo evidente**: `forgetPassword` → `requestPasswordReset`; `deleteUser` es de autoservicio (borra al usuario autenticado actual), no sirve para borrar un usuario arbitrario por ID desde el servidor — para eso, usar `db.delete(user).where(...)` directo con Drizzle.
4. **Fechas de Postgres (`date`) llegan como objetos `Date` de JS por defecto vía `pg`**, con corrimiento de zona horaria. Solución aplicada consistentemente: castear `::text` explícito en el SQL (`gs::date::text`), no tocar el type parser global.
5. **`db.execute(sql\`...\`)` de Drizzle devuelve `{ rows }`**, no un array directo.
6. **TypeScript 7 deprecó `baseUrl`** — se removió de `tsconfig.json`, dejando solo `paths` (funciona sin `baseUrl` desde TS 4.1+).
7. **Orden de montaje de rutas en Express importa**: un router que aplica `router.use(requireAuth)` a mitad de su propia definición puede interceptar rutas públicas montadas *después* de él en `server.ts`, aunque sean paths distintos. Rutas públicas siempre antes.
8. **`tsc-alias` es necesario para el build de producción** — `tsc` con `NodeNext` no reescribe alias `@/` en el JS compilado; solo hace type-checking. `tsx` en desarrollo sí los resuelve (usa esbuild por debajo).
9. **Imports relativos bajo `NodeNext` requieren extensión `.js` explícita**, incluso en archivos `.ts` (TypeScript entiende que se refiere al `.js` compilado).
10. **Verificación de contraseña sin crear sesión**: no existe un endpoint dedicado en Better Auth para esto. Se usa `auth.api.signInEmail(...)` como proxy — funciona porque nunca se reenvía la respuesta/cookie al cliente real, así que no tiene efecto secundario visible.

## Cómo correr localmente

```bash
npm install
cp .env.example .env   # completar DATABASE_URL, BETTER_AUTH_URL, RESEND_API_KEY, CORS_ORIGIN
docker compose up -d
npm run db:migrate
npm run seed            # catálogos + calendario oficial (sin argumento) — con teacherUserId agrega curso+estudiantes de prueba
pre-commit install
npm run dev
```

## Deuda técnica y funcionalidad pendiente

Ver `TECH_DEBT.md` en la raíz del repo — cubre en detalle: módulo de días no laborables ad-hoc (ya resuelto, ver arriba), borrado automático tras 30 días de suspensión (no implementado), validación de rol/admin ausente, tests (cero), infraestructura AWS (no empezada), y más.
