# Documento de investigación y diseño

## Refactor integral de Cuaderno Digital

### Arquitectura, despliegue, correos, observabilidad y estructura del código

**Tipo de documento:** Investigación técnica y propuesta de refactor

**Proyecto:** Cuaderno Digital

**Stack actual:** React (cliente) · Node.js / Express / TypeScript (API) · PostgreSQL · Better Auth · Drizzle ORM (query builder + SQL crudo parametrizado)

**Objetivo general:** Definir un refactor coherente que unifique despliegue, dominio, correos, versionado, estructura de código y observabilidad, con justificación de cada decisión, beneficios, ventajas y desventajas.

> **Nota de revisión (10 de septiembre, 2026):** este documento fue revisado contra el estado real del proyecto antes de iniciar el refactor. Tres ajustes respecto a la versión original:
> 1. **Drizzle se mantiene como ORM principal** (query builder + SQL crudo vía su propio `sql` tag para consultas complejas) — no se migra a `pg` directo con SQL manual en repositorios. Ambos accesos (builder y crudo) ya conviven hoy sin problema, parametrizados por igual.
> 2. **El envelope de respuesta mantiene `status: "success" | "error"`** (ya implementado y consumido en todo el frontend) en vez de renombrar a `success: boolean` — se agrega `requestId` opcional, sin romper el contrato existente.
> 3. **Se agregan explícitamente las capas Controller y Repository** al esqueleto de módulo (routes hoy mezclan definición de endpoint con lógica que debería vivir en el servicio/repositorio). Las interfaces/puertos formales de dominio se difieren hasta la fase de testing (posterior a completar el refactor), donde el repositorio se mockea como módulo simple, sin necesidad de contenedor de DI.

## 1. Contexto y objetivo del refactor

### 1.1 Situación de partida

La aplicación es un producto full-stack en evolución:

- Cliente web en React que consume una API.
- API en Node.js + Express + TypeScript.
- Persistencia en PostgreSQL vía Drizzle ORM (query builder para la mayoría de operaciones, SQL crudo parametrizado para agregaciones/calendario donde el builder no expresa bien la consulta).
- Autenticación delegada a Better Auth.
- Necesidad de enviar correos transaccionales (verificación, reset de contraseña, etc.).
- Intención de desplegar versiones incompletas en entorno real y evolucionar con control.

El código actual ya tiene una organización por bounded context (routes → casos de uso → Drizzle), pero **las rutas HTTP en algunos módulos llaman directo a Drizzle sin pasar por un caso de uso**, mezclando la responsabilidad de "definir el endpoint" con "ejecutar lógica de negocio y consultar la base de datos". El refactor busca separar esto en capas de responsabilidad única.

### 1.2 Objetivo del refactor

Realizar un **refactor integral y progresivo** que:

1. Separe claramente responsabilidades (cliente, API, base de datos, correos) — y, dentro de la API, separe **rutas, controladores, servicios (casos de uso) y repositorios** como capas de responsabilidad única.
2. Adopte una estructura de código mantenible (feature-based + hexagonal / Clean / DDD lite).
3. Estandarice dominio, subdominios y envío de correos (Resend + Better Auth).
4. Introduzca observabilidad mínima viable (Sentry, logs, health checks).
5. Defina estrategia de despliegue y versionado adecuada a un producto en construcción.
6. Documente ventajas, desventajas y relaciones entre cada decisión.

> No se trata de reescribir todo de golpe, sino de **establecer un marco** sobre el cual ir migrando módulos y despliegues.

**Sobre testing**: la escritura de tests unitarios, de integración y e2e se aborda **después** de completar este refactor de estructura — no en paralelo. La separación en Repository/Servicio que se introduce aquí es justamente lo que hace esa fase viable sin una segunda reescritura: se mockea el repositorio como módulo (sin interfaces formales ni contenedor de DI) para probar el servicio en aislamiento, y se mockea el servicio para probar el controlador.

