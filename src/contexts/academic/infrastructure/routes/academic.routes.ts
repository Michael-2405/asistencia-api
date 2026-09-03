import { desc } from "drizzle-orm";
import type { Request, Response } from "express";
import { Router } from "express";
import { db } from "../../../../shared/db/client.js";
import { respondSuccess } from "../../../../shared/http/respond.js";
import { requireAuth } from "../../../../shared/middleware/require-auth.middleware.js";
import { validate } from "../../../../shared/middleware/validate.middleware.js";
import { addStudentSchema } from "../../application/add-student.schema.js";
import { addStudent } from "../../application/add-student.use-case.js";
import { cloneCoursesSchema } from "../../application/clone-courses.schema.js";
import { cloneCourses } from "../../application/clone-courses.use-case.js";
import { createCourseSchema } from "../../application/create-course.schema.js";
import { createCourse } from "../../application/create-course.use-case.js";
import { createSchoolYearSchema } from "../../application/create-school-year.schema.js";
import { createSchoolYear } from "../../application/create-school-year.use-case.js";
import { listCourses } from "../../application/list-courses.use-case.js";
import { listStudents } from "../../application/list-students.use-case.js";
import { updateCourse } from "../../application/update-course.use-case.js";
import { updateStudent } from "../../application/update-student.use-case.js";
import { withdrawStudent } from "../../application/withdraw-student.use-case.js";
import { schoolYears, subjects } from "../db/schema.js";

export const academicRouter = Router();

academicRouter.get("/subjects", async (_req, res) => {
	const rows = await db.select().from(subjects);
	respondSuccess(res, rows);
});

academicRouter.get("/school-years", async (_req, res) => {
	const rows = await db.select().from(schoolYears).orderBy(desc(schoolYears.startDate));
	respondSuccess(res, rows);
});

academicRouter.use(requireAuth);

academicRouter.post("/school-years", validate(createSchoolYearSchema), async (req, res) => {
	const schoolYear = await createSchoolYear(req.body);
	respondSuccess(res, schoolYear, { statusCode: 201 });
});

academicRouter.post("/courses", validate(createCourseSchema), async (req, res) => {
	const course = await createCourse(req.userId, req.body);
	respondSuccess(res, course, { statusCode: 201 });
});

academicRouter.get("/courses", async (req, res) => {
	const schoolYearId =
		typeof req.query.schoolYearId === "string" ? req.query.schoolYearId : undefined;
	const rows = await listCourses(req.userId, schoolYearId);
	respondSuccess(res, rows);
});

academicRouter.patch(
	"/courses/:courseId",
	validate(createCourseSchema),
	async (req: Request<{ courseId: string }>, res: Response) => {
		const course = await updateCourse(req.userId, req.params.courseId, req.body);
		respondSuccess(res, course);
	},
);

academicRouter.post("/courses/clone", validate(cloneCoursesSchema), async (req, res) => {
	const result = await cloneCourses(req.userId, req.body);
	respondSuccess(res, result, { statusCode: 201 });
});

academicRouter.post(
	"/courses/:courseId/students",
	validate(addStudentSchema),
	async (req: Request<{ courseId: string }>, res: Response) => {
		const student = await addStudent(req.userId, req.params.courseId, req.body);
		respondSuccess(res, student, { statusCode: 201 });
	},
);

academicRouter.get(
	"/courses/:courseId/students",
	async (req: Request<{ courseId: string }>, res: Response) => {
		const rows = await listStudents(req.userId, req.params.courseId);
		respondSuccess(res, rows);
	},
);

academicRouter.patch(
	"/courses/:courseId/students/:studentId",
	validate(addStudentSchema),
	async (req: Request<{ courseId: string; studentId: string }>, res: Response) => {
		const student = await updateStudent(
			req.userId,
			req.params.courseId,
			req.params.studentId,
			req.body,
		);
		respondSuccess(res, student);
	},
);

academicRouter.patch(
	"/courses/:courseId/students/:studentId/withdraw",
	async (req: Request<{ courseId: string; studentId: string }>, res: Response) => {
		const student = await withdrawStudent(req.userId, req.params.courseId, req.params.studentId);
		respondSuccess(res, student);
	},
);
