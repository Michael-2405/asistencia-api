import type { Request, Response } from "express";
import { respondSuccess } from "@/shared/http/respond.js";
import { getMyProfile as getMyProfileService } from "../../application/get-my-profile.use-case.js";
import { reactivateAccount as reactivateAccountService } from "../../application/reactivate-account.use-case.js";
import { registerTeacher as registerTeacherService } from "../../application/register-teacher.use-case.js";
import { suspendAccount as suspendAccountService } from "../../application/suspend-account.use-case.js";
import type { RegisterTeacherInput } from "../../domain/register-teacher.schema.js";

export async function registerTeacher(req: Request, res: Response) {
	const result = await registerTeacherService(req.body as RegisterTeacherInput);
	respondSuccess(res, result, { statusCode: 201, message: "Docente registrado exitosamente" });
}

export async function getMyProfile(req: Request, res: Response) {
	const profile = await getMyProfileService(req.userId);
	respondSuccess(res, profile);
}

export async function suspendAccount(req: Request, res: Response) {
	const result = await suspendAccountService(req.userId, req.body.password, req.headers);
	respondSuccess(res, result);
}

export async function reactivateAccount(req: Request, res: Response) {
	const result = await reactivateAccountService(req.userId, req.body.password, req.headers);
	respondSuccess(res, result);
}