### 1.3 Beneficios esperados del conjunto

| Beneficio | Descripción |
|---|---|
| **Mantenibilidad** | Cambios por feature sin tocar capas ajenas |
| **Operabilidad** | Saber si el sistema está sano y dónde falla |
| **Entregabilidad** | Despliegues predecibles y reversibles |
| **Profesionalismo del producto** | Correos, dominio y errores tratados como parte del producto |
| **Escalabilidad técnica** | Base para crecer sin rehacer la arquitectura |
| **Testabilidad futura** | Repositorio aislado del servicio permite mockear sin tocar la base de datos real |

## 2. Despliegue: capas, plataformas y estrategias

### 2.1 Separación de capas

Se recomienda desplegar por capas:

| Capa | Tecnología | Ubicación típica |
|---|---|---|
| **Frontend** | React (build estático) | Vercel / Cloudflare Pages / Netlify |
| **API** | Node.js + Express | Railway / Render / Fly.io |
| **Base de datos** | PostgreSQL managed | Neon / Postgres de Railway o Render / Supabase |

**Ventajas:** independencia de escala y de ciclo de vida; fallos aislados.

**Desventajas:** más piezas que configurar (CORS, DNS, variables de entorno); algo más de latencia entre servicios si no se colocan bien.

**Relación con el resto:** la separación de capas justifica subdominios (`app.`, `api.`), health checks por servicio y Sentry en frontend y backend por separado.

### 2.2 Plataformas recomendadas (resumen)

- **Frontend:** Vercel o Cloudflare Pages (DX, CDN, SSL, previews).
- **API:** Railway o Render (Node de larga duración + Postgres cercano).
- **DB:** Neon (serverless, branching) o PostgreSQL del mismo PaaS de la API.

**Ventajas:** poco ops, SSL y deploys desde Git.

**Desventajas:** vendor lock-in relativo; free tiers con límites (sueño de instancias, cuotas).

### 2.3 Estrategias de despliegue

| Estrategia | Idea | Ventajas | Desventajas | Cuándo |
|---|---|---|---|---|
| **Recreate** | Apagar viejo, levantar nuevo | Simple | Downtime | Solo dev / internos |
| **Rolling** | Actualizar instancias de forma gradual | Bajo costo, sin downtime | Rollback más lento | Default razonable |
| **Blue-green** | Dos entornos; cambio de tráfico de golpe | Rollback instantáneo | Costo ~2× durante el corte | Releases críticos |
| **Canary** | % pequeño de tráfico a la nueva versión | Bajo riesgo, validación real | Más complejidad | Cambios de alto riesgo |
| **Feature flags** | Código desplegado; features activables | Desacopla deploy y release | Disciplina de limpieza de flags | Features incompletas |

**Recomendación para el refactor:** empezar con **rolling + feature flags**; reservar blue-green/canary cuando haya usuarios reales y releases sensibles.

**Relación:** el versionado SemVer (`0.x` mientras el producto no esté estable) y los health checks (`/ready`) son requisitos para que rolling/blue-green/canary sean seguros.

## 3. Dominio y DNS

### 3.1 Un dominio, varios subdominios

Se compra **un solo dominio** (p. ej. `cuadernodigital.com`). Los subdominios no se pagan: se crean con registros DNS.

| Uso | Ejemplo |
|---|---|
| **Landing** | `cuadernodigital.com` / `www` |
| **App** | `app.cuadernodigital.com` |
| **API** | `api.cuadernodigital.com` |
| **Correos** | `mail.cuadernodigital.com` |
| **Staging** | `staging.cuadernodigital.com` |

**Ventajas:** marca unificada, SSL simple, CORS y cookies más controlables, reputación de correo aislada en `mail.`.

**Desventajas:** hay que gestionar DNS con cuidado; un error de DNS afecta a toda la marca.

