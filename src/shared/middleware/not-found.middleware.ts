import type { Request, Response } from "express";

export function notFoundMiddleware(req: Request, res: Response) {
	res
		.status(404)
		.json({ error: "NOT_FOUND", message: `Ruta no encontrada: ${req.method} ${req.path}` });
}
