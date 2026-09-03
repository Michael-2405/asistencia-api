import type { Request, Response } from "express";
import { Router } from "express";
import { respondSuccess } from "@/shared/http/respond.js";
import { checkNotSuspended } from "@/shared/middleware/check-not-suspended.middleware.js";
import { requireAuth } from "@/shared/middleware/require-auth.middleware.js";
import { validate } from "@/shared/middleware/validate.middleware.js";
import { getMonthlyAttendance } from "../../application/get-monthly-attendance.use-case.js";
import { markCourseNonInstructionalDay } from "../../application/mark-course-non-instructional-day.use-case.js";
import { saveDailyAttendance } from "../../application/save-daily-attendance.use-case.js";
import { markCourseNonInstructionalDaySchema } from "../../domain/mark-course-non-instructional-day.schema.js";
import { saveDailyAttendanceSchema } from "../../domain/save-daily-attendance.schema.js";

export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);
attendanceRouter.use(checkNotSuspended);

attendanceRouter.get(
	"/courses/:courseId/attendance",
	async (req: Request<{ courseId: string }>, res: Response) => {
		const year = Number(req.query.year);
		const month = Number(req.query.month);
		const result = await getMonthlyAttendance(req.userId, req.params.courseId, year, month);
		respondSuccess(res, result);
	},
);

attendanceRouter.post(
	"/courses/:courseId/attendance/day",
	validate(saveDailyAttendanceSchema),
	async (req: Request<{ courseId: string }>, res: Response) => {
		const result = await saveDailyAttendance(req.userId, req.params.courseId, req.body);
		respondSuccess(res, result, { statusCode: 201 });
	},
);

attendanceRouter.post(
	"/courses/:courseId/non-instructional-days",
	validate(markCourseNonInstructionalDaySchema),
	async (req: Request<{ courseId: string }>, res: Response) => {
		const result = await markCourseNonInstructionalDay(req.userId, req.params.courseId, req.body);
		respondSuccess(res, result, { statusCode: 201 });
	},
);