**Registrador recomendado:** Cloudflare Registrar (precio al costo, DNS de calidad). Alternativas: Namecheap, Porkbun.

**Relación:** el subdominio `mail.` es la base de Resend (SPF/DKIM/DMARC); `app.` y `api.` se alinean con el despliegue por capas y con `tracePropagationTargets` de Sentry en el frontend.

## 4. Correos transaccionales

### 4.1 Principio

Todo envío de correo ocurre en el **backend**. El frontend solo dispara acciones (registro, "olvidé mi contraseña"). Con **Better Auth**, la librería genera tokens y URLs; la aplicación implementa el envío vía **Resend**.

### 4.2 Correos mínimos

| Correo | Responsable |
|---|---|
| **Verificación de email** | Better Auth → `sendVerificationEmail` |
| **Reset de contraseña** | Better Auth → `sendResetPassword` |
| **Bienvenida** | App (hook / servicio) |
| **Confirmación de cambio de contraseña** | App |
| **Suspensión / reactivación** | App (lógica de negocio) |
| **Nuevo login (opcional)** | App |

### 4.3 Resend + subdominio + React Email

- Verificar `mail.cuadernodigital.com` en Resend.
- Configurar SPF, DKIM y DMARC.
- Plantillas con **React Email** (componentes tipados, preview local) — reemplaza los strings HTML inline usados hoy.

**Ventajas:** deliverability controlada; plantillas mantenibles; integración limpia con Better Auth.

**Desventajas:** dependencia de un ESP; hay que cuidar autenticación DNS y no mezclar marketing con transaccional en el mismo subdominio de reputación crítica.

**Relación:** los correos viven en `infrastructure/email/`; Better Auth en `infrastructure/auth/`; no contaminan el dominio de negocio (cursos, estudiantes, asistencia).

---

## 5. Versionado

### 5.1 Semantic Versioning

Formato: **MAJOR.MINOR.PATCH**.

- Mientras el producto no esté listo para usuarios finales estables: **`0.x.y`**.
- Primera versión "estable" de producto: **`1.0.0`**.

**Ventajas:** comunica el grado de estabilidad; encaja con releases de Sentry y tags de Git.

**Desventajas:** en `0.x` se acepta más rotura; hay que ser disciplinado al pasar a `1.0.0`.

**Relación:** la misma `APP_VERSION` / release se usa en Sentry y en metadatos de deploy; facilita correlacionar errores con versiones desplegadas.

## 6. Estructura del código de la API

### 6.1 Enfoque híbrido

Combinación consciente de:

- **Feature-based / Vertical slicing:** organización por capacidad (`courses`, `students`, `attendance`, …).
- **Hexagonal (ports & adapters) — versión pragmática:** el repositorio actúa como adaptador hacia Drizzle; el servicio no conoce Drizzle directamente. No se introducen interfaces formales de puerto hasta la fase de testing (ver 6.3).
- **Clean / DDD lite:** casos de uso (servicios) + entidades/tipos simples; sin aggregates pesados al inicio.

**Cuatro capas de responsabilidad única, de afuera hacia adentro:**

| Capa | Responsabilidad | Lo que NO hace |
|---|---|---|
| **Routes** | Tabla de endpoints: método + path + middleware + qué controlador invocar | No importa Drizzle, no valida, no arma la respuesta |
| **Controller** | Adaptador HTTP: lee `req`, llama al servicio, arma la respuesta con `respondSuccess` | No contiene reglas de negocio, no llama a Drizzle |
| **Servicio (caso de uso)** | Reglas de negocio, orquesta el repositorio, lanza errores de dominio | No conoce `req`/`res`, no arma SQL directamente |
| **Repository** | Única capa que importa `db`/Drizzle; consultas y mutaciones | No contiene reglas de negocio |

### 6.2 Esqueleto propuesto

