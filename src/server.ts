import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { attendanceRouter } from "@/contexts/attendance/infrastructure/routes/attendance.routes.js";
import { registerTeacherSchema } from "@/contexts/identity/domain/register-teacher.schema.js";
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
app.use("/teachers", meRouter);
app.use(academicRouter);
app.use(attendanceRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

app.listen(env.PORT, () => {
	logger.info(`API listening on http://localhost:${env.PORT}`);
});
