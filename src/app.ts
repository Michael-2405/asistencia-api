import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { attendanceRouter } from "@/contexts/attendance/infrastructure/http/attendance.routes.js";
import { auth } from "@/contexts/identity/infrastructure/auth/auth.config.js";
import { teacherRouter } from "@/contexts/identity/infrastructure/http/teacher.routes.js";
import { env } from "@/shared/config/env.js";
import { logger } from "@/shared/logger/logger.js";
import { errorHandlerMiddleware } from "@/shared/middleware/error-handler.middleware.js";
import { notFoundMiddleware } from "@/shared/middleware/not-found.middleware.js";
import { academicRouter } from "./contexts/academic/infrastructure/http/academic.routes.js";
import { generalRateLimit } from "./shared/middleware/rate-limit.middleware.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(generalRateLimit);
app.use(pinoHttp({ logger, genReqId: () => crypto.randomUUID() }));

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.use("/teachers", teacherRouter);
app.use(academicRouter);
app.use(attendanceRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
