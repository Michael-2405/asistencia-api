import type { Request, Response } from "express";
import { respondSuccess } from "@/shared/http/respond.js";
import { addStudent as addStudentService } from "../../application/add-student.use-case.js";
import { listStudents as listStudentsService } from "../../application/list-students.use-case.js";
import { updateStudent as updateStudentService } from "../../application/update-student.use-case.js";
import { withdrawStudent as withdrawStudentService } from "../../application/withdraw-student.use-case.js";

export async function addStudent(req: Request<{ courseId: string }>, res: Response) {
	const student = await addStudentService(req.userId, req.params.courseId, req.body);
	respondSuccess(res, student, { statusCode: 201 });
}

export async function listStudents(req: Request<{ courseId: string }>, res: Response) {
	const rows = await listStudentsService(req.userId, req.params.courseId);
	respondSuccess(res, rows);
}

export async function updateStudent(
	req: Request<{ courseId: string; studentId: string }>,
	res: Response,
) {
	const student = await updateStudentService(
		req.userId,
		req.params.courseId,
		req.params.studentId,
		req.body,
	);
	respondSuccess(res, student);
}

export async function withdrawStudent(
	req: Request<{ courseId: string; studentId: string }>,
	res: Response,
) {
	const student = await withdrawStudentService(
		req.userId,
		req.params.courseId,
		req.params.studentId,
	);
	respondSuccess(res, student);
}
