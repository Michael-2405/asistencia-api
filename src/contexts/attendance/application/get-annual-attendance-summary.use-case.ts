import { sql } from "drizzle-orm";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { db } from "@/shared/db/client.js";

export async function getAnnualAttendanceSummary(userId: string, courseId: string) {
	const course = await assertCourseOwnership(courseId, userId);

	const [schoolYear] = (
		await db.execute(
			sql`SELECT start_date::text, end_date::text FROM academic.school_years WHERE id = ${course.schoolYearId}`,
		)
	).rows;

	const result = await db.execute(sql`
		WITH months AS (
			SELECT date_trunc('month', gs)::date AS month_start
			FROM generate_series(${schoolYear.start_date}::date, ${schoolYear.end_date}::date, interval '1 month') AS gs
		),
		roster AS (
			SELECT id, order_number, first_name, second_name, first_lastname, second_lastname, active
			FROM academic.students WHERE course_id = ${courseId}
		)
		SELECT
			r.id AS student_id, r.order_number, r.first_name, r.second_name, r.first_lastname, r.second_lastname, r.active,
			m.month_start::text AS month,
			COUNT(*) FILTER (WHERE a.status_code = 'P') AS p,
			COUNT(*) FILTER (WHERE a.status_code = 'T') AS t,
			COUNT(*) FILTER (WHERE a.status_code = 'A') AS a,
			COUNT(*) FILTER (WHERE a.status_code = 'E') AS e
		FROM roster r
		CROSS JOIN months m
		LEFT JOIN attendance.attendance_records a
			ON a.student_id = r.id AND a.course_id = ${courseId} AND a.event_type = 'REGULAR'
			AND date_trunc('month', a.date) = m.month_start
		GROUP BY r.id, r.order_number, r.first_name, r.second_name, r.first_lastname, r.second_lastname, r.active, m.month_start
		ORDER BY r.order_number, m.month_start
	`);

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

	for (const row of result.rows as Record<string, unknown>[]) {
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
