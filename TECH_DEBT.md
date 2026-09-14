# Deuda técnica y pendientes — asistencia-api

Última actualización: 10 de septiembre, 2026 (revisión 3)

## ✅ Resuelto desde la última revisión

- **Bug real corregido**: `meRouter` montado sin prefijo de path interceptaba `401` en rutas completamente ajenas (`/subjects`, etc.) — ahora montado como `app.use("/teachers", meRouter)`.
- **Bug real corregido**: `attendanceRouter` dejó de montarse en `server.ts` durante una reescritura completa del archivo — todas las rutas de asistencia devolvían `404`. Vuelto a montar, y documentado como lección de proceso (ver `CONTEXT.md`, gotcha 12).
- **Endpoint nuevo**: `GET /courses/attendance-status` — agregado para alimentar el Dashboard del frontend, sin necesidad de N requests por curso.
- **Refactor de capas** (Controller + Repository) completado en `identity`/`academic`/`attendance`.
- **Bug real corregido, encontrado escribiendo tests**: `isPgUniqueViolation` (duplicado en 8 use-cases: `create-course`, `update-course`, `create-school-year`, `clone-courses`, `add-student`, `mark-course-non-instructional-day`, `save-daily-attendance`, `register-teacher`) chequeaba `error.code === "23505"` directo sobre el error, pero la versión instalada de `drizzle-orm` envuelve el error real de `pg` en `DrizzleQueryError.cause` — el chequeo nunca coincidía, y **toda violación real de unicidad devolvía 500 en vez del 409/`ConflictError` esperado**. Corregido en los 8 lugares para revisar también `error.cause`. Verificado con un test e2e real contra Postgres (no se detecta con mocks, que fabrican la forma del error).
- **Bug de aislamiento multi-tenant corregido, encontrado escribiendo tests e2e de `attendance`**: `saveDailyAttendance` (`save-daily-attendance.use-case.ts`) no validaba que cada `studentId` recibido en `records` perteneciera al curso de la URL. `findStudentsEligibility` filtra por `courseId`, así que un `studentId` de OTRO curso (propio o de otro docente) simplemente no aparecía en esa consulta y no disparaba ningún chequeo — el `insert` seguía adelante igual, sin FK que lo bloqueara (`attendance_records.student_id` referencia `students.id` en general, no una FK compuesta con `course_id`). Un docente podía registrar asistencia "exitosamente" (201) para un estudiante que no era suyo. Corregido a nivel de aplicación: se rechaza con `ValidationError` (400) si algún `studentId` no aparece en absoluto en el roster del curso, distinto del caso "pertenece pero está retirado". **La protección sigue siendo solo de aplicación, sin respaldo a nivel de esquema** — ver el ítem de decisión de modelado pendiente más abajo, junto al gap de NULL en cursos de encargado.

## 🔴 Funcionalidad crítica pendiente

- **Borrado automático tras suspensión de cuenta (30 días)**: sigue sin ningún job programado que lo ejecute. Sin cambios desde la revisión anterior.

## 🟠 Seguridad y autorización

Sin cambios desde la revisión anterior: `POST /school-years` sin control de rol, validación de materia vs. nivel solo en cliente, verificación de contraseña en `suspend-account` vía workaround (`signInEmail` como proxy), reactivar cuenta sin confirmación de contraseña, `trustedOrigins` de un solo origen.

## 🟡 Simplificaciones de dominio conocidas

Sin cambios desde la revisión anterior: `event_type` sin lógica de `COMPLETIVE`/`EXTRAORDINARY`, día ADP simplificado, sin FK entre `teacher_profiles.subjectId` y `academic.subjects`, `updateCourse`/`updateStudent` como reemplazo completo, `withdrawStudent` siempre con fecha de hoy, sistema de alertas y resumen anual sin backend.

- **Nuevo, encontrado escribiendo tests e2e**: la constraint `courses_user_year_grade_section_subject_uidx` (`userId, schoolYearId, grade, section, subjectId`) no protege cursos de encargado (`isHomeroom: true`, `subjectId` siempre `null`) — Postgres trata `NULL` como distinto de `NULL` en índices únicos por defecto, así que un docente puede crear el mismo curso de encargado (mismo grado/sección) dos veces sin que salte `ConflictError`. No corregido — requiere decidir si se agrega `NULLS NOT DISTINCT` al índice (Postgres 15+) o una columna sentinel en vez de `null`, que es una decisión de modelado, no un fix mecánico como el de `isPgUniqueViolation` arriba.
- **Nuevo, encontrado escribiendo tests e2e de `attendance`**: la protección contra que un `studentId` de otro curso se cuele en `POST /courses/:courseId/attendance/day` (ver bug corregido arriba, sección ✅ Resuelto) hoy vive **solo en `save-daily-attendance.use-case.ts`**, a nivel de aplicación. No hay respaldo a nivel de esquema: `attendance_records.student_id` es una FK simple a `students.id`, sin componer con `course_id`. Cualquier otro camino de escritura futuro a esa tabla (un script, una migración de datos, otro use-case que no pase por esta validación) podría reintroducir el mismo problema sin que Postgres lo impida. Antes de producción, decidir el approach de modelado (no es un fix mecánico): FK compuesta `(courseId, studentId)` contra un `unique(id, courseId)` agregado en `students`, un `CHECK`/trigger, o aceptar el riesgo y mantener la protección solo en la capa de aplicación.

## 🟣 Deuda de arquitectura (introducida por el refactor de capas)

- **`attendance` escribe directo en `academic.course_non_instructional_days`** (`attendance/infrastructure/db/course-non-instructional-days.repository.ts`): la tabla vive en el schema de `academic`, pero el caso de uso (marcar día no laborable de un curso) es una feature de `attendance`, igual que ya ocurría antes del refactor. Se mantuvo así deliberadamente — moverla a `academic` habría requerido una llamada cruzada de servicio a repositorio entre contextos, algo que no existe en ningún otro punto del código. Revisar si `academic` alguna vez necesita imponer sus propias reglas de negocio sobre esta tabla (hoy no las tiene); si eso pasa, es la señal para migrar la escritura al lado de `academic`.

## 🔵 Infraestructura / operación

Sin cambios desde la revisión anterior: Resend en modo sandbox, sin observabilidad, Terraform solo gestiona GitHub, sin imagen Docker de la API, credenciales de desarrollo local.
