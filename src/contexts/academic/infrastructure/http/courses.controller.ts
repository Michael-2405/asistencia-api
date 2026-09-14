import type { Request, Response } from "express";
import { respondSuccess } from "@/shared/http/respond.js";
import { cloneCourses as cloneCoursesService } from "../../application/clone-courses.use-case.js";
import { createCourse as createCourseService } from "../../application/create-course.use-case.js";
import { deleteCourse as deleteCourseService } from "../../application/delete-course.use-case.js";
import { listCourses as listCoursesService } from "../../application/list-courses.use-case.js";
import { updateCourse as updateCourseService } from "../../application/update-course.use-case.js";

export async function createCourse(req: Request, res: Response) {
	const course = await createCourseService(req.userId, req.body);
	respondSuccess(res, course, { statusCode: 201 });
}

export async function listCourses(req: Request, res: Response) {
	const schoolYearId =
		typeof req.query.schoolYearId === "string" ? req.query.schoolYearId : undefined;
	const rows = await listCoursesService(req.userId, schoolYearId);
	respondSuccess(res, rows);
}

export async function updateCourse(req: Request<{ courseId: string }>, res: Response) {
	const course = await updateCourseService(req.userId, req.params.courseId, req.body);
	respondSuccess(res, course);
}

export async function cloneCourses(req: Request, res: Response) {
	const result = await cloneCoursesService(req.userId, req.body);
	respondSuccess(res, result, { statusCode: 201 });
}

export async function deleteCourse(req: Request<{ courseId: string }>, res: Response) {
	const course = await deleteCourseService(req.userId, req.params.courseId);
	respondSuccess(res, course);
}
