import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ValidationError } from "../errors/app-error.js";

export function validate(schema: ZodSchema) {
	return (req: Request, _res: Response, next: NextFunction) => {
		const parsed = schema.safeParse(req.body);

		if (!parsed.success) {
			const details = parsed.error.issues.map((issue) => ({
				field: issue.path.join("."),
				message: issue.message,
			}));
			return next(new ValidationError("Datos de entrada inválidos", details));
		}

		req.body = parsed.data;
		next();
	};
}
