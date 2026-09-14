import rateLimit from "express-rate-limit";
import { env } from "@/shared/config/env.js";

const skipInTest = () => env.NODE_ENV === "test";

export const generalRateLimit = rateLimit({
	windowMs: 60 * 1000,
	limit: 100,
	standardHeaders: true,
	legacyHeaders: false,
	skip: skipInTest,
});

export const registrationRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 5,
	standardHeaders: true,
	legacyHeaders: false,
	skip: skipInTest,
	message: {
		status: "error",
		error: { code: "TOO_MANY_REQUESTS", message: "Demasiados intentos, intenta más tarde" },
	},
});
