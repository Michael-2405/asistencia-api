import type { Request, Response } from "express";
import { respondSuccess } from "@/shared/http/respond.js";
import { createSchoolYear as createSchoolYearService } from "../../application/create-school-year.use-case.js";
import { listSchoolYears as listSchoolYearsService } from "../../application/list-school-years.use-case.js";

export async function listSchoolYears(_req: Request, res: Response) {
	const rows = await listSchoolYearsService();
	respondSuccess(res, rows);
}

export async function createSchoolYear(req: Request, res: Response) {
	const schoolYear = await createSchoolYearService(req.body);
	respondSuccess(res, schoolYear, { statusCode: 201 });
}
