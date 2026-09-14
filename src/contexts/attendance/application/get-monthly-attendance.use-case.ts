import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import * as attendanceCalendarRepository from "../infrastructure/db/attendance-calendar.repository.js";

export async function getMonthlyAttendance(
	userId: string,
	courseId: string,
	year: number,
	month: number,
) {
	const course = await assertCourseOwnership(courseId, userId);
	const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;

	const [calendarRows, studentRows] = await Promise.all([
		attendanceCalendarRepository.findCalendarDays(courseId, course.schoolYearId, monthStart),
		attendanceCalendarRepository.findStudentMonthlyStatusRows(courseId, monthStart),
	]);

	return {
		calendarDays: calendarRows.map((r) => ({
			date: r.date as string,
			nonInstructional: r.non_instructional as boolean,
		})),
		rows: studentRows.map((r) => ({
			studentId: r.student_id as string,
			rollNumber: r.order_number as number,
			fullName: `${r.first_lastname}${r.second_lastname ? ` ${r.second_lastname}` : ""}, ${r.first_name}`,
			active: r.active as boolean,
			withdrawalDate: r.withdrawal_date as string | null,
			statusByDate: r.status_by_date as Record<string, string>,
		})),
	};
}
