import type { Request, Response } from "express";
import { respondSuccess } from "@/shared/http/respond.js";
import { getAnnualAttendanceSummary as getAnnualAttendanceSummaryService } from "../../application/get-annual-attendance-summary.use-case.js";
import { getMonthlyAttendance as getMonthlyAttendanceService } from "../../application/get-monthly-attendance.use-case.js";
import { getTodayAttendanceStatus as getTodayAttendanceStatusService } from "../../application/get-today-attendance-status.use-case.js";
import { markCourseNonInstructionalDay as markCourseNonInstructionalDayService } from "../../application/mark-course-non-instructional-day.use-case.js";
import { saveDailyAttendance as saveDailyAttendanceService } from "../../application/save-daily-attendance.use-case.js";

export async function getAnnualAttendanceSummary(
	req: Request<{ courseId: string }>,
	res: Response,
) {
	const result = await getAnnualAttendanceSummaryService(req.userId, req.params.courseId);
	respondSuccess(res, result);
}

export async function getMonthlyAttendance(req: Request<{ courseId: string }>, res: Response) {
	const year = Number(req.query.year);
	const month = Number(req.query.month);
	const result = await getMonthlyAttendanceService(req.userId, req.params.courseId, year, month);
	respondSuccess(res, result);
}

export async function getTodayAttendanceStatus(req: Request, res: Response) {
	const result = await getTodayAttendanceStatusService(req.userId);
	respondSuccess(res, result);
}

export async function saveDailyAttendance(req: Request<{ courseId: string }>, res: Response) {
	const result = await saveDailyAttendanceService(req.userId, req.params.courseId, req.body);
	respondSuccess(res, result, { statusCode: 201 });
}

export async function markCourseNonInstructionalDay(
	req: Request<{ courseId: string }>,
	res: Response,
) {
	const result = await markCourseNonInstructionalDayService(
		req.userId,
		req.params.courseId,
		req.body,
	);
	respondSuccess(res, result, { statusCode: 201 });
}