```text
src/
├── instrument.ts              # Sentry (primero)
├── app.ts / server.ts
├── config/                    # env (Zod), db pool, logger (Pino)
├── shared/                    # errores, middleware, utils
├── infrastructure/
│   ├── auth/                  # Better Auth (configuración global, cross-context)
│   ├── email/                 # Resend + templates React Email
│   ├── database/              # cliente Drizzle
│   └── http/                  # /health, /ready
└── modules/                    # antes "contexts/" — mismo concepto, se mantiene el nombre actual del proyecto
    └── courses/
        ├── domain/            # tipos (sin puertos formales todavía, ver 6.3)
        ├── application/       # create-course.use-case.ts, list-courses.use-case.ts, … (servicios)
        ├── infrastructure/
        │   ├── db/
        │   │   ├── schema.ts
        │   │   └── course.repository.ts   # NUEVO — única capa que llama a Drizzle
        │   └── http/
        │       ├── course.controller.ts    # NUEVO — adaptador HTTP puro
        │       └── course.routes.ts         # solo tabla de rutas
        └── index.ts
```

**Flujo:**

```text
HTTP → routes (tabla) → controller (Zod ya validó vía middleware) → servicio (caso de uso) → repository → Drizzle → PostgreSQL
```

**Ventajas**: cambios localizados por feature; acceso a datos aislado en el repositorio; testabilidad de servicios (mockeando el repositorio) y de controladores (mockeando el servicio); independencia de Express/Resend/Better Auth en el núcleo de reglas de negocio.

**Desventajas**: más archivos por feature (routes + controller + servicio + repository, en vez de routes + servicio); disciplina de no saltarse capas (ej. no llamar al repositorio desde el controller); riesgo de sobre-ingeniería si se agregan interfaces de puerto antes de necesitarlas.

**Relación**: emails, auth y health checks quedan en `infrastructure/` global; no se mezclan con reglas de negocio de cursos/estudiantes/asistencia.

### 6.3 Persistencia

**Drizzle ORM se mantiene como interfaz principal de acceso a datos** — no se migra a `pg` directo. El query builder cubre la mayoría de operaciones (CRUD estándar); el SQL crudo parametrizado, vía el propio `sql` tag de Drizzle (`db.execute(sql\`...\`)`), se reserva para consultas que el builder no expresa bien: generación de series de fechas/meses, agregaciones condicionales (`COUNT(*) FILTER (WHERE...)`), `json_object_agg`. Ambos accesos viven **exclusivamente dentro del repositorio** de cada módulo — el servicio nunca importa `db` ni `sql` directamente.

**Sobre interfaces de repositorio formales (puertos)**: se difieren hasta la fase de testing posterior al refactor. Un repositorio como **módulo de funciones exportadas** (no una clase con interfaz) es suficiente para mockear en tests unitarios con Vitest/Jest (`vi.mock(".../course.repository")`), sin necesidad de un contenedor de inyección de dependencias. Introducir interfaces formales antes de escribir el primer test que las necesite sería ceremonia sin beneficio medible.

## 7. Contrato de respuestas de la API (éxito y error)

### 7.1 Objetivo dentro del refactor

Formalizar por escrito el envelope **ya existente y en uso** — no reemplazarlo. Hoy la API responde de forma consistente en la mayoría de endpoints; este apartado documenta esa convención para que se aplique sin excepciones a los endpoints nuevos que salgan del refactor (incluyendo los que hoy saltan lógica directo desde las rutas).

### 7.2 Principios

| Principio | Detalle |
|---|---|
| Un solo formato | Mismo envelope en todos los endpoints propios (no aplica a las rutas nativas de Better Auth) |
| HTTP semántico | 2xx éxito, 4xx cliente, 5xx servidor |
| Errores accionables | `code` + `message` (+ `details` si aplica) |
| Sin fugas | No exponer stacks ni SQL al cliente |
| Tipado | Tipos compartidos (`ApiSuccessResponse`, `ApiErrorResponse`) |

### 7.3 Respuesta de éxito

