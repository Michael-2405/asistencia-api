# Checklist de pruebas de regresión — antes de seguir agregando funcionalidad

Última actualización: 3 de septiembre, 2026

Objetivo: confirmar que todo lo construido hasta ahora (Auth, Academic, Attendance) funciona de punta a punta con datos reales, antes de empezar el siguiente bloque de trabajo. Marca cada casilla a medida que confirmes.

## Preparación

- [ ] Base de datos reiniciada limpia:
  ```bash
  cd asistencia-api
  docker compose down -v
  docker compose up -d
  npm run db:migrate
  npm run seed
  ```
- [ ] `asistencia-api` corriendo (`npm run dev`)
- [ ] `asistencia-web` corriendo (`npm run dev`)
- [ ] Navegador de prueba: preferir **Chrome** sobre Brave para esta ronda — Brave puede bloquear la cookie de sesión entre `localhost:5173`/`localhost:3000` con Shields activo, dando falsos negativos que parecen bugs de sesión sin serlo.

---

## Módulo Identity (Auth)

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1 | Registro | `/register`, completar wizard (2 pasos) con datos reales | `201`, redirige a `/verify-email` |
| 2 | Registro — correo duplicado | Repetir con el mismo email | `409 CONFLICT`, mensaje visible en el campo correo |
| 3 | Registro — cédula duplicada | Mismo cédula, correo distinto | `409 CONFLICT` en el campo cédula |
| 4 | Verificación de email | Revisar bandeja (Resend solo entrega a tu propio correo en modo sandbox), clic en el link | Redirige a `/login`, `email_verified=true` en `auth.user` |
| 5 | Login sin verificar | Intentar login con cuenta sin verificar | Mensaje de error, no entra |
| 6 | Login correcto | Con cuenta ya verificada | Sesión creada, llega a `/courses` |
| 7 | Activar 2FA | Perfil → Seguridad → Activar | Pide contraseña, muestra QR real, código válido lo activa, backup codes visibles y descargables |
| 8 | Login con 2FA | Cerrar sesión, login de nuevo | Pide código TOTP antes de entrar |
| 9 | Login con código de recuperación | En el paso 2FA, alternar a "usar código de recuperación" | Acepta un backup code válido de los 8 generados |
| 10 | Desactivar 2FA | Perfil → Seguridad → Desactivar | Pide contraseña, desactiva correctamente |
| 11 | Recuperar contraseña | `/forgot-password` → revisar correo → `/reset-password` | Nueva contraseña funciona en el siguiente login |
| 12 | Cambiar contraseña (logueado) | Perfil → Cuenta → Cambiar contraseña | Pide actual + nueva, revoca otras sesiones activas |
| 13 | Cambiar correo | Perfil → Cuenta → Cambiar correo | Envía confirmación al correo nuevo |
| 14 | Últimos accesos | Perfil → Seguridad | Lista sesiones reales con fecha; "cerrar sesión" individual la elimina de la lista |
| 15 | Suspender cuenta | Perfil → Zona de peligro → Suspender (con contraseña) | Cierra sesión inmediatamente, redirige a `/login` |
| 16 | Bloqueo mientras suspendida | Login de nuevo con esa cuenta, intentar navegar a `/courses` | Redirige a `/account-suspended` (no pantalla en blanco) |
| 17 | Reactivar cuenta | Desde `/account-suspended`, botón Reactivar | Vuelve a `/courses`, `suspendedAt` queda `null` en BD |

---

