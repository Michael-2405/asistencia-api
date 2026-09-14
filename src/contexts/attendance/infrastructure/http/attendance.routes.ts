import { Router } from "express";
import { checkNotSuspended } from "@/shared/middleware/check-not-suspended.middleware.js";
import { requireAuth } from "@/shared/middleware/require-auth.middleware.js";
import { validate } from "@/shared/middleware/validate.middleware.js";
import { markCourseNonInstructionalDaySchema } from "../../domain/mark-course-non-instructional-day.schema.js";
import { saveDailyAttendanceSchema } from "../../domain/save-daily-attendance.schema.js";
import * as attendanceController from "./attendance.controller.js";

export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);
attendanceRouter.use(checkNotSuspended);

attendanceRouter.get(
	"/courses/:courseId/attendance/annual-summary",
	attendanceController.getAnnualAttendanceSummary,
);

attendanceRouter.get("/courses/:courseId/attendance", attendanceController.getMonthlyAttendance);

attendanceRouter.get("/courses/attendance-status", attendanceController.getTodayAttendanceStatus);

attendanceRouter.post(
	"/courses/:courseId/attendance/day",
	validate(saveDailyAttendanceSchema),
	attendanceController.saveDailyAttendance,
);

attendanceRouter.post(
	"/courses/:courseId/non-instructional-days",
	validate(markCourseNonInstructionalDaySchema),
	attendanceController.markCourseNonInstructionalDay,
);
