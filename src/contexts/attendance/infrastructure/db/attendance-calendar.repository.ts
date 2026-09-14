import { sql } from "drizzle-orm";
import { db } from "@/shared/db/client.js";

export async function findCalendarDays(courseId: string, schoolYearId: string, monthStart: string) {
	const result = await db.execute(sql`
		SELECT gs::date::text AS date,
			(o.date IS NOT NULL OR c.date IS NOT NULL) AS non_instructional
		FROM generate_series(${monthStart}::date, (${monthStart}::date + interval '1 month' - interval '1 day'), interval '1 day') AS gs
		LEFT JOIN academic.official_non_instructional_days o
			ON o.date = gs::date AND o.school_year_id = ${schoolYearId}
		LEFT JOIN academic.course_non_instructional_days c
			ON c.date = gs::date AND c.course_id = ${courseId}
		WHERE EXTRACT(ISODOW FROM gs) < 6
		ORDER BY date
	`);
	return result.rows;
}

export async function findStudentMonthlyStatusRows(courseId: string, monthStart: string) {
	const result = await db.execute(sql`
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
	`);
	return result.rows;
}

export async function findSchoolYearDateRange(schoolYearId: string) {
	const [row] = (
		await db.execute(
			sql`SELECT start_date::text, end_date::text FROM academic.school_years WHERE id = ${schoolYearId}`,
		)
	).rows;
	return row;
}

export async function findAnnualSummaryRows(courseId: string, startDate: string, endDate: string) {
	const result = await db.execute(sql`
		WITH months AS (
			SELECT date_trunc('month', gs)::date AS month_start
			FROM generate_series(${startDate}::date, ${endDate}::date, interval '1 month') AS gs
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
	return result.rows;
}
