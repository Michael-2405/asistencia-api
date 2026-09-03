import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../../contexts/identity/infrastructure/auth/auth.config.js";
import { UnauthorizedError } from "../errors/app-error.js";

declare global {
	namespace Express {
		interface Request {
			userId: string;
		}
	}
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
	const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });

	if (!session) {
		return next(new UnauthorizedError("Debes iniciar sesion"));
	}

	req.userId = session.user.id;
	next();
}
