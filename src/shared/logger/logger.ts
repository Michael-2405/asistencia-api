import pino from "pino";
import { env } from "@/shared/config/env.js";

export const logger = pino({
	level: env.NODE_ENV === "production" ? "info" : "debug",
});
