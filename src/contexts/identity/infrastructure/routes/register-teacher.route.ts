import type { Request, Response } from "express";
import { respondSuccess } from "@/shared/http/respond.js";
import { registerTeacher } from "../../application/register-teacher.use-case.js";
import type { RegisterTeacherInput } from "../../domain/register-teacher.schema.js";

export async function registerTeacherHandler(req: Request, res: Response) {
	const result = await registerTeacher(req.body as RegisterTeacherInput);
	respondSuccess(res, result, { statusCode: 201, message: "Docente registrado exitosamente" });
}