```json
{
  "status": "success",
  "data": {}
}
```

Con paginación:

```json
{
  "status": "success",
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 153,
    "totalPages": 8
  }
}
```

| Caso | HTTP | Notas |
|---|---|---|
| Lectura / acción OK | 200 | Body con `data` |
| Creación | 201 | Body con recurso creado |
| Sin cuerpo | Siempre JSON, con `data` (objeto vacío o resultado mínimo) — nunca 204 | Convención ya establecida, se mantiene |

### 7.4 Respuesta de error

```json
{
  "status": "error",
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "Curso no encontrado",
    "details": null,
    "requestId": "5a94b2f9-871b-4acd-91f6-53a70d247b5d"
  }
}
```

Validación (Zod):

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos de entrada inválidos",
    "details": [
      {
        "field": "grade",
        "message": "El grado es obligatorio"
      }
    ]
  }
}
```

`requestId` es **nuevo respecto a la implementación actual** — se agrega para correlacionar con Pino/Sentry, reutilizando el `req.id` que `pino-http` ya genera con `genReqId: () => crypto.randomUUID()`.

### 7.5 Códigos HTTP habituales

| HTTP | Uso                              | Ejemplo de `code`         |
|------|----------------------------------|---------------------------|
| 400  | Validación / request inválido    | `VALIDATION_ERROR`        |
| 401  | No autenticado                   | `UNAUTHORIZED`            |
| 403  | Sin permiso                      | `FORBIDDEN`               |
| 404  | No existe                        | `COURSE_NOT_FOUND`        |
| 409  | Conflicto                        | `CONFLICT`                |
| 429  | Rate limit                       | `RATE_LIMIT_EXCEEDED`     |
| 500  | Error inesperado                 | `INTERNAL_ERROR`          |
| 503  | No listo (p. ej. DB)             | `SERVICE_UNAVAILABLE`     |

### 7.6 Tipos TypeScript (ya implementados, formalizados aquí)

```typescript
interface ApiSuccessResponse<T> {
  status: "success";
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface ApiErrorResponse {
  status: "error";
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

### 7.7 Encaje en la arquitectura

| Capa                 | Rol                                                                 |
|----------------------|---------------------------------------------------------------------|
| Controller           | `respondSuccess(res, data, opciones)` con el envelope               |
| Servicio (caso de uso) | Errores de dominio (`NotFoundError`, `ConflictError`, etc.)        |
| AppError + error handler | Mapeo a `{ status: "error", error: { code, message, details, requestId } }` |
| Zod (middleware `validate`) | → 400 + `VALIDATION_ERROR`                                    |
| Sentry               | Solo errores no controlados / 5xx                                   |

### 7.8 Ventajas

- Cliente React predecible (ya implementado: `if (body.status === "error") throw new ApiError(...)`).
- Mensajes de UI desacoplados de excepciones internas.
- Logs y Sentry correlacionables con `requestId` y `code`.
- Documentación y pruebas más simples (contrato único, ya estable).

### 7.9 Desventajas

- Los endpoints que hoy llaman a Drizzle directo desde la ruta (ej. `/subjects`, `/school-years`) deben migrarse a pasar por controller + servicio + repository durante el refactor, para que el envelope se aplique de forma consistente en todos, no solo donde ya existía un caso de uso.
- Disciplina: no devolver 404/validación como 500 ni viceversa.

### 7.10 Relación con el resto del refactor

- **Estructura modular:** el error handler global en `shared/` unifica todos los módulos.
- **Observabilidad:** `code` + `requestId` enlazan respuesta, log y evento Sentry.
- **Better Auth:** 401/403 con códigos estables; el cliente no parsea mensajes genéricos.
- **Despliegue / versionado:** cambios breaking en el envelope se reflejan en SemVer (en 0.x más tolerante; en 1.x con cuidado) — no se prevén cambios breaking al envelope en este refactor, ya que se mantiene el formato existente.

## 8. Observabilidad y monitoreo

### 8.1 Tres pilares

| Pilar | Pregunta | Herramienta inicial |
|---|---|---|
| **Logs** | ¿Qué pasó? | Pino + Better Stack / Axiom |
| **Métricas / errores** | ¿Cómo está el sistema? | Sentry + paneles del PaaS/DB |
| **Traces (después)** | ¿Dónde se fue el tiempo? | Sentry Performance / OpenTelemetry |

### 8.2 Health checks

- `GET /health` — proceso vivo (liveness). **Ya existe.**
- `GET /ready` — puede servir tráfico, incluida conectividad a PostgreSQL (readiness). **Nuevo.**

**Ventajas:** orquestadores y monitores externos pueden actuar con criterio.

**Desventajas:** hay que implementarlos y no confundir "DB caída" con "bug de aplicación" en el mismo bucket de alertas.

### 8.3 Sentry

- **Backend:** `@sentry/node`, init en `instrument.ts` **antes** de cualquier otro módulo; `setupExpressErrorHandler` tras las rutas.
- **Frontend:** `@sentry/react`, integrado con el `ErrorBoundary` ya existente, opcional tracing/replay.

**Ventajas:** stack traces, releases, contexto de usuario, correlación frontend–API.

**Desventajas:** costo por volumen; hay que filtrar errores de negocio esperados (4xx de validación) para no ensuciar el tablero — los `AppError` con código de negocio (`ConflictError`, `ValidationError`, etc.) no deberían reportarse a Sentry, solo los errores no controlados que hoy caen en el bloque `catch` genérico del error handler.

**Relación:** versionado (`release`), subdominios (`tracePropagationTargets` hacia `api.`), estructura modular (tags `module`/`feature`), y despliegue (saber qué versión falló).

### 8.4 Estrategia por etapas

1. **Ahora:** Sentry + Pino + `/health` / `/ready` + uptime (Better Stack).
2. **Con tráfico:** performance de Sentry, alertas de error rate y latencia.
3. **Crecimiento:** OpenTelemetry, Grafana Cloud o SigNoz, SLOs.

## 9. Paquetes del backend en el refactor

### 9.1 Ya presentes (mantener)

- `better-auth`
- `cors`
- `helmet`
- `drizzle-orm` — ORM principal, query builder + SQL crudo vía `sql` tag
- `pg` — driver subyacente de Drizzle (node-postgres), no se usa directo fuera de Drizzle
- `express`
- `express-rate-limit`
- `pino`
- `pino-http`
- `resend`
- `zod`

### 9.2 Nuevos recomendados

| Paquete | Motivo |
|---|---|
| `@sentry/node` | Errores y (opcional) performance en API |
| `@react-email/components` | Plantillas de correo (reemplaza HTML inline actual) |
| `react` / `react-dom` | Runtime de React Email en el servidor |
| `react-email` (dev) | Preview local de plantillas |
| `@sentry/profiling-node` (opcional) | Profiling |

No se requieren contenedores de DI ni librerías CQRS: el repositorio como módulo de funciones + **composition root manual** basta, incluso pensando en la fase de testing posterior.

## 10. Cómo se relacionan las piezas (visión sistémica)

```text
Dominio DNS (app. / api. / mail.)
        │
        ├─► Frontend (Vercel) ── Sentry React ── consume API
        │
        ├─► API (Railway/Render)
        │      ├─ Better Auth ──► Resend (mail.)
        │      ├─ modules/* (routes → controller → servicio → repository)
        │      ├─ infrastructure (email, auth, db, health)
        │      ├─ Pino + Sentry Node
        │      └─ /health /ready
        │
        └─► PostgreSQL (Neon / managed)
               ▲
               └── solo vía repositorios (Drizzle: query builder + SQL crudo)
```

- El **refactor de código** hace posible aislar email, auth y DB — y, dentro de la API, aislar el acceso a datos del resto de capas vía el Repository.
- El **dominio** y el **despliegue** hacen operable ese código en producción.
- La **observabilidad** cierra el ciclo: detecta fallos en cliente, API o DB y los asocia a una versión (0.x → 1.0.0).
- Los **correos** son parte del producto de autenticación, no un detalle lateral.

## 11. Ventajas y desventajas globales del refactor

### 11.1 Ventajas

- Base clara para crecer por features sin reescritura masiva.
- Cada endpoint pasa por el mismo camino (routes → controller → servicio → repository), eliminando la inconsistencia actual donde algunas rutas llaman a Drizzle directo.
- Despliegues y rollbacks más controlados.
- Correos profesionales y alineados con Better Auth.
- Visibilidad de errores y salud del sistema desde el día uno del refactor.
- Base lista para la fase de testing posterior, sin necesitar una segunda reescritura.
- Decisiones documentadas (este documento) que reducen debate ad hoc.

### 11.2 Desventajas y riesgos

- Coste inicial de tiempo (estructura, DNS, Resend, Sentry, migrar rutas existentes a controller+repository).
- Más archivos por feature para quien entre al proyecto.
- Posible sobre-diseño si se agregan interfaces de puerto antes de la fase de testing.
- Dependencias de terceros (Resend, Sentry, PaaS) con cuotas y cambios de producto.

### 11.3 Mitigación

- Aplicar la estructura **módulo a módulo** (empezar por `academic`, que es donde hoy las rutas llaman a Drizzle directo).
- Mantener DDD **lite** (tipos + servicios + repository plano, sin interfaces formales todavía).
- Etapa 1 de observabilidad mínima; no adoptar Datadog/New Relic al inicio.
- Versionar en `0.x` hasta validar el producto en entorno real.

## 12. Hoja de ruta sugerida del refactor

1. ✅ Estructura: introducir Repository + Controller en `academic` primero (tiene el caso más claro de mezcla de responsabilidades), luego replicar en `identity` y `attendance`.
2. ✅ Dominio y DNS: comprar dominio, crear subdominios, apuntar a frontend/API.
3. 🔄 Resend: verificar `mail.`, DMARC; conectar Better Auth; migrar plantillas a React Email.
4. Health (`/ready`) + Sentry en API; Sentry en React.
5. Versionado `0.1.0` y release en Sentry.
6. Despliegue frontend + API + DB en las plataformas elegidas; staging opcional.
7. Iterar features y endurecer observabilidad según tráfico real.
8. **Fase de testing** (posterior a lo anterior): unitarios (servicios, mockeando repositorios), integración (repositorios contra Postgres real en Docker/Testcontainers), e2e (Supertest sobre la app completa).

## 13. Conclusión

El refactor propuesto no es una moda de arquitectura: es un **sistema de decisiones conectadas**. La estructura de código (con Repository y Controller como capas explícitas) permite aislar infraestructura y acceso a datos; el dominio y el despliegue la hacen operable; los correos y Better Auth cierran el ciclo de usuario; la observabilidad y el versionado permiten aprender de producción sin volar a ciegas; y la separación de capas deja el terreno preparado para la fase de testing que viene después, sin necesitar una reescritura adicional.

Las desventajas (complejidad inicial, disciplina, coste de herramientas) se compensan si el producto va a vivir y evolucionar. Para **Cuaderno Digital** como producto en construcción hacia entorno real, el equilibrio es razonable: **DDD lite + vertical slices + hexagonal práctico (routes/controller/servicio/repository)**, Drizzle como ORM principal, despliegue por capas, un dominio con subdominios, Resend + React Email, y Sentry + health checks como suelo de observabilidad — con tests como fase final, no paralela.

---

**Documento de investigación y diseño — Cuaderno Digital**

*Refactor integral: arquitectura, despliegue, correos, observabilidad y estructura*

*Revisado — Septiembre 2026*
