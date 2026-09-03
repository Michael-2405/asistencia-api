import { sql } from "drizzle-orm";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { db } from "@/shared/db/client.js";

export async function getMonthlyAttendance(
	userId: string,
	courseId: string,
	year: number,
	month: number,
) {
	const course = await assertCourseOwnership(courseId, userId);
	const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;

	const [calendarResult, rowsResult] = await Promise.all([
		db.execute(sql`
			SELECT gs::date::text AS date,
				(o.date IS NOT NULL OR c.date IS NOT NULL) AS non_instructional
			FROM generate_series(${monthStart}::date, (${monthStart}::date + interval '1 month' - interval '1 day'), interval '1 day') AS gs
			LEFT JOIN academic.official_non_instructional_days o
				ON o.date = gs::date AND o.school_year_id = ${course.schoolYearId}
			LEFT JOIN academic.course_non_instructional_days c
				ON c.date = gs::date AND c.course_id = ${courseId}
			WHERE EXTRACT(ISODOW FROM gs) < 6
			ORDER BY date
		`),
		db.execute(sql`
			SELECT
				s.id AS student_id,
				s.order_number,
				s.first_name,
				s.second_name,
				s.first_lastname,
				s.second_lastname,
				s.active,
				s.withdrawal_date::text AS withdrawal_date,
				COALESCE(
					json_object_agg(a.date, a.status_code) FILTER (WHERE a.date IS NOT NULL),
					'{}'::json
				) AS status_by_date
			FROM academic.students s
			LEFT JOIN attendance.attendance_records a
				ON a.student_id = s.id
				AND a.course_id = ${courseId}
				AND a.event_type = 'REGULAR'
				AND a.date >= ${monthStart}::date
				AND a.date < (${monthStart}::date + interval '1 month')
			WHERE s.course_id = ${courseId}
			GROUP BY s.id, s.order_number, s.first_name, s.second_name, s.first_lastname, s.second_lastname, s.active, s.withdrawal_date
			ORDER BY s.order_number
		`),
	]);

	return {
		calendarDays: calendarResult.rows.map((r) => ({
			date: r.date as string,
			nonInstructional: r.non_instructional as boolean,
		})),
		rows: rowsResult.rows.map((r) => ({
			studentId: r.student_id as string,
			rollNumber: r.order_number as number,
			fullName: `${r.first_lastname}${r.second_lastname ? ` ${r.second_lastname}` : ""}, ${r.first_name}`,
			active: r.active as boolean,
			withdrawalDate: r.withdrawal_date as string | null,
			statusByDate: r.status_by_date as Record<string, string>,
		})),
	};
}