## Módulo Academic (Cursos / Estudiantes)

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 18 | Crear curso — encargado | `/courses` → Nuevo Curso → Primario, encargado | `201`, sin materia asociada |
| 19 | Crear curso — área | Primario o Secundario, no encargado + materia real | `201`, con `subjectId` correcto |
| 20 | Curso duplicado | Repetir mismo grado+sección+materia | Aviso visual antes de enviar, y `409` si se fuerza el envío |
| 21 | Editar curso | Menú "⋯" → Editar, cambiar sección | `PATCH` refleja el cambio en la tarjeta |
| 22 | Eliminar curso | Menú "⋯" → Eliminar | Desaparece de la lista de inmediato (confirmar que **no** reaparece al recargar — regresión ya corregida) |
| 23 | Clonar cursos | Crear un 2do año escolar (`curl` o pendiente de UI), clonar desde el primero | Cursos nuevos creados en el año destino; los que ya existen se omiten con "Ya existe" |
| 24 | Agregar estudiante | Dentro de un curso, agregar 3-4 estudiantes | `numero_orden` correlativo, sin huecos ni duplicados |
| 25 | Editar estudiante | Lista de estudiantes → Editar | `PATCH` sin alterar `orderNumber` |
| 26 | Retirar estudiante | Lista → Registrar retiro | Queda inactivo, sigue visible en la lista con badge "Retirado" |

---

## Módulo Attendance

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 27 | Cargar mes actual | Curso → "Pasar lista" | Columna de hoy con `Select`, resto con candado (pasado/futuro) |
| 28 | Guardar asistencia de hoy | Marcar estados variados, Guardar | `201`, columna de hoy pasa a solo lectura, botón desaparece |
| 29 | Reintentar guardar el mismo día | Repetir el `POST` (vía `curl`, ver comando abajo) | `409 CONFLICT` |
| 30 | Guardar con fecha ≠ hoy | `curl` forzando una fecha distinta | `400 VALIDATION_ERROR` |
| 31 | Marcar día no laborable | Botón del modal, elegir un día futuro del mismo mes | Esa columna pasa a bloqueada con ícono 🚫 |
| 32 | Estudiante retirado en la grilla | Curso con un retiro reciente (caso #26) | Aparece tachado, con ícono de bloqueo en vez de `Select`, incluso en la columna de hoy |
| 33 | Bypass de estudiante retirado | `curl` incluyendo su `studentId` en el body (ver comando abajo) | `400`, rechazado explícitamente por el backend |
| 34 | Navegación de mes | Selector del header, ir a un mes anterior | Carga ese mes, todo bloqueado (ningún día es "hoy" ahí) |
| 35 | Indicador de ausencias consecutivas | Simula 2 ausencias seguidas para un estudiante (dos días distintos) | Punto amarillo aparece junto al nombre |
| 36 | % de asistencia | Con historial mixto de varios días | Calculado correctamente, color rojo/ámbar/verde según el umbral (80/90) |

### Comandos `curl` de apoyo para los casos 29, 30, 33

```bash
# Necesitas la cookie de sesión — primero haz login guardándola:
curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email": "TU_CORREO", "password": "TU_PASSWORD"}' \
  -c cookies.txt

# Caso 29: reintentar el mismo día (reemplaza COURSE_ID y STUDENT_ID)
curl -s -X POST http://localhost:3000/courses/COURSE_ID/attendance/day \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"date": "2026-09-03", "records": [{"studentId": "STUDENT_ID", "status": "P"}]}'

# Caso 30: fecha distinta a hoy
curl -s -X POST http://localhost:3000/courses/COURSE_ID/attendance/day \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"date": "2026-08-15", "records": [{"studentId": "STUDENT_ID", "status": "P"}]}'

# Caso 33: incluir un estudiante retirado (usa el ID del que retiraste en el caso 26)
curl -s -X POST http://localhost:3000/courses/COURSE_ID/attendance/day \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"date": "2026-09-03", "records": [{"studentId": "WITHDRAWN_STUDENT_ID", "status": "P"}]}'
```

---

## Al terminar

Si todos los casos pasan: mergea `test/qa-regression` a `develop` en ambos repos y retoma el desarrollo de nueva funcionalidad con confianza.

Si algo falla: **no lo arregles a medias intentando seguir la lista** — anota el número de caso, el comportamiento real vs. esperado, y resuélvelo antes de continuar con el resto. Un bug real encontrado aquí vale más que terminar rápido la lista.
