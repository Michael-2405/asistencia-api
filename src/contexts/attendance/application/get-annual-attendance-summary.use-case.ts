import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import * as attendanceCalendarRepository from "../infrastructure/db/attendance-calendar.repository.js";

export async function getAnnualAttendanceSummary(userId: string, courseId: string) {
	const course = await assertCourseOwnership(courseId, userId);

	const schoolYear = await attendanceCalendarRepository.findSchoolYearDateRange(
		course.schoolYearId,
	);

	const rows = await attendanceCalendarRepository.findAnnualSummaryRows(
		courseId,
		schoolYear.start_date as string,
		schoolYear.end_date as string,
	);

	const byStudent = new Map<
		string,
		{
			studentId: string;
			rollNumber: number;
			fullName: string;
			active: boolean;
			months: { month: string; p: number; t: number; a: number; e: number }[];
		}
	>();

	for (const row of rows as Record<string, unknown>[]) {
		const id = row.student_id as string;
		if (!byStudent.has(id)) {
			byStudent.set(id, {
				studentId: id,
				rollNumber: row.order_number as number,
				fullName: `${row.first_lastname}${row.second_lastname ? ` ${row.second_lastname}` : ""}, ${row.first_name}`,
				active: row.active as boolean,
				months: [],
			});
		}
		byStudent.get(id)?.months.push({
			month: row.month as string,
			p: Number(row.p),
			t: Number(row.t),
			a: Number(row.a),
			e: Number(row.e),
		});
	}

	return [...byStudent.values()].map((s) => {
		const totals = s.months.reduce(
			(acc, m) => ({ p: acc.p + m.p, t: acc.t + m.t, a: acc.a + m.a, e: acc.e + m.e }),
			{ p: 0, t: 0, a: 0, e: 0 },
		);
		const totalDays = totals.p + totals.t + totals.a + totals.e;
		return {
			...s,
			totals,
			totalDays,
			attendancePct: totalDays > 0 ? Math.round(((totals.p + totals.t) / totalDays) * 100) : 100,
			absencePct: totalDays > 0 ? Math.round((totals.a / totalDays) * 100) : 0,
		};
	});
}
