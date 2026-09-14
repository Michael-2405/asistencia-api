# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Backend API for "Cuaderno Digital", an attendance and (future) grading system for teachers at Dominican schools. Multi-tenant: each teacher only sees their own courses and students. Node.js + TypeScript + Express 5, Drizzle ORM over PostgreSQL, Better Auth for authentication.

## Commands

```bash
npm run dev            # dev server with reload (tsx watch + pino-pretty)
npm run build           # tsc + tsc-alias (rewrites @/ import aliases for dist/)
npm run typecheck       # tsc --noEmit
npm run check           # biome check (lint + format, no writes)
npm run check:write     # biome check --write
npm run ci              # biome ci — what CI runs
npm run db:generate     # generate a Drizzle migration from schema changes
npm run db:migrate      # apply pending migrations
npm run db:studio       # Drizzle Studio
npm run seed            # seed catalogs/calendar (optionally a test course: `-- <teacherUserId>`)
```

There is no test suite yet (see Known gaps below) — do not assume `npm test` exists.

Local setup: `docker compose up -d` for Postgres, then `db:migrate` and `seed`. Env vars are validated at startup via Zod (`src/shared/config/env.ts`) — see `.env.example` for the required keys (`DATABASE_URL`, `PORT`, `NODE_ENV`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `CORS_ORIGIN`).

## Architecture

Hexagonal / DDD-lite, organized by **bounded context**, each with its own PostgreSQL schema:

```
src/contexts/
  identity/    # teacher profile (auth itself lives in Better Auth, schema "auth")
  academic/    # subjects, school year, official calendar, courses, students
  attendance/  # daily attendance records
src/shared/    # config, db client, logger, http response envelope, errors, middleware
```

Each context follows the same internal layout: `domain/` (Zod schemas — validation rules and inferred types), `application/` (use cases — one function per operation, this is where business logic and Drizzle queries currently live), `infrastructure/` (Drizzle table schema, Express routes, external adapters like Better Auth config).

**Current request flow**: `route → use case → Drizzle`. Routes call use-case functions directly; there is no separate Controller or Repository layer yet in most modules — use cases both hold business rules and issue queries. `REFACTOR.md` documents a **planned** introduction of explicit Controller/Repository layers (this is what branch `refactor/layered-architecture` is for) — treat it as a design doc for where the code is heading, not as a description of the current code. Don't assume those layers exist when reading or writing routes/use-cases today.

### Conventions to follow when adding an endpoint

1. Zod schema in `<context>/domain/<action>.schema.ts`, export both the schema and its inferred `z.infer` type.
2. Use case in `<context>/application/<action>.use-case.ts`: plain async function `(userId, ...args) => result`, throws `AppError` subclasses (`src/shared/errors/app-error.ts`) for domain failures — never returns HTTP status codes or shapes responses itself.
3. Route in `<context>/infrastructure/routes/<context>.routes.ts`: mount `requireAuth` + `checkNotSuspended` on the router (`router.use(...)`), use `validate(schema)` middleware for `POST`/`PATCH` bodies, call the use case, respond with `respondSuccess(res, data, { statusCode })` from `src/shared/http/respond.ts`.
4. Mount the context's router in `src/server.ts` **with an explicit path prefix** — see gotcha #1 below.
5. Ownership checks for course/student-scoped operations go through `assertCourseOwnership` (`academic/utils/`) — every context's data is scoped to `req.userId`; there is no cross-tenant visibility anywhere.

Response envelope is `{ status: "success", data, message?, meta? }` or `{ status: "error", error: { code, message, details? } }` (`src/shared/http/api-response.ts`). Error codes map 1:1 to `AppError` subclasses (`ValidationError`→400, `UnauthorizedError`→401, `ForbiddenError`/`AccountSuspendedError`→403, `NotFoundError`→404, `ConflictError`→409); unhandled exceptions become a generic 500 in `errorHandlerMiddleware`.

## Known gotchas (hard-won, not obvious from reading the code once)

1. **A router mounted with `app.use(router)` with no path prefix, that itself calls `router.use(requireAuth)` with no path, intercepts traffic for the *entire app*, not just its own routes** — Express runs the inner middleware before checking whether the path matches any route defined in that router. Always mount context routers with an explicit prefix (`app.use("/teachers", meRouter)`), with the router's internal paths adjusted accordingly (`/me`, not `/teachers/me`).
2. **Never rewrite `server.ts` (or any file that accumulates mounted routers over time) wholesale.** A full rewrite previously dropped `attendanceRouter` silently — no error, just 404s on every attendance route, hard to diagnose because nothing looked broken in the code that was visible. Make surgical, line-level diffs to `server.ts` instead.
3. `src/contexts/identity/infrastructure/auth/auth.config.ts` uses **relative imports**, not the `@/` alias — this was deliberate/required for Better Auth's tooling there; don't "clean it up" to match the rest of the codebase.
4. Express 5 wildcard routes use `*splat` (not bare `*`) — see the Better Auth catch-all mount in `server.ts`.
5. Better Auth methods/config differ from older docs/examples you may recall — check `auth.config.ts` and actual installed version behavior rather than assuming.
6. Postgres date columns come back as JS `Date`-adjacent strings depending on the query path — `save-daily-attendance.use-case.ts`'s `todayIso()` pattern (`new Date().toISOString().split("T")[0]`) is the established way to get a comparable `YYYY-MM-DD`.
7. `db.execute(...)` (raw SQL via Drizzle) returns `{ rows }`, not the rows array directly.
8. `baseUrl` in Better Auth config is deprecated in favor of `baseURL` (case matters).
9. Route registration order in `server.ts` matters — the Better Auth catch-all, JSON body parsing, and each router's mount point all have to stay in the order they're in.
10. Password verification in `suspend-account.use-case.ts` is done as a workaround via `signInEmail` as a proxy (Better Auth has no direct "verify password" API) — reactivation currently does *not* re-verify password (see Known gaps).

## Known gaps / accepted debt (don't "fix" silently — flag it)

See `TECH_DEBT.md` for the full list; the load-bearing ones:

- No automated tests, no Postgres in CI, no observability (Sentry etc.) yet — all deferred until after the layered-architecture refactor lands.
- No scheduled job for the documented "delete account 30 days after suspension" policy — it's not implemented anywhere.
- `POST /school-years` has no role check; subject-vs-level validation is client-only; account reactivation doesn't require password confirmation.
- `updateCourse`/`updateStudent` are full-replace, not partial patches, despite being `PATCH` routes.
- Resend is in sandbox mode; `CORS_ORIGIN`/`trustedOrigins` support a single origin only.

`CONTEXT.md` and `TECH_DEBT.md` are kept up to date by the maintainer as living handoff docs — read them for anything not covered here, and prefer them over guessing when in doubt about a business rule (e.g. attendance can only be recorded for *today*, exactly once — this was deliberately reconfirmed and rejected as changeable during a design pass, don't reintroduce backdating).
