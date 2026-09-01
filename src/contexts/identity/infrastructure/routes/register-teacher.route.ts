import type { Request, Response } from "express";
import { registerTeacherSchema } from "../../application/register-teacher.schema.js";
import { registerTeacher } from "../../application/register-teacher.use-case.js";

export async function registerTeacherHandler(req: Request, res: Response) {
	const parsed = registerTeacherSchema.safeParse(req.body);

	if (!parsed.success) {
		return res.status(400).json({ error: parsed.error.flatten() });
	}

	try {
		const result = await registerTeacher(parsed.data);
		res.status(201).json(result);
	} catch (error) {
		req.log.error(error, "Failed to register teacher");
		res.status(500).json({ error: "No se pudo registrar el docente" });
	}
}
