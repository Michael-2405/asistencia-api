import type { Request, Response } from "express";
import { respondSuccess } from "@/shared/http/respond.js";
import { listSubjects as listSubjectsService } from "../../application/list-subjects.use-case.js";

export async function listSubjects(_req: Request, res: Response) {
	const rows = await listSubjectsService();
	respondSuccess(res, rows);
}
