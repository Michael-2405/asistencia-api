import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import type { ApiErrorResponse } from "../http/api-response.js";

export function errorHandlerMiddleware(
	err: unknown,
	req: Request,
	res: Response,
	_next: NextFunction,
) {
	if (err instanceof AppError) {
		req.log.warn({ err }, `Handled error: ${err.code}`);
		const body: ApiErrorResponse = {
			status: "error",
			error: {
				code: err.code,
				message: err.message,
				...(err.details ? { details: err.details } : {}),
			},
		};
		return res.status(err.statusCode).json(body);
	}

	req.log.error({ err }, "Unhandled error");
	const body: ApiErrorResponse = {
		status: "error",
		error: { code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado" },
	};
	res.status(500).json(body);
}
