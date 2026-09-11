# Cuaderno Digital — API

Backend del sistema de control de asistencia y calificaciones para docentes. Multi-tenant: cada docente gestiona sus propios cursos, estudiantes y calendario, sin visibilidad sobre los de otros docentes.

## Stack técnico

- **Node.js** + **TypeScript**
- **Express** como framework HTTP
- **Drizzle ORM** sobre PostgreSQL, con schemas separados por bounded context (`auth`, `identity`, `academic`, `attendance`)
- **Better Auth** para autenticación (email/contraseña, verificación de correo, 2FA, gestión de sesiones)
- **Zod** para validación de entrada
- **Pino** (+ `pino-http`, `pino-pretty` en desarrollo) para logging estructurado
- **Biome** como linter y formatter
- **Gitleaks** + **pre-commit** para prevenir fugas de secretos antes de cada commit
- **GitHub Actions** para CI (lint, typecheck, build, escaneo de secretos)

## Arquitectura

Hexagonal / DDD-lite, organizado por **contextos delimitados** (bounded contexts), cada uno con su propio schema de PostgreSQL:
```
src/
contexts/
identity/ # Perfil de docente (autenticación vive en Better Auth, schema "auth")
academic/ # Materias, año escolar, calendario oficial, cursos, estudiantes
attendance/ # Registro de asistencia diaria
shared/
config/ # Validación de variables de entorno (Zod)
db/ # Cliente de Drizzle
logger/ # Configuración de Pino
```

Cada contexto sigue el mismo patrón interno: `domain/` (reglas de negocio), `application/` (casos de uso, validación con Zod), `infrastructure/` (schema de base de datos, rutas HTTP, adaptadores externos).

## Requisitos previos

- Node.js 20+
- Docker (para PostgreSQL local)
- `pre-commit` instalado (`pipx install pre-commit`) y [Gitleaks](https://github.com/gitleaks/gitleaks) en tu PATH

## Configuración

1. Instala las dependencias:

```bash
npm install
```

2. Copia las variables de entorno de ejemplo:

```bash
cp .env.example .env
```

3. Levanta PostgreSQL local:

```bash
docker compose up -d
```

4. Aplica las migraciones:

```bash
npm run db:migrate
```

5. Siembra los catálogos y el calendario oficial:

```bash
npm run seed
```

6. Instala los git hooks:

```bash
pre-commit install
```

7. Levanta el servidor de desarrollo:

```bash
npm run dev
```

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Levanta el servidor con recarga automática |
| `npm run build` | Compila TypeScript y reescribe los alias de import |
| `npm run start` | Corre la build de producción |
| `npm run typecheck` | Verifica tipos sin emitir archivos |
| `npm run lint` / `npm run format` | Biome por separado |
| `npm run check` / `npm run check:write` | Biome check, con o sin auto-fix |
| `npm run ci` | Verificación estricta para integración continua |
| `npm run db:generate` | Genera una migración de Drizzle a partir de cambios en el schema |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:studio` | Abre Drizzle Studio para explorar la base de datos |
| `npm run seed` | Siembra catálogos, calendario, y opcionalmente un curso de prueba (`-- <teacherUserId>`) |

## Flujo de ramas

`main` (producción) ← `develop` (integración) ← `feature/*` / `fix/*`. Cambios vía Pull Request, con CI y escaneo de secretos obligatorios antes de mergear.

## Documentación adicional

- `CONTEXT.md` — arquitectura completa, modelo de dominio, gotchas conocidos.
- `TECH_DEBT.md` — deuda técnica y funcionalidad pendiente, priorizada.

## Estado del proyecto

En desarrollo activo. Módulos completos: autenticación, gestión de cursos y estudiantes, calendario académico, registro de asistencia. Próximo bloque: gestión de calificaciones.
