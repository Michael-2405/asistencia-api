import rateLimit from "express-rate-limit";

export const generalRateLimit = rateLimit({
	windowMs: 60 * 1000,
	limit: 100,
	standardHeaders: true,
	legacyHeaders: false,
});

export const registrationRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		status: "error",
		error: { code: "TOO_MANY_REQUESTS", message: "Demasiados intentos, intenta más tarde" },
	},
});
