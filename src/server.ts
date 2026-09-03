import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { registerTeacherSchema } from "@/contexts/identity/application/register-teacher.schema.js";
import { auth } from "@/contexts/identity/infrastructure/auth/auth.config.js";
import { meRouter } from "@/contexts/identity/infrastructure/routes/me.routes.js";
import { registerTeacherHandler } from "@/contexts/identity/infrastructure/routes/register-teacher.route.js";
import { env } from "@/shared/config/env.js";
import { logger } from "@/shared/logger/logger.js";
import { errorHandlerMiddleware } from "@/shared/middleware/error-handler.middleware.js";
import { notFoundMiddleware } from "@/shared/middleware/not-found.middleware.js";
import { validate } from "@/shared/middleware/validate.middleware.js";
import { academicRouter } from "./contexts/academic/infrastructure/routes/academic.routes.js";
import {
	generalRateLimit,
	registrationRateLimit,
} from "./shared/middleware/rate-limit.middleware.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(generalRateLimit);
app.use(pinoHttp({ logger, genReqId: () => crypto.randomUUID() }));

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.post(
	"/teachers/register",
	registrationRateLimit,
	validate(registerTeacherSchema),
	registerTeacherHandler,
);
app.use(meRouter);
app.use(academicRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

app.listen(env.PORT, () => {
	logger.info(`API listening on http://localhost:${env.PORT}`);
});
// app.get('/secciones/:seccionId/asistencia', async (req, res) => {
//   console.log('Request recibida:', req.params, req.query);

//   const { seccionId } = req.params;
//   const { anio, mes } = req.query as { anio?: string, mes?: string };

//   if (!anio || !mes) {
//     return res.status(400).json({ error: 'anio y mes son requeridos'});
//   }

//   const fechaInicio = `${anio}-${mes.padStart(2, '0')}-01`;

//   try {
//     const [diasResult, filasResult, seccionResult] = await Promise.all([
//       pool.query(
//   `SELECT gs::date::text AS fecha,
//           (d.fecha IS NOT NULL) AS no_laborable
//    FROM generate_series($1::date, ($1::date + interval '1 month' - interval '1 day'), interval '1 day') AS gs
//    LEFT JOIN dia_no_lectivo d
//      ON d.fecha = gs::date
//      AND d.anio_escolar_id = (
//        SELECT anio_escolar_id FROM seccion WHERE id = $2
//      )
//    WHERE EXTRACT(ISODOW FROM gs) < 6
//    ORDER BY fecha`,
//   [fechaInicio, seccionId],
// ),
//       pool.query(
//         `SELECT
//            m.numero_orden,
//            m.id AS matricula_id,
//            e.nombre,
//            e.apellido,
//            COALESCE(
//              json_object_agg(a.fecha, a.estado_codigo) FILTER (WHERE a.fecha IS NOT NULL),
//              '{}'::json
//            ) AS asistencias
//          FROM matricula m
//          JOIN estudiante e ON e.id = m.estudiante_id
//          LEFT JOIN asistencia a
//            ON a.matricula_id = m.id
//            AND a.fecha >= $1::date
//            AND a.fecha < ($1::date + interval '1 month')
//          WHERE m.seccion_id = $2
//          GROUP BY m.numero_orden, m.id, e.nombre, e.apellido
//          ORDER BY m.numero_orden`,
//          [fechaInicio, seccionId]
//       ),
//       pool.query(`SELECT grado, nombre FROM seccion WHERE id = $1`, [seccionId]),
//     ]);

//     res.json({
//   dias: diasResult.rows.map((r) => ({ fecha: r.fecha, noLaborable: r.no_laborable })),
//   filas: filasResult.rows,
//   seccion: seccionResult.rows[0] ?? null,
// });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error : 'Error consultando asistencia' });
//   }
// });

// app.get("/secciones/:seccionId/asistencia/dia", async (req, res) => {
//   const { seccionId } = req.params;
//   const { fecha } = req.query as { fecha?: string };
//   if (!fecha) return res.status(400).json({ error: "fecha es requerida" });

//   const result = await pool.query(
//     `SELECT m.numero_orden, m.id AS matricula_id, e.nombre, e.apellido, a.estado_codigo
//      FROM matricula m
//      JOIN estudiante e ON e.id = m.estudiante_id
//      LEFT JOIN asistencia a ON a.matricula_id = m.id AND a.fecha = $2::date
//      WHERE m.seccion_id = $1
//      ORDER BY m.numero_orden`,
//     [seccionId, fecha],
//   );

//   res.json(result.rows);
// });

// app.get("/anios-escolares/:schoolYearId/secciones", async (req, res) => {
//   const { schoolYearId } = req.params;

//   const result = await pool.query(
//     `SELECT id, grado, nombre FROM seccion WHERE anio_escolar_id = $1 ORDER BY grado, nombre`,
//     [schoolYearId],
//   );

//   res.json(result.rows);
// });

// app.get("/anios-escolares/:schoolYearId", async (req, res) => {
//   const { schoolYearId } = req.params;

//   const result = await pool.query(
//     `SELECT id, nombre, fecha_inicio::text, fecha_fin::text
//      FROM anio_escolar WHERE id = $1`,
//     [schoolYearId],
//   );

//   if (result.rows.length === 0) {
//     return res.status(404).json({ error: "Año escolar no encontrado" });
//   }

//   res.json(result.rows[0]);
// });

// app.post("/secciones/:seccionId/asistencia/dia", async (req, res) => {
//   const { seccionId } = req.params;
//   const { fecha, registros } = req.body as {
//     fecha: string;
//     registros: { matriculaId: string; estado: string }[];
//   };

//   if (!fecha || !Array.isArray(registros) || registros.length === 0) {
//     return res.status(400).json({ error: "fecha y registros son requeridos" });
//   }

//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");

//     const existing = await client.query(
//       `SELECT 1
//        FROM asistencia a
//        JOIN matricula m ON m.id = a.matricula_id
//        WHERE m.seccion_id = $1 AND a.fecha = $2::date
//        LIMIT 1`,
//       [seccionId, fecha],
//     );

//     if ((existing.rowCount ?? 0) > 0) {
//       await client.query("ROLLBACK");
//       return res.status(409).json({ error: "La asistencia de este día ya fue registrada" });
//     }

//     for (const { matriculaId, estado } of registros) {
//       await client.query(
//         `INSERT INTO asistencia (matricula_id, fecha, estado_codigo)
//          VALUES ($1, $2::date, $3)`,
//         [matriculaId, fecha, estado],
//       );
//     }

//     await client.query("COMMIT");
//     res.json({ ok: true, guardados: registros.length });
//   } catch (err) {
//     await client.query("ROLLBACK");

//     // Unique violation: dos envíos simultáneos ganaron la carrera entre el chequeo y el insert.
//     if (err && typeof err === "object" && "code" in err && err.code === "23505") {
//       return res.status(409).json({ error: "La asistencia de este día ya fue registrada" });
//     }

//     console.error(err);
//     res.status(500).json({ error: "Error guardando asistencia" });
//   } finally {
//     client.release();
//   }
// });

// app.post("/anios-escolares/:schoolYearId/dias-no-lectivos", async (req, res) => {
//   const { schoolYearId } = req.params;
//   const { fecha, motivo } = req.body as { fecha?: string; motivo?: string };

//   if (!fecha) {
//     return res.status(400).json({ error: "fecha es requerida" });
//   }

//   try {
//     await pool.query(
//       `INSERT INTO dia_no_lectivo (anio_escolar_id, fecha, motivo)
//        VALUES ($1, $2::date, $3)`,
//       [schoolYearId, fecha, motivo ?? null],
//     );

//     res.json({ ok: true });
//   } catch (err) {
//     if (err && typeof err === "object" && "code" in err && err.code === "23505") {
//       return res.status(409).json({ error: "Ese día ya está marcado como no laborable" });
//     }

//     console.error(err);
//     res.status(500).json({ error: "Error marcando el día no laborable" });
//   }
// });

// app.listen(3000, () => console.log('API en http://localhost:3000'))
